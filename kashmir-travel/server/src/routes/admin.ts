import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { AppError, wrap } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', wrap(async (_req, res) => {
  const [monthly] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS bookings, SUM(total_inr) AS revenue
     FROM bookings WHERE status <> 'cancelled' GROUP BY month ORDER BY month`);
  const [top] = await pool.query<RowDataPacket[]>(
    `SELECT p.title, COUNT(*) AS bookings FROM bookings b JOIN packages p ON p.id = b.package_id
     WHERE b.status <> 'cancelled' GROUP BY p.id, p.title ORDER BY bookings DESC LIMIT 5`);
  res.json({ monthly, topPackages: top });
}));

router.get('/bookings', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.*, u.name AS user_name, u.email, p.title FROM bookings b
     JOIN users u ON u.id = b.user_id JOIN packages p ON p.id = b.package_id ORDER BY b.created_at DESC`);
  res.json(rows);
}));

// NEW: admin changes a booking's status
router.patch('/bookings/:id/status', wrap(async (req, res) => {
  const { status } = z.object({ status: z.enum(['pending', 'confirmed', 'cancelled']) }).parse(req.body);
  const [r] = await pool.query<ResultSetHeader>('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!r.affectedRows) throw new AppError(404, 'Booking not found');
  res.json({ ok: true });
}));

router.get('/reviews', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name, p.title
     FROM reviews r JOIN users u ON u.id = r.user_id JOIN packages p ON p.id = r.package_id
     ORDER BY r.created_at DESC`);
  res.json(rows);
}));

// All packages, including hidden ones
router.get('/packages', wrap(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM packages ORDER BY created_at DESC');
  res.json(rows);
}));

// Hide or restore a package
router.patch('/packages/:id/active', wrap(async (req, res) => {
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  const [r] = await pool.query<ResultSetHeader>('UPDATE packages SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id]);
  if (!r.affectedRows) throw new AppError(404, 'Package not found');
  res.json({ ok: true });
}));

export default router;