/**
 * User Controller
 */

import User from '../models/User.js';

export const listUsers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 100) || 10;
    const page = Math.max(parseInt(req.query.page || '1'), 1) || 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({})
    ]);

    return res.status(200).json({
      success: true,
      message: 'Users fetched',
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};


