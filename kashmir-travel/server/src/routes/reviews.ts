import { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { AppError, wrap } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/package/:id', wrap(async (req, res) => {
  const [reviews] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.package_id = ? ORDER BY r.created_at DESC`, [req.params.id]);
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  res.json({ average: Math.round(average * 10) / 10, count, reviews });
}));

const reviewSchema = z.object({
  packageId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

router.post('/', requireAuth, wrap(async (req, res) => {
  const b = reviewSchema.parse(req.body);
  const [ok] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM bookings WHERE user_id = ? AND package_id = ? AND status = 'confirmed' LIMIT 1",
    [req.user!.id, b.packageId]);
  if (!ok.length) throw new AppError(403, 'Only travellers with a confirmed booking can review this package');
  // One review per user per package: a second submit updates the first
  await pool.query(
    `INSERT INTO reviews (user_id, package_id, rating, comment) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
    [req.user!.id, b.packageId, b.rating, b.comment ?? null]);
  res.status(201).json({ ok: true });
}));

export default router;