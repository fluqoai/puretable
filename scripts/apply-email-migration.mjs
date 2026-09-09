// Applies the email delivery migration through the Supabase Management API.
// Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID; stores no credentials.
import { readFileSync } from "node:fs";

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_ID;
if (!accessToken || !projectRef) {
  throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID are required");
}

const version = "20260909122358";
const name = "email_notification_delivery";
const sql = readFileSync(`supabase/migrations/${version}_${name}.sql`, "utf8");
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

async function query(statement) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: statement }),
  });
  if (!response.ok) {
    throw new Error(
      `Supabase query failed (${response.status}): ${(await response.text()).slice(0, 300)}`,
    );
  }
}

await query(sql);
await query(
  `insert into supabase_migrations.schema_migrations(version, name, statements)
   values ('${version}', '${name}', array[$migration$${sql}$migration$])
   on conflict (version) do nothing`,
);
console.log("PASS: email delivery migration applied over HTTPS.");
