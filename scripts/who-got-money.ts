// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';
const HACKATIME_BASE_URL = 'https://hackatime.hackclub.com/api/v1/users';
const START_DATE = '2025-06-24';
const END_DATE = '2025-07-16T23:59:59Z';
const MAX_TOKENS = 10;

import { db } from '../src/lib/server/db';
import { rawUsers, payouts, shopOrders } from '../src/lib/server/db';
import { eq, sql, and, inArray } from 'drizzle-orm';

interface AirtableRecord {
	id: string;
	fields: {
		'Slack ID'?: string;
		Email?: string;
		'Email Normalised'?: string;
		'Hackatime Project Name'?: string;
		[key: string]: any;
	};
}

interface HackatimeProject {
	name: string;
	total_seconds: number;
	[key: string]: any;
}

interface HackatimeResponse {
	data?: {
		projects?: HackatimeProject[];
		[key: string]: any;
	};
}

interface UserBalance {
	slackId: string;
	email: string;
	oldTokens: number;
	newTokens: number;
	spent: number;
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableRecord[] = [];
	let offset: string | null = null;

	do {
		const params = new URLSearchParams({
			filterByFormula: '{Converge Review} = "Approved"',
			...(offset && { offset })
		});

		const response = await fetch(`${url}?${params}`, { headers });
		const data = await response.json();

		if (data.records) {
			allRecords = allRecords.concat(data.records);
		}

		offset = data.offset;
	} while (offset);

	return allRecords;
}

async function fetchHackatimeStats(slackId: string): Promise<HackatimeResponse | null> {
	const url = `${HACKATIME_BASE_URL}/${slackId}/stats?features=projects&start_date=${START_DATE}&end_date=${END_DATE}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch Hackatime stats for ${slackId}: ${response.status}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error(`Error fetching Hackatime stats for ${slackId}:`, error);
		return null;
	}
}

function parseProjectNames(projectNamesString: string): string[] {
	if (!projectNamesString) return [];

	// Split by comma, handling potential ", " separators
	return projectNamesString
		.split(/,\s*/)
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

function calculateHoursFromProjects(
	hackatimeData: HackatimeResponse,
	targetProjectNames: string[]
): number {
	if (!hackatimeData?.data?.projects) return 0;

	const targetNamesLower = targetProjectNames.map((name) => name.toLowerCase());
	let totalSeconds = 0;

	for (const project of hackatimeData.data.projects) {
		const projectNameLower = project.name.toLowerCase();
		if (targetNamesLower.includes(projectNameLower)) {
			totalSeconds += project.total_seconds || 0;
			console.log(`  Matched project: ${project.name} - ${project.total_seconds} seconds`);
		}
	}

	return totalSeconds;
}

function convertSecondsToTokens(totalSeconds: number): number {
	const hours = totalSeconds / 3600;
	const wholeHours = Math.floor(hours);
	const remainingMinutes = (hours - wholeHours) * 60;

	// If 40 or more minutes, round up
	const tokens = remainingMinutes >= 40 ? wholeHours + 1 : wholeHours;

	// Cap at MAX_TOKENS
	return Math.min(tokens, MAX_TOKENS);
}

async function ensureUserExists(slackId: string): Promise<void> {
	// Check if user exists
	const existingUser = await db
		.select()
		.from(rawUsers)
		.where(eq(rawUsers.slackId, slackId))
		.limit(1);

	if (existingUser.length === 0) {
		// Create new user with default avatar
		const avatarUrl = `https://cachet.dunkirk.sh/users/${slackId}/r`;

		await db.insert(rawUsers).values({
			slackId,
			avatarUrl,
			isAdmin: false
		});

		console.log(`  Created new user: ${slackId}`);
	}
}

async function getCurrentBalances(userIds: string[]): Promise<Map<string, UserBalance>> {
	const balances = new Map<string, UserBalance>();

	if (userIds.length === 0) return balances;

	// Get current token balances for all users
	const userBalances = await db
		.select({
			slackId: rawUsers.slackId,
			totalPayouts: sql<number>`COALESCE(SUM(${payouts.tokens}), 0)`,
			totalSpent: sql<number>`
        COALESCE(
          (SELECT SUM("priceAtOrder") 
           FROM ${shopOrders} 
           WHERE "userId" = ${rawUsers.slackId} 
           AND status IN ('pending', 'fulfilled')
          ), 0
        )
      `
		})
		.from(rawUsers)
		.leftJoin(payouts, eq(payouts.userId, rawUsers.slackId))
		.where(inArray(rawUsers.slackId, userIds))
		.groupBy(rawUsers.slackId);

	for (const balance of userBalances) {
		balances.set(balance.slackId, {
			slackId: balance.slackId,
			email: '',
			oldTokens: Number(balance.totalPayouts),
			newTokens: 0,
			spent: Number(balance.totalSpent)
		});
	}

	return balances;
}

async function clearOldPayouts(): Promise<number> {
	console.log('Clearing old payouts...');
	const result = await db.delete(payouts).returning();
	return result.length;
}

async function processConvergeSubmissions() {
	console.log('Fetching approved Converge submissions from Airtable...');
	const records = await fetchAirtableRecords();
	console.log(`Found ${records.length} approved submissions\n`);

	// Map to track hours by Slack ID (for deduplication)
	const userHoursBySlackId = new Map<string, number>();

	// Map to track emails for logging purposes
	const slackIdToEmail = new Map<string, string>();

	// Collect all unique Slack IDs
	const allSlackIds = new Set<string>();

	for (const record of records) {
		const fields = record.fields;
		const slackId = fields['Slack ID'];
		const email = fields['Email Normalised'] || fields['Email'];
		const projectNamesString = fields['Hackatime Project Name'];

		if (!slackId) {
			console.log(`Skipping record ${record.id} - missing Slack ID`);
			continue;
		}

		allSlackIds.add(slackId);

		// Store email for later reference
		if (email) {
			slackIdToEmail.set(slackId, email);
		}

		console.log(`Processing Slack ID: ${slackId} (${email || 'no email'})`);
		console.log(`  Target projects: ${projectNamesString}`);

		const targetProjects = parseProjectNames(projectNamesString);
		if (targetProjects.length === 0) {
			console.log('  No target projects specified, skipping...\n');
			continue;
		}

		const hackatimeData = await fetchHackatimeStats(slackId);
		if (!hackatimeData) {
			console.log('  Failed to fetch Hackatime data, skipping...\n');
			continue;
		}

		const totalSeconds = calculateHoursFromProjects(hackatimeData, targetProjects);
		const hours = totalSeconds / 3600;
		console.log(`  Total: ${totalSeconds} seconds (${hours.toFixed(2)} hours)\n`);

		// Accumulate hours by Slack ID
		const currentHours = userHoursBySlackId.get(slackId) || 0;
		userHoursBySlackId.set(slackId, currentHours + hours);
	}

	// Get current balances before clearing
	const currentBalances = await getCurrentBalances(Array.from(allSlackIds));

	// Update emails in balance map
	for (const [slackId, balance] of currentBalances) {
		balance.email = slackIdToEmail.get(slackId) || 'N/A';
	}

	// Clear old payouts
	const clearedCount = await clearOldPayouts();
	console.log(`\nCleared ${clearedCount} old payouts\n`);

	// Process each user and create new payouts
	const results: Array<{ slackId: string; email: string; tokens: number }> = [];
	const payoutRecords: Array<{ tokens: number; userId: string }> = [];
	const warnings: Array<{
		slackId: string;
		email: string;
		oldBalance: number;
		newBalance: number;
		difference: number;
	}> = [];

	for (const [slackId, totalHours] of userHoursBySlackId) {
		const totalSeconds = totalHours * 3600;
		const tokens = convertSecondsToTokens(totalSeconds);

		if (tokens > 0) {
			// Ensure user exists in database
			await ensureUserExists(slackId);

			// Update new tokens in balance tracking
			const balance = currentBalances.get(slackId) || {
				slackId,
				email: slackIdToEmail.get(slackId) || 'N/A',
				oldTokens: 0,
				newTokens: 0,
				spent: 0
			};
			balance.newTokens = tokens;
			currentBalances.set(slackId, balance);

			// Create payout record
			const payoutData = {
				tokens,
				userId: slackId
			};

			payoutRecords.push(payoutData);

			const email = slackIdToEmail.get(slackId) || 'N/A';
			results.push({
				slackId,
				email,
				tokens
			});

			console.log(`${slackId} (${email}): ${totalHours.toFixed(2)} hours → ${tokens} tokens`);
		}
	}

	// Check for users with reduced balances
	for (const [slackId, balance] of currentBalances) {
		const oldAvailable = balance.oldTokens - balance.spent;
		const newAvailable = balance.newTokens - balance.spent;

		if (newAvailable < oldAvailable && oldAvailable > 0) {
			warnings.push({
				slackId,
				email: balance.email,
				oldBalance: oldAvailable,
				newBalance: Math.max(0, newAvailable),
				difference: oldAvailable - Math.max(0, newAvailable)
			});
		}
	}

	// Insert all payouts in a single transaction
	if (payoutRecords.length > 0) {
		console.log('\nInserting new payouts into database...');

		await db.transaction(async (tx) => {
			for (const payout of payoutRecords) {
				await tx.insert(payouts).values(payout);
			}
		});

		console.log(`Successfully inserted ${payoutRecords.length} payouts`);
	}

	return { results, warnings };
}

// Main execution
async function main() {
	try {
		const { results, warnings } = await processConvergeSubmissions();

		console.log('\n=== FINAL RESULTS (JSON) ===');
		console.log(JSON.stringify(results, null, 2));

		console.log('\n=== SUMMARY ===');
		console.log(`Total users: ${results.length}`);
		console.log(`Total tokens distributed: ${results.reduce((sum, r) => sum + r.tokens, 0)}`);

		if (warnings.length > 0) {
			console.log('\n=== ⚠️  BALANCE REDUCTION WARNINGS ⚠️  ===');
			console.log('The following users have REDUCED available balances after recalculation:');
			console.log('(This can happen if they spent tokens before the recalculation)\n');

			for (const warning of warnings) {
				console.log(`⚠️  ${warning.slackId} (${warning.email}):`);
				console.log(`   Old available balance: ${warning.oldBalance} tokens`);
				console.log(`   New available balance: ${warning.newBalance} tokens`);
				console.log(`   Reduction: ${warning.difference} tokens\n`);
			}

			console.log(`Total users with reduced balances: ${warnings.length}`);
		} else {
			console.log('\n✅ No users have reduced balances after recalculation');
		}
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

// Run the script
main();
