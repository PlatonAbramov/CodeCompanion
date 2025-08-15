import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth';
import rateLimit from 'express-rate-limit';

// Extend Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        login: string;
        role: string;
        name?: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT access token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: { 
        code: 'NO_TOKEN', 
        message: 'Access token required' 
      } 
    });
  }

  const decoded = AuthService.verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: { 
        code: 'INVALID_TOKEN', 
        message: 'Invalid or expired access token' 
      } 
    });
  }

  req.user = {
    id: decoded.user_id,
    login: decoded.login,
    role: decoded.role,
  };

  next();
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: { 
        code: 'NOT_AUTHENTICATED', 
        message: 'Authentication required' 
      } 
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'director') {
    return res.status(403).json({ 
      error: { 
        code: 'INSUFFICIENT_PERMISSIONS', 
        message: 'Admin access required' 
      } 
    });
  }

  next();
};

/**
 * Middleware to require director role
 */
export const requireDirector = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: { 
        code: 'NOT_AUTHENTICATED', 
        message: 'Authentication required' 
      } 
    });
  }

  if (req.user.role !== 'director') {
    return res.status(403).json({ 
      error: { 
        code: 'INSUFFICIENT_PERMISSIONS', 
        message: 'Director access required' 
      } 
    });
  }

  next();
};

/**
 * Rate limiting for login attempts
 */
export const loginRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_LOGIN_PER_MIN || '5'), // limit each IP to 5 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful logins
  skipSuccessfulRequests: true,
  // Skip validation for development
  validate: false,
});

/**
 * General API rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many API requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip validation for development
  validate: false,
});

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );

  // Other security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * CORS middleware for development
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin || '')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};