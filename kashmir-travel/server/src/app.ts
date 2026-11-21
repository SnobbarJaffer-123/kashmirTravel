import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './env';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import packageRoutes from './routes/packages';
import bookingRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);
