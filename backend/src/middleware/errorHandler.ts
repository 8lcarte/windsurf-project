import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  code?: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || {};

  // Log error for debugging (not in production)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      code: errorCode,
      message,
      details,
      stack: err.stack
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details
    }
  });
};
