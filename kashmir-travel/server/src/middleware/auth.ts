import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { AppError } from './error';

export type AuthUser = { id: number; role: 'user' | 'admin' };

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Please log in'));
  try {
    const p = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
    req.user = { id: p.id, role: p.role };
    next();
  } catch {
    next(new AppError(401, 'Session expired, please log in again'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(new AppError(403, 'Admins only'));
  next();
}
