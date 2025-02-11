import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const error: ApiError = new Error('Authentication token is required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    error.details = { reason: 'No token provided' };
    return next(error);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as {
      userId: string;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    const error: ApiError = new Error('Invalid authentication token');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    error.details = { reason: 'Token validation failed' };
    return next(error);
  }
};
