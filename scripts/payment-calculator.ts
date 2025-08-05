// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';
const HACKATIME_BASE_URL = 'https://hackatime.hackclub.com/api/v1/users';
const START_DATE = '2025-6-24';
const END_DATE = '2025-7-17T23:59Z';
const HOURLY_RATE = 5; // $5 per hour
const CUTOFF_MULT = 0.7;

interface AirtableRecord {
	id: string;
	fields: {
		'Slack ID'?: string;
		Email?: string;
		'Email Normalised'?: string;
		'Hackatime Project Name'?: string;
		'Optional - Override Hours Spent'?: number;
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

interface UserPayment {
	slackId: string;
	email: string;
	totalHours: number;
	payment: number;
	projects: string[];
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
		const response = await fetch(url, {
      headers: {
        'Rack-Attack-Bypass': process.env.RACK_ATTACK_BYPASS || '',
      }
    });
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
): { totalSeconds: number; matchedProjects: string[] } {
	if (!hackatimeData?.data?.projects) return { totalSeconds: 0, matchedProjects: [] };

	const targetNamesLower = targetProjectNames.map((name) => name.toLowerCase());
	let totalSeconds = 0;
	const matchedProjects: string[] = [];

	for (const project of hackatimeData.data.projects) {
		const projectNameLower = project.name.toLowerCase();
		if (targetNamesLower.includes(projectNameLower)) {
			totalSeconds += project.total_seconds || 0;
			matchedProjects.push(project.name);
		}
	}

	return { totalSeconds, matchedProjects };
}

async function calculatePayments(): Promise<UserPayment[]> {
	console.log('Fetching approved Converge submissions from Airtable...');
	const records = await fetchAirtableRecords();
	console.log(`Found ${records.length} approved submissions`);

	// First pass: collect all user data and identify who needs Hackatime fetching
	const userDataBySlackId = new Map<string, {
		email: string;
		totalSeconds: number;
		allProjects: Set<string>;
		needsHackatime: boolean;
		targetProjects: string[];
	}>();

	const usersNeedingHackatime: string[] = [];

	for (const record of records) {
		const fields = record.fields;
		const slackId = fields['Slack ID'];
		const email = fields['Email Normalised'] || fields['Email'];
		const projectNamesString = fields['Hackatime Project Name'];
		const overrideHours = fields['Optional - Override Hours Spent'];

		if (!slackId) {
			console.log(`Skipping record ${record.id} - missing Slack ID`);
			continue;
		}

		// Initialize user data if not exists
		if (!userDataBySlackId.has(slackId)) {
			userDataBySlackId.set(slackId, {
				email: email || 'N/A',
				totalSeconds: 0,
				allProjects: new Set(),
				needsHackatime: false,
				targetProjects: []
			});
		}

		const userData = userDataBySlackId.get(slackId)!;

		// Check if we have override hours
		if (overrideHours && typeof overrideHours === 'number' && overrideHours > 0) {
			userData.totalSeconds += overrideHours * 3600; // Convert hours to seconds
			userData.allProjects.add('Override Hours');
			continue;
		}

		// Need Hackatime data
		const targetProjects = parseProjectNames(projectNamesString || '');
		if (targetProjects.length === 0) {
			console.log(`No target projects specified for ${slackId}, skipping...`);
			continue;
		}

		userData.needsHackatime = true;
		userData.targetProjects.push(...targetProjects);

		// Add to list for parallel fetching
		if (!usersNeedingHackatime.includes(slackId)) {
			usersNeedingHackatime.push(slackId);
		}
	}

	// Parallel fetch Hackatime data for all users who need it
	console.log(`\nFetching Hackatime data for ${usersNeedingHackatime.length} users in parallel...`);

	const hackatimePromises = usersNeedingHackatime.map(async (slackId) => {
		const data = await fetchHackatimeStats(slackId);
		return { slackId, data };
	});

	const hackatimeResults = await Promise.all(hackatimePromises);

	// Process Hackatime results
	console.log('\nProcessing Hackatime results...');
	for (const { slackId, data } of hackatimeResults) {
		const userData = userDataBySlackId.get(slackId);
		if (!userData || !userData.needsHackatime) continue;

		if (!data) {
			console.log(`Failed to fetch Hackatime data for ${slackId}, skipping`);
			continue;
		}

		const trustLevel = data.trust_factor?.trust_level;
		if (trustLevel === 'red') {
			console.log(`Trust level is red for ${slackId}, skipping`);
			continue;
		} else if (trustLevel === 'yellow') {
			console.log(`Trust level is yellow for ${slackId}, processing with caution`);
		}

		const { totalSeconds, matchedProjects } = calculateHoursFromProjects(data, userData.targetProjects);
		const hours = totalSeconds / 3600;

		userData.totalSeconds += totalSeconds;
		matchedProjects.forEach(project => userData.allProjects.add(project));
	}

	// Convert to final results
	const results: UserPayment[] = [];

	for (const [slackId, userData] of userDataBySlackId) {
		const totalHours = (userData.totalSeconds * CUTOFF_MULT) / 3600;
		const roundedHours = Math.round(totalHours); // Round DOWN
		const payment = roundedHours * HOURLY_RATE;

		if (roundedHours > 0) {
			results.push({
				slackId,
				email: userData.email,
				totalHours: roundedHours,
				payment,
				projects: Array.from(userData.allProjects)
			});
		}
	}

	return results;
}

// Main execution
async function main() {
	try {
		const results = await calculatePayments();

		console.log('\n=== SUMMARY ===');
		const totalBudget = results.reduce((sum, r) => sum + r.payment, 0);
		console.log(`Total users: ${results.length}`);
		console.log(`Total hours (rounded): ${results.reduce((sum, r) => sum + r.totalHours, 0)}`);
		console.log(`TOTAL BUDGET: $${totalBudget}`);
		console.log(`Average payment per user: $${(totalBudget / results.length).toFixed(2)}`);

	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

// Run the script
main();
