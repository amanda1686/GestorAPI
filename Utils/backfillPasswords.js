import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomBytes, pbkdf2Sync } from 'crypto';

const ITER = 100000;
const KEY_LEN = 32;
const hashPassword = (plain) => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(plain, salt, ITER, KEY_LEN, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const main = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await conn.execute(
    'SELECT IdEjerciente, Num_api FROM ejercientes WHERE contrasena IS NULL AND Num_api IS NOT NULL'
  );

  for (const { IdEjerciente, Num_api } of rows) {
    const plain = String(Num_api);
    const hashed = hashPassword(plain);
    await conn.execute(
      'UPDATE ejercientes SET contrasena = ? WHERE IdEjerciente = ?',
      [hashed, IdEjerciente]
    );
  }

  await conn.end();
  console.log('Contraseñas actualizadas.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
