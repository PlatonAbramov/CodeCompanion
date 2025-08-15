import { Router } from 'express';
import { AuthService } from '../auth';
import { storage } from '../storage';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { createUserSchema, resetPasswordSchema, updateUserSchema } from '@shared/schema';

const router = Router();

// Apply authentication and admin requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * POST /admin/users
 * Create new user (admin only)
 */
router.post('/users', async (req, res) => {
  try {
    const userData = createUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await storage.getUserByLogin(userData.login);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this login already exists'
        }
      });
    }

    // Create user
    const newUser = await AuthService.createUser(userData);

    res.status(201).json({
      user: {
        id: newUser.id,
        login: newUser.login,
        name: newUser.name,
        role: newUser.role,
        mfa_enabled: newUser.mfa_enabled,
        is_blocked: newUser.is_blocked,
        created_at: newUser.created_at
      }
    });

  } catch (error: any) {
    console.error('Create user error:', error);
    
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
 * GET /admin/users
 * Get all users with search/filter (admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const { search, status, role } = req.query;

    // For now, get all users (can add filtering later)
    const users = await storage.getAllUsers();

    // Filter results based on query parameters
    let filteredUsers = users;

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.login?.toLowerCase().includes(searchTerm) ||
        user.name?.toLowerCase().includes(searchTerm)
      );
    }

    if (status) {
      if (status === 'blocked') {
        filteredUsers = filteredUsers.filter(user => user.is_blocked);
      } else if (status === 'active') {
        filteredUsers = filteredUsers.filter(user => !user.is_blocked);
      }
    }

    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    // Return user data without sensitive information
    const safeUsers = filteredUsers.map(user => ({
      id: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
      mfa_enabled: user.mfa_enabled,
      is_blocked: user.is_blocked,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    }));

    res.json({ users: safeUsers });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /admin/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = resetPasswordSchema.parse({ 
      user_id: id, 
      new_password: req.body.new_password 
    });

    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(new_password);

    // Update user password
    await storage.updateUserPassword(id, newPasswordHash);

    // Revoke all user sessions (force re-login)
    await AuthService.logoutAll(id);

    res.json({
      message: 'Password reset successfully. User must login again.'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    
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
 * POST /admin/users/:id/block
 * Block user (admin only)
 */
router.post('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Block user
    await storage.updateUserBlockStatus(id, true);

    // Revoke all user sessions
    await AuthService.logoutAll(id);

    res.json({
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /admin/users/:id/unblock
 * Unblock user (admin only)
 */
router.post('/users/:id/unblock', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Unblock user
    await storage.updateUserBlockStatus(id, false);

    res.json({
      message: 'User unblocked successfully'
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * POST /admin/users/:id/logout-all
 * Force logout user from all devices (admin only)
 */
router.post('/users/:id/logout-all', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Revoke all user sessions
    await AuthService.logoutAll(id);

    res.json({
      message: 'User logged out from all devices'
    });

  } catch (error) {
    console.error('Logout all user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * PATCH /admin/users/:id
 * Update user details (admin only)
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateUserSchema.parse(req.body);

    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user
    await storage.updateUserDetails(id, updates);

    // Get updated user
    const updatedUser = await storage.getUserById(id);

    res.json({
      user: {
        id: updatedUser!.id,
        login: updatedUser!.login,
        name: updatedUser!.name,
        role: updatedUser!.role,
        mfa_enabled: updatedUser!.mfa_enabled,
        is_blocked: updatedUser!.is_blocked,
        updated_at: updatedUser!.updated_at
      }
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    
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

export default router;