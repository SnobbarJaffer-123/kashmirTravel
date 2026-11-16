import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { AppError, wrap } from '../middleware/error';
import { requireAuth, signToken } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string() });

router.post('/register', wrap(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const [exists] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) throw new AppError(409, 'Email already registered');
  const hash = await bcrypt.hash(password, 12);
  const [r] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
  const user = { id: r.insertId, role: 'user' as const };
  res.status(201).json({ token: signToken(user), user: { ...user, name, email } });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
  const u = rows[0];
  // Same message for unknown email and wrong password, so attackers can't tell which emails exist.
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw new AppError(401, 'Wrong email or password');
  res.json({ token: signToken({ id: u.id, role: u.role }), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, email, role FROM users WHERE id = ?', [req.user!.id]);
  if (!rows[0]) throw new AppError(404, 'User not found');
  res.json(rows[0]);
}));

export default router;
