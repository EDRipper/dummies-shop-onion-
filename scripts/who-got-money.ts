// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';
const HACKATIME_BASE_URL = 'https://hackatime.hackclub.com/api/v1/users';
const HC_AI_URL = 'https://ai.hackclub.com/chat/completions';
const START_DATE = '2025-6-24';
const END_DATE = '2025-7-17T23:59Z';
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
	trust_factor: {
		trust_level: "red" | "yellow" | "blue";
	};
}

interface UserBalance {
	slackId: string;
	email: string;
	oldTokens: number;
	newTokens: number;
	spent: number;
}

interface UserPlatformData {
	slackId: string;
	email: string;
	allRecords: AirtableRecord[];
	platforms: string[];
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

async function detectChatPlatforms(userRecords: AirtableRecord[]): Promise<string[]> {
	if (userRecords.length === 0) return [];

	// Combine Description and Playable URL fields from user's records
	const allText = userRecords
		.map((record) => {
			const fields = record.fields;
			// Only get Description and Playable URL fields
			const relevantFields: string[] = [];

			if (fields['Description'] && typeof fields['Description'] === 'string') {
				relevantFields.push(`Description: ${fields['Description']}`);
			}

			if (fields['Playable URL'] && typeof fields['Playable URL'] === 'string') {
				relevantFields.push(`Playable URL: ${fields['Playable URL']}`);
			}

			return relevantFields.join('\n');
		})
		.filter(text => text.length > 0) // Only include records with relevant fields
		.join('\n\n');

	const systemPrompt = `You are an expert at analyzing text to identify chat platforms mentioned.

Your task is to identify ALL chat platforms mentioned across the provided text. Chat platforms include applications like Slack, Discord, Zulip, Microsoft Teams, Telegram, WhatsApp, IRC, Matrix, Mattermost, etc.

IMPORTANT RULES:
1. ONLY return chat/messaging platforms, not other types of platforms
2. Return the results as a JSON array of strings
3. Use standard platform names (e.g., "Slack", "Discord", "Zulip")
4. If no chat platforms are found, return an empty array []
5. Do not include any explanation or thinking process in your response

Examples:
- If text mentions "slack channels" and "discord server" → ["Slack", "Discord"]
- If text mentions "github repository" and "zoom meeting" → []
- If text mentions "Teams chat" and "telegram group" → ["Microsoft Teams", "Telegram"]

Analyze the following text and return ONLY the JSON array:`;

	try {
		const response = await fetch(HC_AI_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: allText }
				]
			})
		});

		if (!response.ok) {
			console.error(`HC AI request failed: ${response.status}`);
			return [];
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content || '';

		// Remove <think> tags if present
		const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

		// Try to parse as JSON
		try {
			const platforms = JSON.parse(cleanContent);
			if (Array.isArray(platforms)) {
				return platforms.filter((p) => typeof p === 'string');
			}
		} catch (parseError) {
			console.error('Failed to parse HC AI response as JSON:', cleanContent);
		}

		return [];
	} catch (error) {
		console.error('Error calling HC AI:', error);
		return [];
	}
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
    console.log('Clearing old payouts (excluding Thunder and MANUAL payouts)...');
    const result = await db
        .delete(payouts)
        .where(
            and(
                sql`${payouts.memo} NOT ILIKE '%Thunder%'`,
                sql`${payouts.memo} NOT ILIKE '%MANUAL%'`
            )
        )
        .returning();
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

	// Map to collect all records per user for platform analysis
	const userRecordsMap = new Map<string, AirtableRecord[]>();

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

		// Collect all records for this user
		if (!userRecordsMap.has(slackId)) {
			userRecordsMap.set(slackId, []);
		}
		userRecordsMap.get(slackId)!.push(record);

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
		const trustLevel = hackatimeData.trust_factor?.trust_level;
		if (trustLevel === 'red') {
			console.log(`  Trust level is red, skipping ${slackId}\n`);
			continue;
		} else if (trustLevel === 'yellow') {
			console.log(`  Trust level is yellow, processing ${slackId} with caution\n`);
		}

		const totalSeconds = calculateHoursFromProjects(hackatimeData, targetProjects);
		const hours = totalSeconds / 3600;
		console.log(`  Total: ${totalSeconds} seconds (${hours.toFixed(2)} hours)\n`);

		// Accumulate hours by Slack ID
		const currentHours = userHoursBySlackId.get(slackId) || 0;
		userHoursBySlackId.set(slackId, currentHours + hours);
	}

	// Analyze platforms for each user
	console.log('\nAnalyzing chat platforms for platform bonuses...');
	const userPlatformData = new Map<string, UserPlatformData>();

	for (const [slackId, userRecords] of userRecordsMap) {
		console.log(`Detecting platforms for ${slackId}...`);
		const platforms = await detectChatPlatforms(userRecords);
		console.log(`  Found platforms: ${platforms.length > 0 ? platforms.join(', ') : 'none'}`);

		userPlatformData.set(slackId, {
			slackId,
			email: slackIdToEmail.get(slackId) || 'N/A',
			allRecords: userRecords,
			platforms
		});
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
	const results: Array<{ slackId: string; email: string; tokens: number; platforms?: string[] }> = [];
	const payoutRecords: Array<{ tokens: number; userId: string; memo: string }> = [];
	const warnings: Array<{
		slackId: string;
		email: string;
		oldBalance: number;
		newBalance: number;
		difference: number;
	}> = [];

	// Create main payouts for hours worked
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

			// Create payout record with memo
			const payoutData = {
				tokens,
				userId: slackId,
				memo: `Converge payout: ${totalHours.toFixed(2)} hours worked (${START_DATE} to ${END_DATE.split('T')[0]})`
			};

			payoutRecords.push(payoutData);

			const email = slackIdToEmail.get(slackId) || 'N/A';
			const platformData = userPlatformData.get(slackId);

			results.push({
				slackId,
				email,
				tokens,
				platforms: platformData?.platforms || []
			});

			console.log(`${slackId} (${email}): ${totalHours.toFixed(2)} hours → ${tokens} tokens`);
		}
	}

	// Create platform bonus payouts
	console.log('\nProcessing platform bonuses...');
	let platformBonusCount = 0;

	for (const [slackId, platformData] of userPlatformData) {
		const { platforms, email } = platformData;

		if (platforms.length >= 2) {
			// Ensure user exists in database
			await ensureUserExists(slackId);

			// Calculate potential bonus tokens (1 per platform if 2+)
			const potentialBonusTokens = platforms.length;

			// Get current tokens from hours worked
			const currentBalance = currentBalances.get(slackId) || {
				slackId,
				email,
				oldTokens: 0,
				newTokens: 0,
				spent: 0
			};

			// Calculate actual bonus tokens respecting MAX_TOKENS cap
			const currentTokens = currentBalance.newTokens;
			const maxBonusAllowed = Math.max(0, MAX_TOKENS - currentTokens);
			const actualBonusTokens = Math.min(potentialBonusTokens, maxBonusAllowed);

			if (actualBonusTokens > 0) {
				// Update balance tracking
				currentBalance.newTokens += actualBonusTokens;
				currentBalances.set(slackId, currentBalance);

				// Create platform bonus payout
				const platformPayoutData = {
					tokens: actualBonusTokens,
					userId: slackId,
					memo: `Platform bonus: Used ${platforms.length} chat platforms (${platforms.join(', ')}) - capped at ${MAX_TOKENS} total tokens`
				};

				payoutRecords.push(platformPayoutData);
				platformBonusCount++;

				// Update results to include bonus tokens
				const resultIndex = results.findIndex(r => r.slackId === slackId);
				if (resultIndex >= 0) {
					results[resultIndex].tokens += actualBonusTokens;
				} else {
					// User didn't have hours but has platform bonus
					results.push({
						slackId,
						email,
						tokens: actualBonusTokens,
						platforms
					});
				}

				if (actualBonusTokens < potentialBonusTokens) {
					console.log(`${slackId} (${email}): +${actualBonusTokens} platform bonus tokens for ${platforms.join(', ')} (capped from ${potentialBonusTokens} due to ${MAX_TOKENS} token limit)`);
				} else {
					console.log(`${slackId} (${email}): +${actualBonusTokens} platform bonus tokens for ${platforms.join(', ')}`);
				}
			} else {
				console.log(`${slackId} (${email}): No platform bonus - already at ${MAX_TOKENS} token cap with ${platforms.join(', ')}`);
			}
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

	return { results, warnings, platformBonusCount };
}

// Main execution
async function main() {
	try {
		const { results, warnings, platformBonusCount } = await processConvergeSubmissions();

		console.log('\n=== FINAL RESULTS (JSON) ===');
		console.log(JSON.stringify(results, null, 2));

		console.log('\n=== SUMMARY ===');
		console.log(`Total users: ${results.length}`);
		console.log(`Total tokens distributed: ${results.reduce((sum, r) => sum + r.tokens, 0)}`);
		console.log(`Users with platform bonuses: ${platformBonusCount}`);

		// Show platform breakdown
		const platformUsers = results.filter(r => r.platforms && r.platforms.length >= 2);
		if (platformUsers.length > 0) {
			console.log('\n=== PLATFORM BONUSES ===');
			for (const user of platformUsers) {
				console.log(`${user.slackId} (${user.email}): ${user.platforms!.join(', ')}`);
			}
		}

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
