import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Authentication endpoints rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 login attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts, please try again later.',
      details: {
        retryAfter: '15 minutes'
      }
    }
  }
});

// Regular endpoints rate limit
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
      details: {
        retryAfter: '60 seconds'
      }
    }
  }
});

// Email template operations rate limit
const emailTemplateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many email template operations, please try again later.',
      details: {
        retryAfter: '60 seconds'
      }
    }
  }
});

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  
  if (path.startsWith('/auth/')) {
    return authLimiter(req, res, next);
  } else if (path.startsWith('/email-templates/')) {
    return emailTemplateLimiter(req, res, next);
  } else {
    return standardLimiter(req, res, next);
  }
};
