import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const signAccessToken = (user) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  return jwt.sign({ sub: String(user._id), role: user.role, tv: user.tokenVersion }, secret, { expiresIn });
};

export const login = async (req, res) => {
  // Updated: Sub-admins must login with username; Root can continue with email.
  const { email, identifier, password } = req.body;
  const rawIdentifier = (identifier || email || '').toString();
  if (!rawIdentifier || !password) {
    return res.status(400).json({ success: false, message: 'Username/email and password are required' });
  }

  const normalized = rawIdentifier.toLowerCase().trim();
  // Try username first
  let user = await User.findOne({ username: normalized });
  if (!user) {
    // Fallback to email (for root or legacy accounts). If identifier is an email.
    if (rawIdentifier.includes('@')) {
      user = await User.findOne({ email: normalized });
    }
  }
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (!user.isActive) return res.status(403).json({ success: false, message: 'Account disabled' });

  // Enforce: sub-admins cannot login using email; must use username
  if (user.role === 'sub' && rawIdentifier.includes('@')) {
    return res.status(400).json({ success: false, message: 'Sub-admins must login with username' });
  }

  const ok = user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: String(user._id),
        email: user.email,
        username: user.username || null,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: !!user.mustChangePassword,
        ...(user.role === 'sub' ? {
          branchId: user.branchId ? String(user.branchId) : null,
          branchName: user.branchName || null,
          branchWaLink: user.branchWaLink || null
        } : {})
      },
      accessToken,
      sessionActive: true,
      isActiveEffective: !!user.isActive,
      requirePasswordChange: !!user.mustChangePassword
    }
  });
};

// First-time password change for any user who is forced to update password on first login
export const firstTimeChangePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password, new password and confirm new password are required'
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match'
    });
  }

  const user = await User.findById(req.user.id).select('_id passwordHash tokenVersion mustChangePassword');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!user.mustChangePassword) {
    return res.status(400).json({
      success: false,
      message: 'Password change is not required'
    });
  }

  const ok = user.passwordHash && (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid current password' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  user.tokenVersion += 1; // logout everywhere
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Password updated successfully. Please login again.'
  });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user.id).select('_id email username role isActive lastLoginAt branchId branchName branchWaLink');
  return res.status(200).json({
    success: true,
    message: 'Profile',
    data: {
      id: String(user._id),
      email: user.email,
      username: user.username || null,
      role: user.role,
      isActive: user.isActive,
      sessionActive: true,
      isActiveEffective: !!user.isActive,
      lastLoginAt: user.lastLoginAt || null,
      ...(user.role === 'sub' ? {
        branchId: user.branchId ? String(user.branchId) : null,
        branchName: user.branchName || null,
        branchWaLink: user.branchWaLink || null
      } : {})
    }
  });
};

export const logout = async (req, res) => {
  const user = await User.findById(req.user.id).select('_id tokenVersion');
  if (user) {
    user.tokenVersion += 1; // invalidate previously issued tokens
    user.lastLogoutAt = new Date();
    await user.save();
  }
  return res.status(200).json({ success: true, message: 'Logged out', data: { sessionActive: false } });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }

  const user = await User.findById(req.user.id).select('_id passwordHash tokenVersion role');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role !== 'root') return res.status(403).json({ success: false, message: 'Root access required' });

  const ok = user.passwordHash && (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid current password' });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1; // logout everywhere
  await user.save();

  return res.status(200).json({ success: true, message: 'Password updated. Please login again.' });
};

export const changeEmail = async (req, res) => {
  const { newEmail, password } = req.body;
  if (!newEmail || !password) {
    return res.status(400).json({ success: false, message: 'New email and password are required' });
  }

  const user = await User.findById(req.user.id).select('_id email passwordHash role');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role !== 'root') return res.status(403).json({ success: false, message: 'Root access required' });

  const ok = user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid password' });

  const normalized = newEmail.toLowerCase().trim();
  const exists = await User.findOne({ email: normalized, _id: { $ne: user._id } });
  if (exists) return res.status(409).json({ success: false, message: 'Email already in use' });

  user.email = normalized;
  await user.save();

  return res.status(200).json({ success: true, message: 'Email updated', data: { email: user.email } });
};

// Forgot Password - Email bhejta hai
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'root' });
    
    const successMessage = 'If this email is registered, you will receive a password reset link';
    
    if (!user) {
      return res.status(200).json({ success: true, message: successMessage });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Development: Log token in console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🔑 Password Reset Token (Copy this for testing):');
      console.log('Token:', resetToken);
      console.log('Use in: POST /api/auth/reset-password');
      console.log('Body: { "token": "' + resetToken + '", "newPassword": "YourNewPass@123" }\n');
    }

    try {
      await sendPasswordResetEmail(user.email, resetToken, 'Admin');
      // In development, keep token in database even after email sent (for testing)
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Email sent successfully. Token kept in database for testing.');
      }
      return res.status(200).json({ success: true, message: successMessage });
    } catch (emailError) {
      // In development, keep token even if email fails (for testing via console)
      if (process.env.NODE_ENV === 'production') {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return res.status(500).json({ success: false, message: 'Failed to send reset email' });
      }
      // Development: return success with token in console
      console.log('⚠️ Email failed but token saved for testing');
      return res.status(200).json({ success: true, message: 'Token generated (check console)' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

// Reset Password - Token verify karke password update karta hai
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Reset Password Debug:');
      console.log('Token received:', token.substring(0, 20) + '...');
      console.log('Hashed token:', hashedToken.substring(0, 20) + '...');
    }
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      role: 'root'
    });

    if (!user) {
      console.log('❌ User not found with token. Possible reasons:');
      console.log('  - Token invalid or already used');
      console.log('  - Token expired (> 1 hour)');
      console.log('  - User role is not "root"');
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful. Please login' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};
//testing by ashish

