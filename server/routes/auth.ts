import { Router } from 'express';
import { AuthService } from '../auth';
import { storage } from '../storage';
// Removed loginRateLimit to avoid 429 errors on frontend
import { loginSchema, createUserSchema, resetPasswordSchema, updateUserSchema } from '@shared/schema';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', async (req, res) => {
  try {
    // Support both 'login' and 'username' fields for backwards compatibility
    const body = { ...req.body };
    if (body.username && !body.login) {
      body.login = body.username;
    }
    
    // Validate request body
    const loginData = loginSchema.parse(body);
    
    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Attempt login
    const result = await AuthService.login(loginData, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json({
        error: {
          code: result.requires_mfa ? 'MFA_REQUIRED' : 'LOGIN_FAILED',
          message: result.error,
          requires_mfa: result.requires_mfa,
          locked_until: result.locked_until
        }
      });
    }

    // Set refresh token as HTTP-only cookie
    res.cookie('refresh_token', result.tokens!.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    // Return access token and user info
    res.json({
      access_token: result.tokens!.access_token,
      expires_in: result.tokens!.expires_in,
      user: result.user
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token from cookie
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token required'
        }
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await AuthService.refreshToken(refreshToken, ipAddress);

    if (!result.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refresh_token');
      
      return res.status(401).json({
        error: {
          code: 'REFRESH_FAILED',
          message: result.error
        }
      });
    }

    res.json({
      access_token: result.tokens!.access_token,
      expires_in: result.tokens!.expires_in,
      user: result.user
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /auth/logout
 * Logout from current session
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    res.status(204).end();

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout from all sessions (requires authentication)
 */
router.post('/logout-all', async (req, res) => {
  try {
    // Get user ID from access token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

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
          message: 'Invalid access token'
        }
      });
    }

    await AuthService.logoutAll(decoded.user_id);

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    res.status(204).end();

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * GET /me
 * Get current user profile (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

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
          message: 'Invalid access token'
        }
      });
    }

    // Get user details
    const user = await storage.getUserById(decoded.user_id);
    if (!user || user.is_blocked) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or blocked'
        }
      });
    }

    res.json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        mfa_enabled: user.mfa_enabled,
        last_login_at: user.last_login_at
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

export default router;