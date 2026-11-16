// Usage: npm run create-admin -- you@example.com YourStrongPassword "Your Name"
import bcrypt from 'bcryptjs';
import { pool } from '../db';

async function main() {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <email> <password (8+ chars)> [name]');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin') ON DUPLICATE KEY UPDATE role='admin', password_hash=VALUES(password_hash)",
    [name, email.toLowerCase(), hash]);
  console.log('Admin ready:', email);
  await pool.end();
}
main();
