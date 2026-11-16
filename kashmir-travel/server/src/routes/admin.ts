import { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { wrap } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireAdmin);

// Data for your dashboard charts: bookings and revenue per month.
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

export default router;
