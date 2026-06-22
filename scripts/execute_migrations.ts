import { Client } from "pg";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
});

async function run() {
  await client.connect();
  console.log("Connected to db");
  
  const files = [
    "./database/migrations/019_add_login_settings.sql",
    "./database/migrations/020_add_support_email.sql",
    "./database/migrations/027_secure_invites_policy.sql",
    "./database/migrations/028_clean_up_and_secure_invites.sql"
  ];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log("Executing", file);
      const sql = fs.readFileSync(file, "utf8");
      try {
         await client.query(sql);
      } catch (err) {
         console.warn("Failed to execute", file, err.message);
      }
    }
  }
  
  await client.end();
}

run();
