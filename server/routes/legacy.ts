import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import bcrypt from 'bcrypt';

const router = Router();

// Legacy authentication middleware for backwards compatibility
const legacyRequireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

/**
 * Legacy login endpoint for backwards compatibility
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Try to find user by username (legacy) or login (new)
    let user = await storage.getUserByUsername(username);
    if (!user) {
      user = await storage.getUserByLogin(username);
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password against both legacy and new fields
    let passwordValid = false;
    if (user.password) {
      // Legacy bcrypt password
      passwordValid = await bcrypt.compare(password, user.password);
    } else if (user.password_hash) {
      // New argon2 password - for now use bcrypt fallback
      passwordValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    // Store user in session (legacy format)
    req.session.user = {
      id: user.id,
      username: user.username || user.login || '',
      name: user.name || '',
      role: user.role
    };

    res.json({
      user: {
        id: user.id,
        username: user.username || user.login || '',
        name: user.name || '',
        role: user.role
      },
      message: "Login successful"
    });

  } catch (error) {
    console.error('Legacy login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Legacy current user endpoint
 */
router.get('/auth/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({ user: req.session.user });
});

/**
 * Legacy logout endpoint
 */
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Logout successful" });
  });
});

export { router as legacyAuthRoutes, legacyRequireAuth };