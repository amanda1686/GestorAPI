import { randomBytes, pbkdf2Sync } from 'crypto';
import mysql from 'mysql2/promise';

const ITER = 100000;
const LEN = 32;
const config = { host, port, user, password, database };

const hashPassword = (plain) => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(plain, salt, ITER, LEN, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const main = async () => {
  const pool = await mysql.createPool(config);
  const [rows] = await pool.query(
    'SELECT IdEjerciente, Num_api FROM ejercientes WHERE contrasena IS NULL AND Num_api IS NOT NULL'
  );
  for (const row of rows) {
    const hashed = hashPassword(String(row.Num_api));
    await pool.query(
      'UPDATE ejercientes SET contrasena = ? WHERE IdEjerciente = ?',
      [hashed, row.IdEjerciente]
    );
  }
  await pool.end();
};

main().catch(console.error);
