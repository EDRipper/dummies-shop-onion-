import { db } from '../src/lib/server/db';
import { rawUsers } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getCode, getName, getCodes } from 'country-list';

// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';

interface AirtableRecord {
	id: string;
	fields: {
		'Slack ID'?: string;
		'Status'?: string;
		'Country'?: string;
		[key: string]: any;
	};
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	console.log('Fetching records from YSWS Airtable...');
	
	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableRecord[] = [];
	let offset: string | null = null;

	do {
		const params = new URLSearchParams({
			...(offset && { offset })
		});

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) {
			throw new Error(`Failed to fetch Airtable records: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();

		if (data.records) {
			allRecords = allRecords.concat(data.records);
		}

		offset = data.offset;
	} while (offset);

	console.log(`Fetched ${allRecords.length} total records from Airtable`);
	return allRecords;
}

function normalizeCountryCode(countryInput: string): string | null {
	if (!countryInput || countryInput.trim() === '') {
		return null;
	}

	const input = countryInput.trim();
	
	// If it's already a 2-letter code, validate it exists
	if (input.length === 2) {
		const validCodes = getCodes();
		const upperInput = input.toUpperCase();
		return validCodes.includes(upperInput) ? upperInput : null;
	}

	// Try to find by country name using the library
	let code = getCode(input);
	if (code) {
		return code;
	}

	// Manual mapping for common variations
	const manualMappings: Record<string, string> = {
		'United States': 'US',
		'United States of America': 'US',
		'USA': 'US',
		'Netherlands': 'NL',
		'Holland': 'NL',
		'Vietnam': 'VN',
		'Viet Nam': 'VN',
		'South Korea': 'KR',
		'Korea': 'KR',
		'Republic of Korea': 'KR'
	};

	const mappedCode = manualMappings[input];
	if (mappedCode) {
		return mappedCode;
	}

	// Try case-insensitive search
	for (const [name, countryCode] of Object.entries(manualMappings)) {
		if (name.toLowerCase() === input.toLowerCase()) {
			return countryCode;
		}
	}

	return null;
}

async function getUsersFromDb() {
	console.log('Fetching existing users from database...');
	const users = await db.select().from(rawUsers);
	console.log(`Found ${users.length} users in database`);
	return users;
}

async function backfillUserFields() {
	try {
		console.log('=== User Fields Backfill Script ===\n');

		// Fetch data
		const [airtableRecords, dbUsers] = await Promise.all([
			fetchAirtableRecords(),
			getUsersFromDb()
		]);

		// Create maps for lookup
		const airtableBySlackId = new Map<string, AirtableRecord>();
		const slackIdsWithSubmittedStatus = new Set<string>();
		const allStatusValues = new Set<string>();

		for (const record of airtableRecords) {
			const slackId = record.fields['Slack ID'];
			const status = record.fields['Status'];
			
			// Log all status values we see for debugging
			if (status) {
				allStatusValues.add(status);
			}
			
			if (slackId) {
				airtableBySlackId.set(slackId, record);
				
				// Check if this Slack ID has any record with Status field set to "Uploaded"
				if (record.fields['Status'] === 'Uploaded') {
					slackIdsWithSubmittedStatus.add(slackId);
				}
			}
		}

		console.log(`\nFound these Status values in Airtable: ${Array.from(allStatusValues).join(', ')}`);
		console.log(`Records with any Status: ${Array.from(allStatusValues).length > 0 ? 'Yes' : 'No'}`);
		console.log(`Records with "Uploaded" Status: ${slackIdsWithSubmittedStatus.size}`);

		console.log(`\nProcessing ${dbUsers.length} database users...`);

		let countryUpdates = 0;
		let yswsDbUpdates = 0;
		let errors = 0;

		for (const user of dbUsers) {
			const slackId = user.slackId;
			const airtableRecord = airtableBySlackId.get(slackId);
			
			let updates: Partial<typeof rawUsers.$inferInsert> = {};
			let hasUpdates = false;

			// Update country field
			if (!user.country && airtableRecord?.fields['Country']) {
				const countryCode = normalizeCountryCode(airtableRecord.fields['Country']);
				if (countryCode) {
					updates.country = countryCode;
					hasUpdates = true;
					countryUpdates++;
					console.log(`- ${slackId}: Setting country to ${countryCode} (from "${airtableRecord.fields['Country']}")`);
				} else {
					console.warn(`- ${slackId}: Could not normalize country "${airtableRecord.fields['Country']}"`);
					errors++;
				}
			}

			// Update YSWS DB fulfilled field
			const shouldBeFulfilled = slackIdsWithSubmittedStatus.has(slackId);
			if (user.yswsDbFulfilled !== shouldBeFulfilled) {
				updates.yswsDbFulfilled = shouldBeFulfilled;
				hasUpdates = true;
				yswsDbUpdates++;
				console.log(`- ${slackId}: Setting YSWS DB fulfilled to ${shouldBeFulfilled}`);
			}

			// Apply updates if any
			if (hasUpdates) {
				try {
					await db
						.update(rawUsers)
						.set(updates)
						.where(eq(rawUsers.slackId, slackId));
				} catch (error) {
					console.error(`- ${slackId}: Failed to update - ${error}`);
					errors++;
				}
			}
		}

		console.log('\n=== BACKFILL SUMMARY ===');
		console.log(`Users processed: ${dbUsers.length}`);
		console.log(`Country updates: ${countryUpdates}`);
		console.log(`YSWS DB fulfilled updates: ${yswsDbUpdates}`);
		console.log(`Errors: ${errors}`);
		console.log(`Airtable records processed: ${airtableRecords.length}`);
		console.log(`Unique Slack IDs with "Uploaded" status: ${slackIdsWithSubmittedStatus.size}`);

	} catch (error) {
		console.error('Error in backfill script:', error);
		process.exit(1);
	}
}

// Run the script
backfillUserFields();