import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { AppError, wrap } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const bookingSchema = z.object({
  packageId: z.number().int().positive(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50),
});

router.post('/', wrap(async (req, res) => {
  const b = bookingSchema.parse(req.body);
  if (new Date(b.travelDate) <= new Date()) throw new AppError(400, 'Travel date must be in the future');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // FOR UPDATE locks this package's row until we commit. Anyone else booking
    // the same package waits here, so the seat count below can't go stale.
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT id, price_inr, max_guests, daily_capacity FROM packages WHERE id = ? AND is_active = 1 FOR UPDATE',
      [b.packageId]);
    const pkg = rows[0];
    if (!pkg) throw new AppError(404, 'Package not found');
    if (b.guests > pkg.max_guests) throw new AppError(400, `Maximum ${pkg.max_guests} guests per booking`);

    const [taken] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(guests), 0) AS seats FROM bookings WHERE package_id = ? AND travel_date = ? AND status <> 'cancelled'",
      [b.packageId, b.travelDate]);
    const left = pkg.daily_capacity - Number(taken[0].seats);
    if (b.guests > left) {
      throw new AppError(409, left > 0 ? `Only ${left} seats left on that date` : 'That date is fully booked');
    }

    const total = pkg.price_inr * b.guests; // price always comes from the server
    const [r] = await conn.query<ResultSetHeader>(
      'INSERT INTO bookings (user_id, package_id, travel_date, guests, total_inr) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, b.packageId, b.travelDate, b.guests, total]);

    await conn.commit();
    res.status(201).json({ id: r.insertId, total_inr: total, status: 'pending' });
  } catch (err) {
    await conn.rollback(); // undo everything if any step failed
    throw err;
  } finally {
    conn.release();        // always give the connection back to the pool
  }
}));

router.get('/mine', wrap(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.travel_date, b.guests, b.total_inr, b.status, b.created_at, p.title, p.slug
     FROM bookings b JOIN packages p ON p.id = b.package_id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`, [req.user!.id]);
  res.json(rows);
}));

router.patch('/:id/cancel', wrap(async (req, res) => {
  const [r] = await pool.query<ResultSetHeader>(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status <> 'cancelled'",
    [req.params.id, req.user!.id]);
  if (!r.affectedRows) throw new AppError(404, 'Booking not found');
  res.json({ ok: true });
}));

export default router;
