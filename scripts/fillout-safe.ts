import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';
const CSV_FILE_PATH = './fillout-submissions.csv';

// Marker to identify records created by this script
const SCRIPT_MARKER = '[Auto-created by Fillout sync]';

interface FilloutSubmission {
  'Submission ID': string;
  'Last updated': string;
  'Status': string;
  "What's your email?": string;
  "What's your Slack display name/ID?": string;
  "How'd you hear about Converge?": string;
  'I want to order a physical item': string;
  'Project repo link (1)': string;
  'Video link of it working': string;
  "How do you use it? And what's the idea behind it?": string;
  'Hackatime project names': string;
  'Link to deployment': string;
  'I made a second project': string;
  'Project repo link': string;
  "How do you use it? And what's the idea behind it? (1)": string;
  'Link to deployment (1)': string;
  'Hackatime project names (1)': string;
  'Video link of it working (1)': string;
  'Address (Your address)': string;
  'City (Your address)': string;
  'State/Province (Your address)': string;
  'Zip/Postal code (Your address)': string;
  'Country (Your address)': string;
  'To confirm, please e-sign below.': string;
  'Where did you find Converge?': string;
  'What are we doing well?': string;
  'What could we do better?': string;
}

interface AirtableRecord {
  id: string;
  fields: {
    'Email'?: string;
    'Email Normalised'?: string;
    'Slack ID'?: string;
    'Converge Review'?: string;
    'Description'?: string;
    'Playable URL'?: string;
    'Hackatime Project Name'?: string;
    'Screenshot'?: Array<{ url: string }>;
    'GitHub Username'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'Address (Line 1)'?: string;
    'Address (Line 2)'?: string;
    'City'?: string;
    'State / Province'?: string;
    'ZIP / Postal Code'?: string;
    'Country'?: string;
    'How did you hear about this?'?: string;
    'What are we doing well?'?: string;
    'How can we improve?'?: string;
    'Project Name'?: string;
    [key: string]: any;
  };
}

async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  let allRecords: AirtableRecord[] = [];
  let offset: string | null = null;

  do {
    const params = new URLSearchParams({
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

async function deleteAirtableRecord(recordId: string): Promise<void> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${recordId}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete record ${recordId}: ${error}`);
  }
}

async function updateAirtableRecord(recordId: string, fields: any): Promise<void> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${recordId}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update record ${recordId}: ${error}`);
  }
}

async function createAirtableRecord(fields: any): Promise<string> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create record: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

function extractSlackId(slackInput: string): string {
  const patterns = [
    /\b(U[A-Z0-9]{8,})\b/,
    /\(([^)]+)\)/,
    /\/\s*(\S+)$/
  ];

  for (const pattern of patterns) {
    const match = slackInput.match(pattern);
    if (match && match[1].startsWith('U')) {
      return match[1].trim();
    }
  }

  return slackInput.trim();
}

function parseCSV(filePath: string): FilloutSubmission[] {
  const fileContent = readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function extractGithubUsername(repoUrl: string): string | undefined {
  if (!repoUrl) return undefined;
  
  const match = repoUrl.match(/github\.com\/([^\/]+)/);
  return match ? match[1] : undefined;
}

function extractFirstLastName(signature: string): { firstName?: string; lastName?: string } {
  if (!signature) return {};
  
  const cleaned = signature.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function mergeSubmissions(submissions: FilloutSubmission[]): any {
  // Merge multiple submissions into one, combining data from both projects
  const merged: any = {};
  
  // Take the latest submission's basic info
  const latestSubmission = submissions[submissions.length - 1];
  
  // Basic fields from latest submission
  merged['Email'] = latestSubmission["What's your email?"];
  merged['Slack ID'] = extractSlackId(latestSubmission["What's your Slack display name/ID?"]);
  
  // Extract name from signature
  const { firstName, lastName } = extractFirstLastName(latestSubmission['To confirm, please e-sign below.']);
  if (firstName) merged['First Name'] = firstName;
  if (lastName) merged['Last Name'] = lastName;
  
  // Address fields
  if (latestSubmission['Address (Your address)']) merged['Address (Line 1)'] = latestSubmission['Address (Your address)'];
  if (latestSubmission['City (Your address)']) merged['City'] = latestSubmission['City (Your address)'];
  if (latestSubmission['State/Province (Your address)']) merged['State / Province'] = latestSubmission['State/Province (Your address)'];
  if (latestSubmission['Zip/Postal code (Your address)']) merged['ZIP / Postal Code'] = latestSubmission['Zip/Postal code (Your address)'];
  if (latestSubmission['Country (Your address)']) merged['Country'] = latestSubmission['Country (Your address)'];
  
  // Feedback
  merged['How did you hear about this?'] = latestSubmission['Where did you find Converge?'] || latestSubmission["How'd you hear about Converge?"];
  merged['What are we doing well?'] = latestSubmission['What are we doing well?'];
  merged['How can we improve?'] = latestSubmission['What could we do better?'];
  
  // Collect all project data
  const allProjects: any[] = [];
  const allHackatimeProjects: string[] = [];
  const allDescriptions: string[] = [];
  const allPlayableUrls: string[] = [];
  const allVideoUrls: string[] = [];
  const allGithubUsernames: Set<string> = new Set();
  
  for (const submission of submissions) {
    // Project 1
    if (submission['Hackatime project names']) {
      allHackatimeProjects.push(submission['Hackatime project names']);
    }
    if (submission["How do you use it? And what's the idea behind it?"]) {
      allDescriptions.push(submission["How do you use it? And what's the idea behind it?"]);
    }
    if (submission['Link to deployment']) {
      allPlayableUrls.push(submission['Link to deployment']);
    }
    if (submission['Video link of it working']) {
      allVideoUrls.push(submission['Video link of it working']);
    }
    const github1 = extractGithubUsername(submission['Project repo link (1)']);
    if (github1) allGithubUsernames.add(github1);
    
    // Project 2 (if exists)
    const hasSecondProject = submission['I made a second project'] === 'true' || submission['I made a second project'] === 'Yes';
    if (hasSecondProject) {
      if (submission['Hackatime project names (1)']) {
        allHackatimeProjects.push(submission['Hackatime project names (1)']);
      }
      if (submission["How do you use it? And what's the idea behind it? (1)"]) {
        allDescriptions.push(submission["How do you use it? And what's the idea behind it? (1)"]);
      }
      if (submission['Link to deployment (1)']) {
        allPlayableUrls.push(submission['Link to deployment (1)']);
      }
      if (submission['Video link of it working (1)']) {
        allVideoUrls.push(submission['Video link of it working (1)']);
      }
      const github2 = extractGithubUsername(submission['Project repo link']);
      if (github2) allGithubUsernames.add(github2);
    }
  }
  
  // Combine all project data
  if (allHackatimeProjects.length > 0) {
    merged['Hackatime Project Name'] = [...new Set(allHackatimeProjects)].join(', ');
  }
  
  if (allDescriptions.length > 0) {
    merged['Description'] = allDescriptions.join('\n\n--- Project ---\n\n');
  }
  
  // Use the first valid playable URL
  if (allPlayableUrls.length > 0) {
    merged['Playable URL'] = allPlayableUrls[0];
  }
  
  // Use the first video URL for screenshot
  if (allVideoUrls.length > 0) {
    merged['Screenshot'] = [{ url: allVideoUrls[0] }];
  }
  
  // Use the first GitHub username
  if (allGithubUsernames.size > 0) {
    merged['GitHub Username'] = Array.from(allGithubUsernames)[0];
  }
  
  return merged;
}

async function cleanupAutoCreatedRecords(allRecords: AirtableRecord[]): Promise<number> {
  console.log('Cleaning up previously auto-created records...');
  let deletedCount = 0;
  
  const recordsToDelete = allRecords.filter(record => {
    const projectName = record.fields['Project Name'];
    return projectName && projectName.includes(SCRIPT_MARKER);
  });
  
  for (const record of recordsToDelete) {
    try {
      console.log(`  Deleting auto-created record ${record.id} (${record.fields['Project Name']})`);
      await deleteAirtableRecord(record.id);
      deletedCount++;
    } catch (error) {
      console.error(`  Failed to delete record ${record.id}:`, error);
    }
  }
  
  if (deletedCount > 0) {
    console.log(`  Deleted ${deletedCount} auto-created records\n`);
  }
  
  return deletedCount;
}

async function syncFilloutToAirtable() {
  console.log('Reading Fillout CSV...');
  const submissions = parseCSV(CSV_FILE_PATH);
  console.log(`Found ${submissions.length} submissions in CSV\n`);

  console.log('Fetching all Airtable records...');
  const allRecords = await fetchAllAirtableRecords();
  console.log(`Found ${allRecords.length} total records in Airtable\n`);

  // Clean up previously auto-created records
  await cleanupAutoCreatedRecords(allRecords);

  // Filter to get only pending records (excluding auto-created ones we just deleted)
  const pendingRecords = allRecords.filter(record => {
    const convergeReview = record.fields['Converge Review'];
    const projectName = record.fields['Project Name'];
    const isAutoCreated = projectName && projectName.includes(SCRIPT_MARKER);
    return !isAutoCreated && (convergeReview === 'Pending' || convergeReview === '');
  });
  
  console.log(`Found ${pendingRecords.length} pending records to process\n`);

  // Group submissions by user (email or slack ID)
  const submissionsByUser = new Map<string, FilloutSubmission[]>();
  
  for (const submission of submissions) {
    const email = submission["What's your email?"]?.toLowerCase().trim();
    const slackId = extractSlackId(submission["What's your Slack display name/ID?"]);
    
    // Use email as primary key, fallback to slack ID
    const userKey = email || slackId;
    if (!userKey) continue;
    
    if (!submissionsByUser.has(userKey)) {
      submissionsByUser.set(userKey, []);
    }
    submissionsByUser.get(userKey)!.push(submission);
  }

  // Create lookup maps for existing records
  const recordsByEmail = new Map<string, AirtableRecord>();
  const recordsBySlackId = new Map<string, AirtableRecord>();

  for (const record of pendingRecords) {
    const email = record.fields['Email Normalised'] || record.fields['Email'];
    const slackId = record.fields['Slack ID'];

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      recordsByEmail.set(normalizedEmail, record);
    }

    if (slackId) {
      recordsBySlackId.set(slackId, record);
    }
  }

  // Process each user's submissions
  let updatedCount = 0;
  let createdCount = 0;
  
  for (const [userKey, userSubmissions] of submissionsByUser) {
    const mergedData = mergeSubmissions(userSubmissions);
    const email = mergedData['Email Normalised'];
    const slackId = mergedData['Slack ID'];
    
    console.log(`Processing ${userKey} (${userSubmissions.length} submission(s))...`);

    // Find existing record
    let existingRecord: AirtableRecord | undefined;
    
    if (email && recordsByEmail.has(email)) {
      existingRecord = recordsByEmail.get(email);
    } else if (slackId && recordsBySlackId.has(slackId)) {
      existingRecord = recordsBySlackId.get(slackId);
    }

    if (existingRecord) {
      // Update existing record
      console.log(`  Updating existing record ${existingRecord.id}`);
      console.log(`  Fields to update:`, Object.keys(mergedData).join(', '));
      
      try {
        await updateAirtableRecord(existingRecord.id, mergedData);
        updatedCount++;
        console.log(`  ✓ Successfully updated\n`);
      } catch (error) {
        console.error(`  ✗ Failed to update:`, error);
      }
    } else {
      // Create new record
      console.log(`  No existing record found, creating new record`);
      
      // Add default fields for new records
      mergedData['Converge Review'] = 'Pending';
      mergedData['Fulfilled'] = false;
      mergedData['Project Name'] = `${email || slackId} ${SCRIPT_MARKER}`;
      
      console.log(`  Fields:`, Object.keys(mergedData).join(', '));
      
      try {
        const newRecordId = await createAirtableRecord(mergedData);
        createdCount++;
        console.log(`  ✓ Successfully created record ${newRecordId}\n`);
      } catch (error) {
        console.error(`  ✗ Failed to create record:`, error);
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total unique users processed: ${submissionsByUser.size}`);
  console.log(`Total records updated: ${updatedCount}`);
  console.log(`Total records created: ${createdCount}`);
  console.log(`Total operations: ${updatedCount + createdCount}`);
}

// Main execution
async function main() {
  try {
    await syncFilloutToAirtable();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();