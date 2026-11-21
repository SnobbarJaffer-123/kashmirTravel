import crypto from 'crypto';
import { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db';
import { env } from '../env';
import { AppError, wrap } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function needKeys() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new AppError(503, 'Payments are not configured yet');
}

// 1) Create a Razorpay order for one of my pending bookings
router.post('/order', wrap(async (req, res) => {
  needKeys();
  const { bookingId } = z.object({ bookingId: z.number().int().positive() }).parse(req.body);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, total_inr, status FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.user!.id]);
  const booking = rows[0];
  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.status !== 'pending') throw new AppError(400, 'Only pending bookings can be paid');

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    // Razorpay amounts are in paise: rupees x 100. The amount comes from our database, not the browser.
    body: JSON.stringify({ amount: booking.total_inr * 100, currency: 'INR', receipt: `booking_${booking.id}` }),
  });
  if (!rz.ok) { console.error(await rz.text()); throw new AppError(502, 'Could not start the payment'); }
  const order = (await rz.json()) as { id: string };

  await pool.query(
    "INSERT INTO payments (booking_id, provider, provider_ref, amount_inr) VALUES (?, 'razorpay', ?, ?)",
    [booking.id, order.id, booking.total_inr]);
  res.json({ orderId: order.id, amount: booking.total_inr * 100, keyId: env.RAZORPAY_KEY_ID });
}));

// 2) Verify the payment signature, then confirm the booking
const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

router.post('/verify', wrap(async (req, res) => {
  needKeys();
  const v = verifySchema.parse(req.body);

  // Razorpay signs "orderId|paymentId" with our secret. Only a real payment can produce a matching signature.
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${v.razorpay_order_id}|${v.razorpay_payment_id}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v.razorpay_signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new AppError(400, 'Payment verification failed');

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.booking_id, p.status, b.user_id FROM payments p JOIN bookings b ON b.id = p.booking_id
     WHERE p.provider = 'razorpay' AND p.provider_ref = ?`, [v.razorpay_order_id]);
  const pay = rows[0];
  if (!pay || pay.user_id !== req.user!.id) throw new AppError(404, 'Payment not found');
  if (pay.status === 'paid') return res.json({ ok: true }); // safe to call twice

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE payments SET status = 'paid', provider_payment_id = ? WHERE id = ?", [v.razorpay_payment_id, pay.id]);
    await conn.query("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'", [pay.booking_id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ ok: true });
}));

export default router;