import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { AppError, wrap } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();

const SORTS: Record<string, string> = {
  newest: 'created_at DESC',
  price_asc: 'price_inr ASC',
  price_desc: 'price_inr DESC',
  duration: 'duration_days ASC',
};

// GET /api/packages?q=gulmarg&minPrice=5000&maxPrice=20000&sort=price_asc
router.get('/', wrap(async (req, res) => {
  const where = ['is_active = 1'];
  const params: (string | number)[] = [];
  const { q, minPrice, maxPrice, sort } = req.query;
  if (typeof q === 'string' && q.trim()) {
    where.push('(title LIKE ? OR destination LIKE ?)');
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  if (minPrice && !isNaN(Number(minPrice))) { where.push('price_inr >= ?'); params.push(Number(minPrice)); }
  if (maxPrice && !isNaN(Number(maxPrice))) { where.push('price_inr <= ?'); params.push(Number(maxPrice)); }
  const order = SORTS[String(sort)] ?? SORTS.newest; // whitelist: never put raw user input in ORDER BY
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM packages WHERE ${where.join(' AND ')} ORDER BY ${order}`, params);
  res.json(rows);
}));

router.get('/:slug', wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM packages WHERE slug = ? AND is_active = 1', [req.params.slug]);
  if (!rows[0]) throw new AppError(404, 'Package not found');
  res.json(rows[0]);
}));

// How many seats are left for a package on a date
router.get('/:id/availability', wrap(async (req, res) => {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT daily_capacity FROM packages WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!rows[0]) throw new AppError(404, 'Package not found');
  const [taken] = await pool.query<RowDataPacket[]>(
    "SELECT COALESCE(SUM(guests), 0) AS seats FROM bookings WHERE package_id = ? AND travel_date = ? AND status <> 'cancelled'",
    [req.params.id, date]);
  const capacity = rows[0].daily_capacity as number;
  res.json({ capacity, left: Math.max(0, capacity - Number(taken[0].seats)) });
}));

const packageSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  destination: z.string().min(2).max(80),
  description: z.string().min(10),
  duration_days: z.number().int().min(1).max(30),
  price_inr: z.number().int().min(1),
  max_guests: z.number().int().min(1).max(50),
  image_url: z.string().max(255).optional(),
});

router.post('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const p = packageSchema.parse(req.body);
  const [r] = await pool.query<ResultSetHeader>(
    `INSERT INTO packages (title, slug, destination, description, duration_days, price_inr, max_guests, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.title, p.slug, p.destination, p.description, p.duration_days, p.price_inr, p.max_guests, p.image_url ?? null]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const p = packageSchema.parse(req.body);
  const [r] = await pool.query<ResultSetHeader>(
    `UPDATE packages SET title=?, slug=?, destination=?, description=?, duration_days=?, price_inr=?, max_guests=?, image_url=?
     WHERE id=?`,
    [p.title, p.slug, p.destination, p.description, p.duration_days, p.price_inr, p.max_guests, p.image_url ?? null, req.params.id]);
  if (!r.affectedRows) throw new AppError(404, 'Package not found');
  res.json({ ok: true });
}));

// Soft delete keeps old bookings valid.
router.delete('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  await pool.query('UPDATE packages SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;
