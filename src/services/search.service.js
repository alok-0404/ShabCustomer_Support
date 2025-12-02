/**
 * Search Service
 * Production version - Uses only database, no in-memory fallback
 */

import User from '../models/User.js';
import UserHitLog from '../models/UserHitLog.js';

// Force special link configuration
const FORCE_WA_LINK_URL = process.env.FORCE_WA_LINK_URL || 'https://wa.link/mydia99supportsite';
const FORCE_WA_LINK_FOR_USER_IDS = (process.env.FORCE_WA_LINK_FOR_USER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const shouldForceSpecialLink = (userId) => {
  return FORCE_WA_LINK_FOR_USER_IDS.includes(userId);
};

const normalizePhone = (phone) => (phone ? String(phone).replace(/\s+/g, '').trim() : '');

export const findUserWithBranch = async (userId, options = {}) => {
  const { requirePhone } = options;
  // Search in database
  const dbUser = await User.findOne({ userId }).populate('branchId');
  
  if (!dbUser) {
    // User not found in database
    return null;
  }

  if (requirePhone) {
    const normalizedExpectedPhone = normalizePhone(requirePhone);
    const normalizedUserPhone = normalizePhone(dbUser.phone);
    if (!normalizedUserPhone || normalizedUserPhone !== normalizedExpectedPhone) {
      return null;
    }
  }

  let waLink = '';
  let branchName = '';

  // Handle different roles
  if (dbUser.role === 'client' || dbUser.role === 'sub') {
    // For clients and subadmins, use their assigned branch waLink
    // Client inherits from their parent SubAdmin's branch
    waLink = dbUser.branchWaLink || dbUser.branchId?.waLink || '';
    branchName = dbUser.branchName || dbUser.branchId?.branchName || '';
  } else if (dbUser.role === 'root') {
    // For root, use default or branch link if available
    waLink = dbUser.branchId?.waLink || process.env.DEFAULT_WA_LINK || '';
    branchName = dbUser.branchId?.branchName || 'Root';
  } else {
    // Fallback
    waLink = dbUser.branchId?.waLink || '';
    branchName = dbUser.branchId?.branchName || '';
  }

  // Check if special link should be forced
  if (shouldForceSpecialLink(userId)) {
    waLink = FORCE_WA_LINK_URL;
  }

  // Log the hit
  try {
    await UserHitLog.create({ userId, waLink });
  } catch (e) {}

  return {
    userId: dbUser.userId,
    branchName,
    waLink
  };
};

export const getRedirectWaLink = async (userId, options = {}) => {
  const found = await findUserWithBranch(userId, options);
  if (!found) return null;
  return found.waLink;
};


