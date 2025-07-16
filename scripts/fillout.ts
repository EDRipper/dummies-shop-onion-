import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

// Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'app1sLnxuQNDBZNju';
const AIRTABLE_TABLE_NAME = 'tblsbrzyPghuKgMyz';
const CSV_FILE_PATH = './fillout-submissions.csv';

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
    'Screenshot'?: Array<{ url: string; filename?: string }>;  // Airtable attachment field format
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
    [key: string]: any;
  };
}

async function fetchPendingAirtableRecords(): Promise<AirtableRecord[]> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  let allRecords: AirtableRecord[] = [];
  let offset: string | null = null;

  do {
    const params = new URLSearchParams({
      filterByFormula: 'OR({Converge Review} = "Pending", {Converge Review} = "")',
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
  // Extract Slack ID from various formats:
  // - Just the ID: U01234567
  // - Display name with ID: John Doe (U01234567)
  // - Display name / ID: John Doe / U01234567
  
  const patterns = [
    /\b(U[A-Z0-9]{8,})\b/,  // Matches U followed by 8+ alphanumeric chars
    /\(([^)]+)\)/,          // Matches content within parentheses
    /\/\s*(\S+)$/           // Matches content after forward slash
  ];

  for (const pattern of patterns) {
    const match = slackInput.match(pattern);
    if (match && match[1].startsWith('U')) {
      return match[1].trim();
    }
  }

  // If no pattern matches, return the whole string trimmed
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

function mapFilloutToAirtable(submission: FilloutSubmission, projectIndex: number = 1): any {
  const isSecondProject = projectIndex === 2;
  
  // Determine which project fields to use
  const description = isSecondProject 
    ? submission["How do you use it? And what's the idea behind it? (1)"]
    : submission["How do you use it? And what's the idea behind it?"];
    
  const playableUrl = isSecondProject
    ? submission['Link to deployment (1)']
    : submission['Link to deployment'];
    
  const hackatimeProjects = isSecondProject
    ? submission['Hackatime project names (1)']
    : submission['Hackatime project names'];
    
  const videoLink = isSecondProject
    ? submission['Video link of it working (1)']
    : submission['Video link of it working'];
    
  const repoLink = isSecondProject
    ? submission['Project repo link']
    : submission['Project repo link (1)'];

  // Extract first and last name from signature
  const { firstName, lastName } = extractFirstLastName(submission['To confirm, please e-sign below.']);

  // Format video link for Airtable attachment field
  // Airtable expects an array of objects with 'url' property
  const screenshotAttachment = videoLink ? [{ url: videoLink }] : undefined;

  const fields: any = {
    'Email': submission["What's your email?"],
    'Slack ID': extractSlackId(submission["What's your Slack display name/ID?"]),
    'Description': description,
    'Playable URL': playableUrl,
    'Hackatime Project Name': hackatimeProjects,
    'Screenshot': screenshotAttachment,  // Properly formatted for Airtable attachment field
    'GitHub Username': extractGithubUsername(repoLink),
    'First Name': firstName,
    'Last Name': lastName,
    'Address (Line 1)': submission['Address (Your address)'],
    'City': submission['City (Your address)'],
    'State / Province': submission['State/Province (Your address)'],
    'ZIP / Postal Code': submission['Zip/Postal code (Your address)'],
    'Country': submission['Country (Your address)'],
    'How did you hear about this?': submission['Where did you find Converge?'] || submission["How'd you hear about Converge?"],
    'What are we doing well?': submission['What are we doing well?'],
    'How can we improve?': submission['What could we do better?']
  };

  // Remove undefined/null/empty values
  Object.keys(fields).forEach(key => {
    if (!fields[key] || fields[key] === '') {
      delete fields[key];
    }
  });

  return fields;
}

function extractGithubUsername(repoUrl: string): string | undefined {
  if (!repoUrl) return undefined;
  
  // Extract username from GitHub URL patterns:
  // https://github.com/username/repo
  // github.com/username/repo
  const match = repoUrl.match(/github\.com\/([^\/]+)/);
  return match ? match[1] : undefined;
}

function extractFirstLastName(signature: string): { firstName?: string; lastName?: string } {
  if (!signature) return {};
  
  // Clean up the signature - remove extra spaces and trim
  const cleaned = signature.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  
  // Assume first part is first name, everything else is last name
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

async function syncFilloutToAirtable() {
  console.log('Reading Fillout CSV...');
  const submissions = parseCSV(CSV_FILE_PATH);
  console.log(`Found ${submissions.length} submissions in CSV\n`);

  console.log('Fetching pending Airtable records...');
  const pendingRecords = await fetchPendingAirtableRecords();
  console.log(`Found ${pendingRecords.length} pending records in Airtable\n`);

  // Create lookup maps for matching
  const recordsByEmail = new Map<string, AirtableRecord[]>();
  const recordsBySlackId = new Map<string, AirtableRecord[]>();

  for (const record of pendingRecords) {
    const email = record.fields['Email Normalised'] || record.fields['Email'];
    const slackId = record.fields['Slack ID'];

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!recordsByEmail.has(normalizedEmail)) {
        recordsByEmail.set(normalizedEmail, []);
      }
      recordsByEmail.get(normalizedEmail)!.push(record);
    }

    if (slackId) {
      if (!recordsBySlackId.has(slackId)) {
        recordsBySlackId.set(slackId, []);
      }
      recordsBySlackId.get(slackId)!.push(record);
    }
  }

  // Process each submission
  let updatedCount = 0;
  let createdCount = 0;
  
  for (const submission of submissions) {
    const email = submission["What's your email?"]?.toLowerCase().trim();
    const slackId = extractSlackId(submission["What's your Slack display name/ID?"]);

    // Find matching records
    const matchingRecords: AirtableRecord[] = [];
    
    if (email && recordsByEmail.has(email)) {
      matchingRecords.push(...recordsByEmail.get(email)!);
    }
    
    if (slackId && recordsBySlackId.has(slackId)) {
      const slackMatches = recordsBySlackId.get(slackId)!;
      // Add only if not already included by email match
      for (const record of slackMatches) {
        if (!matchingRecords.find(r => r.id === record.id)) {
          matchingRecords.push(record);
        }
      }
    }

    if (matchingRecords.length === 0) {
      console.log(`No pending record found for ${email || slackId} - checking if they need new records created...`);
      
      // Check if this submission has any projects
      const hasFirstProject = submission['Project repo link (1)'] || submission['Link to deployment'] || submission['Hackatime project names'];
      if (!hasFirstProject) {
        console.log(`  No project data found, skipping...\n`);
        continue;
      }

      // Create new records for all projects
      const hasSecondProject = submission['I made a second project'] === 'true' || submission['I made a second project'] === 'Yes';
      const projectCount = hasSecondProject ? 2 : 1;
      
      console.log(`  Creating ${projectCount} new record(s) for ${email}...\n`);
      
      for (let i = 0; i < projectCount; i++) {
        const projectIndex = i + 1;
        const newFields = mapFilloutToAirtable(submission, projectIndex);
        
        // Add default fields for new records
        newFields['Converge Review'] = 'Pending';
        newFields['Fulfilled'] = false;
        newFields['Project Name'] = `${email} - Project ${projectIndex}`;
        
        console.log(`  Creating new record for ${email} (Project ${projectIndex})...`);
        console.log(`  Fields:`, Object.keys(newFields).join(', '));

        try {
          const newRecordId = await createAirtableRecord(newFields);
          createdCount++;
          console.log(`  ✓ Successfully created record ${newRecordId}\n`);
        } catch (error) {
          console.error(`  ✗ Failed to create record:`, error);
        }
      }
      
      continue;
    }

    // Handle two-project submissions
    const hasSecondProject = submission['I made a second project'] === 'true' || submission['I made a second project'] === 'Yes';
    const projectCount = hasSecondProject ? 2 : 1;

    // Update existing records
    for (let i = 0; i < Math.min(matchingRecords.length, projectCount); i++) {
      const record = matchingRecords[i];
      const projectIndex = i + 1;
      const updateFields = mapFilloutToAirtable(submission, projectIndex);

      console.log(`Updating record ${record.id} for ${email} (Project ${projectIndex})...`);
      console.log(`  Fields to update:`, Object.keys(updateFields).join(', '));

      try {
        await updateAirtableRecord(record.id, updateFields);
        updatedCount++;
        console.log(`  ✓ Successfully updated\n`);
      } catch (error) {
        console.error(`  ✗ Failed to update:`, error);
      }
    }

    // Create new records if needed
    if (projectCount > matchingRecords.length) {
      const recordsToCreate = projectCount - matchingRecords.length;
      console.log(`  ⚠️  ${email} has ${projectCount} projects but only ${matchingRecords.length} pending records`);
      console.log(`  Creating ${recordsToCreate} new record(s)...\n`);

      for (let i = matchingRecords.length; i < projectCount; i++) {
        const projectIndex = i + 1;
        const newFields = mapFilloutToAirtable(submission, projectIndex);
        
        // Add default fields for new records
        newFields['Converge Review'] = 'Pending';
        newFields['Fulfilled'] = false;
        newFields['Project Name'] = `${email} - Project ${projectIndex}`;
        
        console.log(`  Creating new record for ${email} (Project ${projectIndex})...`);
        console.log(`  Fields:`, Object.keys(newFields).join(', '));

        try {
          const newRecordId = await createAirtableRecord(newFields);
          createdCount++;
          console.log(`  ✓ Successfully created record ${newRecordId}\n`);
        } catch (error) {
          console.error(`  ✗ Failed to create record:`, error);
        }
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total submissions processed: ${submissions.length}`);
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