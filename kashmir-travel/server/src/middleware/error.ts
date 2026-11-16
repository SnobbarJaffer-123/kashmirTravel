import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Express 4 does not catch errors from async handlers, so wrap them.
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid input', details: err.flatten().fieldErrors });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}
