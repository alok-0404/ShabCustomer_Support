/**
 * Branch Controller
 */

import Branch from '../models/Branch.js';

export const listBranches = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 100) || 10;
    const page = Math.max(parseInt(req.query.page || '1'), 1) || 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Branch.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Branch.countDocuments({})
    ]);

    return res.status(200).json({
      success: true,
      message: 'Branches fetched',
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { branchId, branchName, waLink } = req.body || {};
    if (!branchId || !branchName || !waLink) {
      return res.status(400).json({ success: false, message: 'branchId, branchName, waLink are required' });
    }
    
    // Check for duplicate branchId or branchName
    const existingBranch = await Branch.findOne({
      $or: [
        { branchId },
        { branchName }
      ]
    });
    
    if (existingBranch) {
      if (existingBranch.branchId === branchId) {
        return res.status(409).json({ success: false, message: 'Branch ID already exists' });
      }
      if (existingBranch.branchName === branchName) {
        return res.status(409).json({ success: false, message: 'Branch name already exists' });
      }
    }

    const branch = await Branch.create({ branchId, branchName, waLink });
    return res.status(201).json({ success: true, message: 'Branch created', data: branch });
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    return res.status(200).json({ success: true, message: 'Branch fetched', data: branch });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { branchId, branchName, waLink } = req.body || {};

    const branch = await Branch.findById(id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    // Check for duplicate branchId (if being changed)
    if (branchId && branchId !== branch.branchId) {
      const existingId = await Branch.findOne({ branchId });
      if (existingId) {
        return res.status(409).json({ success: false, message: 'Branch ID already exists' });
      }
      branch.branchId = branchId;
    }
    
    // Check for duplicate branchName (if being changed)
    if (branchName && branchName !== branch.branchName) {
      const existingName = await Branch.findOne({ branchName });
      if (existingName) {
        return res.status(409).json({ success: false, message: 'Branch name already exists' });
      }
      branch.branchName = branchName;
    }
    
    if (waLink) branch.waLink = waLink;

    await branch.save();
    return res.status(200).json({ success: true, message: 'Branch updated', data: branch });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    await branch.deleteOne();
    return res.status(200).json({ success: true, message: 'Branch deleted', data: null });
  } catch (error) {
    next(error);
  }
};


