const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const AIRTABLE_BASE_ID = "app1sLnxuQNDBZNju";
const AIRTABLE_TABLE_NAME = "tblsbrzyPghuKgMyz";
const LOOPS_API_BASE_URL = "https://app.loops.so/api/v1";

interface AirtableRecord {
  id: string;
  fields: {
    Email?: string;
    "Email Normalised"?: string;
    "Address Line1"?: string;
    "Address Line2"?: string;
    "Address City"?: string;
    "Address State"?: string;
    "Address Zip Code"?: string;
    "Address Country"?: string;
    Birthday?: string;
    "Auto-assigned an address?"?: string;
    [key: string]: any;
  };
}

interface LoopsContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  userId?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  addressCountry?: string;
  addressLastUpdatedAt?: string;
  birthday?: string;
  [key: string]: any;
}

interface AirtableUpdate {
  id: string;
  fields: {
    "Address Line1"?: string;
    "Address Line2"?: string;
    "Address City"?: string;
    "Address State"?: string;
    "Address Zip Code"?: string;
    "Address Country"?: string;
    Birthday?: string;
    "Auto-assigned an address?": "Auto-assigned" | "Manually assigned";
  };
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };

  let allRecords: AirtableRecord[] = [];
  let offset: string | null = null;

  do {
    const params = new URLSearchParams();
    if (offset) {
      params.append("offset", offset);
    }

    const response = await fetch(`${url}?${params}`, { headers });
    const data = await response.json();

    if (data.records) {
      allRecords = allRecords.concat(data.records);
    }

    offset = data.offset;
  } while (offset);

  return allRecords;
}

async function fetchLoopsContactByEmail(
  email: string,
): Promise<LoopsContact[]> {
  const encodedEmail = encodeURIComponent(email);
  const url = `${LOOPS_API_BASE_URL}/contacts/find?email=${encodedEmail}`;
  const headers = {
    Authorization: `Bearer ${LOOPS_API_KEY}`,
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch Loops contact for ${email}: ${response.status}`,
      );
      return [];
    }

    const data = await response.json();

    // API returns an array of contacts
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching Loops contact for ${email}:`, error);
    return [];
  }
}

function hasAddress(fields: any): boolean {
  return !!(
    fields["Address Line1"] ||
    fields["Address City"] ||
    fields["Address State"] ||
    fields["Address Zip Code"] ||
    fields["Address Country"]
  );
}

function extractAddressFromLoops(contacts: LoopsContact[]): {
  address: Partial<AirtableUpdate["fields"]> | null;
  hasLoopsAddress: boolean;
} {
  for (const contact of contacts) {
    if (
      contact.addressLine1 ||
      contact.addressCity ||
      contact.addressState ||
      contact.addressZipCode ||
      contact.addressCountry
    ) {
      return {
        address: {
          "Address Line1": contact.addressLine1,
          "Address Line2": contact.addressLine2,
          "Address City": contact.addressCity,
          "Address State": contact.addressState,
          "Address Zip Code": contact.addressZipCode,
          "Address Country": contact.addressCountry,
          Birthday: contact.birthday,
        },
        hasLoopsAddress: true,
      };
    }
  }

  for (const contact of contacts) {
    if (contact.birthday) {
      return {
        address: {
          Birthday: contact.birthday,
        },
        hasLoopsAddress: false,
      };
    }
  }

  return { address: null, hasLoopsAddress: false };
}

async function updateAirtableRecords(updates: AirtableUpdate[]): Promise<void> {
  if (updates.length === 0) return;

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };

  // airtable allows batch updates of up to 10 at a time
  const batchSize = 10;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          records: batch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `Failed to update batch ${i / batchSize + 1}:`,
          errorData,
        );
      } else {
        console.log(
          `Successfully updated batch ${i / batchSize + 1} (${batch.length} records)`,
        );
      }
    } catch (error) {
      console.error(`Error updating batch ${i / batchSize + 1}:`, error);
    }
  }
}

async function processAddresses() {
  console.log("Fetching ALL submissions from Airtable…");
  const records = await fetchAirtableRecords();
  console.log(`Found ${records.length} total submissions\n`);

  const updates: AirtableUpdate[] = [];
  const warnings: string[] = [];
  let autoAssignedCount = 0;
  let manuallyAssignedCount = 0;
  let noAddressCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    const email = record.fields["Email Normalised"] || record.fields["Email"];

    if (!email) {
      console.log(`Skipping record ${record.id} - no email found`);
      skippedCount++;
      continue;
    }

    console.log(`Processing: ${email}`);

    const hasAirtableAddress = hasAddress(record.fields);

    const loopsContacts = await fetchLoopsContactByEmail(email);

    if (loopsContacts.length === 0) {
      console.log(`  No Loops contacts found for ${email}`);

      if (!hasAirtableAddress) {
        warnings.push(
          `⚠️  ${email} (ID: ${record.id}) - No address in Airtable or Loops`,
        );
        noAddressCount++;
      } else {
        console.log(
          `  Has Airtable address but no Loops contact - marking as manually assigned`,
        );
        updates.push({
          id: record.id,
          fields: {
            "Auto-assigned an address?": "Manually assigned",
          },
        });
        manuallyAssignedCount++;
      }
      continue;
    }

    console.log(`  Found ${loopsContacts.length} Loops contact(s)`);

    const { address, hasLoopsAddress } = extractAddressFromLoops(loopsContacts);

    if (!hasLoopsAddress && !hasAirtableAddress) {
      warnings.push(
        `⚠️  ${email} (ID: ${record.id}) - No address found in Loops or Airtable`,
      );
      noAddressCount++;
      continue;
    }

    if (hasAirtableAddress) {
      console.log(
        `  Has existing Airtable address - marking as manually assigned`,
      );

      const updateFields: any = {
        "Auto-assigned an address?": "Manually assigned",
      };

      if (address?.Birthday && !record.fields.Birthday) {
        updateFields.Birthday = address.Birthday;
        console.log(`  Adding birthday from Loops: ${address.Birthday}`);
      }

      updates.push({
        id: record.id,
        fields: updateFields,
      });
      manuallyAssignedCount++;
    } else if (hasLoopsAddress && address) {
      console.log(`  Auto-assigning address from Loops`);
      console.log(`    Line1: ${address["Address Line1"] || "N/A"}`);
      console.log(`    City: ${address["Address City"] || "N/A"}`);
      console.log(`    State: ${address["Address State"] || "N/A"}`);
      console.log(`    Zip: ${address["Address Zip Code"] || "N/A"}`);

      updates.push({
        id: record.id,
        fields: {
          ...address,
          "Auto-assigned an address?": "Auto-assigned",
        },
      });
      autoAssignedCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (updates.length > 0) {
    console.log(`\nUpdating ${updates.length} Airtable records...`);
    await updateAirtableRecords(updates);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total records processed: ${records.length}`);
  console.log(`Records skipped (no email): ${skippedCount}`);
  console.log(`Auto-assigned addresses: ${autoAssignedCount}`);
  console.log(`Manually assigned addresses: ${manuallyAssignedCount}`);
  console.log(`No address found: ${noAddressCount}`);
  console.log(`Total updates: ${updates.length}`);

  if (warnings.length > 0) {
    console.log("\n=== WARNINGS ===");
    console.log("The following users have no address data anywhere:");
    warnings.forEach((warning) => console.log(warning));
  }
}

async function main() {
  try {
    if (!LOOPS_API_KEY) {
      throw new Error("LOOPS_API_KEY environment variable is not set");
    }

    if (!AIRTABLE_API_KEY) {
      throw new Error("AIRTABLE_API_KEY environment variable is not set");
    }

    await processAddresses();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
