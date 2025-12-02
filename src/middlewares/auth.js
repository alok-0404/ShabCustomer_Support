import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'JWT secret not configured' });
    }

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).select('_id email role isActive tokenVersion');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token user' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    // Optional tokenVersion check if included in token
    if (payload.tv != null && payload.tv !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token invalidated' });
    }

    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const requireRoot = (req, res, next) => {
  if (!req.user || req.user.role !== 'root') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

export const requireSubAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'sub') {
    return res.status(403).json({ success: false, message: 'Sub-admin access required' });
  }
  next();
};

export const requireSubAdminOrRoot = (req, res, next) => {
  if (!req.user || (req.user.role !== 'sub' && req.user.role !== 'root')) {
    return res.status(403).json({ success: false, message: 'Sub-admin or Root access required' });
  }
  next();
};

export const verifyClientOwnership = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const client = await User.findOne({
      _id: clientId,
      role: 'client',
      parentSubAdmin: req.user.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found or access denied'
      });
    }

    req.client = client;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


