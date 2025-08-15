import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage';
import type { LoginRequest, CreateUserRequest } from '@shared/schema';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'default-pepper-change-in-production';
const RATE_LIMIT_LOGIN_PER_MIN = parseInt(process.env.RATE_LIMIT_LOGIN_PER_MIN || '5');
const LOCK_THRESHOLD = parseInt(process.env.LOCK_THRESHOLD || '10');
const LOCK_TTL_MIN = parseInt(process.env.LOCK_TTL_MIN || '15');

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  tokens?: AuthTokens;
  error?: string;
  requires_mfa?: boolean;
  locked_until?: Date;
}

export class AuthService {
  /**
   * Hash password using Argon2id with salt and pepper
   */
  static async hashPassword(password: string): Promise<string> {
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await argon2.hash(pepperedPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verify password against hash in constant time
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const pepperedPassword = password + PASSWORD_PEPPER;
      return await argon2.verify(hash, pepperedPassword);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage (for refresh tokens)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token + PASSWORD_PEPPER).digest('hex');
  }

  /**
   * Hash IP address for storage
   */
  static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip + PASSWORD_PEPPER).digest('hex');
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(userId: string, login: string, role: string): string {
    return jwt.sign(
      { 
        user_id: userId, 
        login, 
        role,
        type: 'access'
      },
      JWT_SECRET,
      { 
        expiresIn: JWT_ACCESS_TTL,
        issuer: 'construction-app',
        audience: 'construction-app-users'
      }
    );
  }

  /**
   * Generate refresh token and store session
   */
  static async generateRefreshToken(
    userId: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<string> {
    const refreshToken = this.generateSecureToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const ipHash = ipAddress ? this.hashIp(ipAddress) : null;
    
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Store session
    await storage.createSession({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      user_agent: userAgent || null,
      ip_hash: ipHash,
      expires_at: expiresAt,
    });

    return refreshToken;
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'construction-app',
        audience: 'construction-app-users'
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is locked due to failed attempts
   */
  static async isUserLocked(login: string): Promise<{ locked: boolean; until?: Date }> {
    const cutoffTime = new Date(Date.now() - LOCK_TTL_MIN * 60 * 1000);
    const recentAttempts = await storage.getRecentLoginAttempts(login, cutoffTime);
    
    const failedAttempts = recentAttempts.filter(attempt => 
      attempt.result === 'failed' || attempt.result === 'locked'
    ).length;

    if (failedAttempts >= LOCK_THRESHOLD) {
      const lockUntil = new Date(Date.now() + LOCK_TTL_MIN * 60 * 1000);
      return { locked: true, until: lockUntil };
    }

    return { locked: false };
  }

  /**
   * Log login attempt
   */
  static async logLoginAttempt(
    userId: string | null,
    login: string,
    result: 'success' | 'failed' | 'locked' | 'blocked',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const ipHash = ipAddress ? this.hashIp(ipAddress) : '';
    
    await storage.createLoginAttempt({
      user_id: userId,
      login_attempted: login,
      result,
      ip_hash: ipHash,
      user_agent: userAgent || null,
    });
  }

  /**
   * Main login function
   */
  static async login(
    loginData: LoginRequest, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthResult> {
    const { login, password, mfa_code } = loginData;

    try {
      // Check if user is locked
      const lockStatus = await this.isUserLocked(login);
      if (lockStatus.locked) {
        await this.logLoginAttempt(null, login, 'locked', ipAddress, userAgent);
        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts',
          locked_until: lockStatus.until
        };
      }

      // Find user by login
      const user = await storage.getUserByLogin(login);
      if (!user) {
        // Same timing for security (anti-enumeration)
        await this.hashPassword('dummy-password');
        await this.logLoginAttempt(null, login, 'failed', ipAddress, userAgent);
        return {
          success: false,
          error: 'Invalid login or password'
        };
      }

      // Check if user is blocked
      if (user.is_blocked) {
        await this.logLoginAttempt(user.id, login, 'blocked', ipAddress, userAgent);
        return {
          success: false,
          error: 'Account is blocked. Contact administrator.'
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        await this.logLoginAttempt(user.id, login, 'failed', ipAddress, userAgent);
        return {
          success: false,
          error: 'Invalid login or password'
        };
      }

      // Check MFA if enabled
      if (user.mfa_enabled) {
        if (!mfa_code) {
          return {
            success: false,
            requires_mfa: true,
            error: 'MFA code required'
          };
        }

        const mfaValid = await this.verifyMfaCode(user.id, mfa_code);
        if (!mfaValid) {
          await this.logLoginAttempt(user.id, login, 'failed', ipAddress, userAgent);
          return {
            success: false,
            error: 'Invalid MFA code'
          };
        }
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id, user.login, user.role);
      const refreshToken = await this.generateRefreshToken(user.id, userAgent, ipAddress);

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Log successful login
      await this.logLoginAttempt(user.id, login, 'success', ipAddress, userAgent);

      // Calculate token expiry
      const decoded = jwt.decode(accessToken) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      return {
        success: true,
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          role: user.role,
          mfa_enabled: user.mfa_enabled
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string, ipAddress?: string): Promise<AuthResult> {
    try {
      const refreshTokenHash = this.hashToken(refreshToken);
      const session = await storage.getSessionByToken(refreshTokenHash);

      if (!session || session.revoked_at || session.expires_at < new Date()) {
        return {
          success: false,
          error: 'Invalid or expired refresh token'
        };
      }

      // Get user
      const user = await storage.getUserById(session.user_id);
      if (!user || user.is_blocked) {
        return {
          success: false,
          error: 'User not found or blocked'
        };
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user.id, user.login, user.role);

      // Update session last used
      await storage.updateSessionLastUsed(session.id);

      // Calculate token expiry
      const decoded = jwt.decode(accessToken) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      return {
        success: true,
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          role: user.role,
          mfa_enabled: user.mfa_enabled
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken, // Keep same refresh token
          expires_in: expiresIn
        }
      };

    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Logout (revoke refresh token)
   */
  static async logout(refreshToken: string): Promise<boolean> {
    try {
      const refreshTokenHash = this.hashToken(refreshToken);
      await storage.revokeSession(refreshTokenHash);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<boolean> {
    try {
      await storage.revokeAllUserSessions(userId);
      return true;
    } catch (error) {
      console.error('Logout all error:', error);
      return false;
    }
  }

  /**
   * Create new user (admin only)
   */
  static async createUser(userData: CreateUserRequest): Promise<any> {
    const passwordHash = await this.hashPassword(userData.password);
    
    return await storage.createSecureUser({
      login: userData.login,
      password_hash: passwordHash,
      password_algo: 'argon2id',
      name: userData.name || null,
      role: userData.role,
      mfa_enabled: userData.mfa_enabled,
    });
  }

  /**
   * Verify MFA code (placeholder - implement with speakeasy for TOTP)
   */
  static async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    // TODO: Implement TOTP verification with speakeasy
    // For now, accept any 6-digit code for testing
    return /^\d{6}$/.test(code);
  }
}