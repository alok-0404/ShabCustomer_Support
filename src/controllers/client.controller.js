/**
 * Client Controller
 * Handles all client operations for SubAdmins
 */

import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Create a new client (SubAdmin only)
 * POST /api/clients/create
 */
export const createClient = async (req, res, next) => {
  try {
    const { userId, name, email, password, phone } = req.body;

    // Validation
    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: 'userId and name are required'
      });
    }

    // Check: Only SubAdmin can create clients
    if (req.user.role !== 'sub') {
      return res.status(403).json({
        success: false,
        message: 'Only sub-admins can create clients'
      });
    }

    // Check: Is this userId already registered as a client?
    const existingClient = await User.findOne({
      userId,
      role: 'client'
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: 'This client ID is already registered with another sub-admin'
      });
    }

    // Get current SubAdmin details
    const subAdmin = await User.findById(req.user.id)
      .select('_id branchId branchName branchWaLink')
      .populate('branchId');

    if (!subAdmin) {
      return res.status(400).json({
        success: false,
        message: 'SubAdmin not found'
      });
    }
    // Allow subadmins without branchId as long as they have a waLink snapshot
    if (!subAdmin.branchId && !subAdmin.branchWaLink) {
      return res.status(400).json({
        success: false,
        message: 'SubAdmin branch information not found (waLink missing)'
      });
    }

    // Prepare client data
    const clientData = {
      userId,
      name,
      phone: phone || null,
      role: 'client',
      parentSubAdmin: subAdmin._id,
      ...(subAdmin.branchId ? { branchId: subAdmin.branchId._id } : {}),
      branchName: subAdmin.branchName || subAdmin.branchId?.branchName || null,
      branchWaLink: subAdmin.branchWaLink || subAdmin.branchId?.waLink || null,
      isActive: true,
      createdBy: req.user.id
    };

    // Optional: Add email and password if provided
    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
      clientData.email = normalizedEmail;
    }

    if (password) {
      clientData.passwordHash = await bcrypt.hash(password, 12);
    }

    // Create client
    const client = await User.create(clientData);

    return res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        id: String(client._id),
        userId: client.userId,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        role: client.role,
        isActive: client.isActive,
        branchName: client.branchName,
        branchWaLink: client.branchWaLink,
        parentSubAdmin: String(client.parentSubAdmin),
        createdAt: client.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all clients (SubAdmin: own clients, Root: all clients)
 * GET /api/clients?page=1&limit=10&search=&subAdminId=
 */
export const listMyClients = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 100) || 10;
    const page = Math.max(parseInt(req.query.page || '1'), 1) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const subAdminId = req.query.subAdminId || ''; // For Root to filter by specific SubAdmin

    // Base filter
    const filter = { role: 'client' };

    // Role-based filtering
    if (req.user.role === 'sub') {
      // SubAdmin: only their own clients
      filter.parentSubAdmin = req.user.id;
    } else if (req.user.role === 'root') {
      // Root: all clients, or filter by specific SubAdmin if provided
      if (subAdminId) {
        filter.parentSubAdmin = subAdminId;
      }
      // If no subAdminId, show all clients (no extra filter)
    }

    // Add search filter if provided
    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .populate('parentSubAdmin', 'userId email branchName branchWaLink') // Populate for Root view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id userId name email phone role isActive branchName branchWaLink createdAt updatedAt'),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: 'Clients fetched successfully',
      data: {
        items: items.map(client => ({
          id: String(client._id),
          userId: client.userId,
          name: client.name,
          email: client.email || null,
          phone: client.phone || null,
          isActive: client.isActive,
          branchName: client.branchName,
          branchWaLink: client.branchWaLink,
          // Include parent SubAdmin info only for Root
          ...(req.user.role === 'root' && client.parentSubAdmin ? {
            parentSubAdmin: {
              id: String(client.parentSubAdmin._id),
              userId: client.parentSubAdmin.userId,
              email: client.parentSubAdmin.email,
              branchName: client.parentSubAdmin.branchName
            }
          } : {}),
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single client details (SubAdmin can only view their own clients)
 * GET /api/clients/:clientId
 */
export const getClient = async (req, res, next) => {
  try {
    // req.client is set by verifyClientOwnership middleware
    const client = req.client;

    return res.status(200).json({
      success: true,
      message: 'Client details fetched',
      data: {
        id: String(client._id),
        userId: client.userId,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        role: client.role,
        isActive: client.isActive,
        branchName: client.branchName,
        branchWaLink: client.branchWaLink,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update client (SubAdmin can only update their own clients)
 * PUT /api/clients/:clientId
 */
export const updateClient = async (req, res, next) => {
  try {
    const { name, email, phone, isActive } = req.body;
    const client = req.client; // Set by verifyClientOwnership middleware

    // Update fields
    if (name !== undefined) client.name = name;
    if (phone !== undefined) client.phone = phone;
    if (typeof isActive === 'boolean') client.isActive = isActive;

    // Handle email update
    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (normalizedEmail !== client.email) {
        const emailExists = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: client._id }
        });
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use'
          });
        }
        client.email = normalizedEmail;
      }
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: {
        id: String(client._id),
        userId: client.userId,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        isActive: client.isActive,
        branchName: client.branchName,
        branchWaLink: client.branchWaLink,
        updatedAt: client.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Deactivate client (SubAdmin can only delete their own clients)
 * DELETE /api/clients/:clientId
 */
export const deleteClient = async (req, res, next) => {
  try {
    const client = req.client; // Set by verifyClientOwnership middleware

    // Option 1: Soft delete (deactivate)
    client.isActive = false;
    await client.save();

    // Option 2: Hard delete (uncomment if needed)
    // await User.deleteOne({ _id: client._id });

    return res.status(200).json({
      success: true,
      message: 'Client deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset client password (SubAdmin only for their clients)
 * POST /api/clients/:clientId/reset-password
 */
export const resetClientPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const client = req.client; // Set by verifyClientOwnership middleware

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'newPassword is required'
      });
    }

    client.passwordHash = await bcrypt.hash(newPassword, 12);
    client.tokenVersion += 1; // Logout everywhere
    await client.save();

    return res.status(200).json({
      success: true,
      message: 'Client password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client statistics (for current SubAdmin)
 * GET /api/clients/stats
 */
export const getClientStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'sub') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [total, active, inactive] = await Promise.all([
      User.countDocuments({ role: 'client', parentSubAdmin: req.user.id }),
      User.countDocuments({ role: 'client', parentSubAdmin: req.user.id, isActive: true }),
      User.countDocuments({ role: 'client', parentSubAdmin: req.user.id, isActive: false })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Client statistics',
      data: {
        total,
        active,
        inactive
      }
    });
  } catch (error) {
    next(error);
  }
};

