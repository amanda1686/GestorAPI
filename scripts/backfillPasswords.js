import "dotenv/config";
import mysql from "mysql2/promise";
import { randomBytes, pbkdf2Sync } from "crypto";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_DIGEST = "sha512";

function hashPassword(plain) {
  if (!plain) {
    throw new Error("Password value is empty or invalid");
  }
  const salt = randomBytes(PBKDF2_SALT_SIZE).toString("hex");
  const hash = pbkdf2Sync(String(plain), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await connection.execute(
      "SELECT IdEjerciente, Num_api FROM ejercientes WHERE contrasena IS NULL"
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("No pending passwords to update.");
      return;
    }

    for (const row of rows) {
      const { IdEjerciente, Num_api } = row;
      const base = Num_api !== null && Num_api !== undefined ? String(Num_api).trim() : "";

      if (!base) {
        console.warn(`Skipping IdEjerciente ${IdEjerciente}: Num_api empty, set manually.`);
        continue;
      }

      const hashed = hashPassword(base);
      await connection.execute(
        "UPDATE ejercientes SET contrasena = ? WHERE IdEjerciente = ?",
        [hashed, IdEjerciente]
      );
      console.log(`Updated password for IdEjerciente ${IdEjerciente}`);
    }
  } finally {
    await connection.end();
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Password backfill error:", err);
  process.exit(1);
});
