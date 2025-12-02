/**
 * Analytics Controller
 * Provides detailed client visit analytics for admin dashboard
 */

import UserHitLog from '../models/UserHitLog.js';
import User from '../models/User.js';

/**
 * Get client visit analytics with detailed metadata
 * GET /api/analytics/client-visits
 */
export const getClientVisitAnalytics = async (req, res, next) => {
  try {
    const { 
      period = '7d', // 1d, 7d, 30d, 90d, 1y, all
      groupBy = 'day', // day, week, month, year
      limit = 1000
    } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build filter
    const filter = {};
    if (startDate) {
      filter.createdAt = { $gte: startDate };
    }

    // Get all visit logs
    const visitLogs = await UserHitLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get client details for each visit
    const userIds = [...new Set(visitLogs.map(log => log.userId))];
    const clients = await User.find({ 
      userId: { $in: userIds },
      role: 'client' 
    }).select('userId name email phone branchName branchWaLink');

    // Create client lookup map
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.userId] = client;
    });

    // Group visits by time period
    const groupedVisits = {};
    const dailyStats = {};
    const clientStats = {};

    visitLogs.forEach(log => {
      const date = new Date(log.createdAt);
      let groupKey;

      // Determine group key based on groupBy
      switch (groupBy) {
        case 'day':
          groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          groupKey = date.getFullYear().toString();
          break;
        default:
          groupKey = date.toISOString().split('T')[0];
      }

      // Initialize group if not exists
      if (!groupedVisits[groupKey]) {
        groupedVisits[groupKey] = {
          date: groupKey,
          totalVisits: 0,
          uniqueClients: new Set(),
          visits: []
        };
      }

      // Add visit to group
      groupedVisits[groupKey].totalVisits++;
      groupedVisits[groupKey].uniqueClients.add(log.userId);
      
      const clientInfo = clientMap[log.userId] || {
        userId: log.userId,
        name: log.userId,
        email: null,
        phone: null,
        branchName: 'Unknown Branch',
        branchWaLink: log.waLink
      };

      groupedVisits[groupKey].visits.push({
        id: log._id,
        userId: log.userId,
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        branchName: clientInfo.branchName,
        waLink: log.waLink,
        visitedAt: log.createdAt,
        clientInfo: clientInfo
      });

      // Daily stats
      const dayKey = date.toISOString().split('T')[0];
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = { visits: 0, clients: new Set() };
      }
      dailyStats[dayKey].visits++;
      dailyStats[dayKey].clients.add(log.userId);

      // Client stats
      if (!clientStats[log.userId]) {
        clientStats[log.userId] = {
          userId: log.userId,
          clientInfo: clientInfo,
          totalVisits: 0,
          lastVisit: null,
          firstVisit: null
        };
      }
      clientStats[log.userId].totalVisits++;
      if (!clientStats[log.userId].lastVisit || log.createdAt > clientStats[log.userId].lastVisit) {
        clientStats[log.userId].lastVisit = log.createdAt;
      }
      if (!clientStats[log.userId].firstVisit || log.createdAt < clientStats[log.userId].firstVisit) {
        clientStats[log.userId].firstVisit = log.createdAt;
      }
    });

    // Convert grouped visits to array and add unique client counts
    const groupedData = Object.values(groupedVisits).map(group => ({
      ...group,
      uniqueClients: group.uniqueClients.size,
      uniqueClientsList: Array.from(group.uniqueClients)
    }));

    // Convert daily stats
    const dailyData = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      visits: stats.visits,
      uniqueClients: stats.clients.size
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Convert client stats to array
    const clientData = Object.values(clientStats).sort((a, b) => b.totalVisits - a.totalVisits);

    // Calculate summary statistics
    const totalVisits = visitLogs.length;
    const totalUniqueClients = userIds.length;
    const avgVisitsPerDay = dailyData.length > 0 ? 
      (totalVisits / dailyData.length).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      message: 'Client visit analytics retrieved',
      data: {
        period,
        groupBy,
        summary: {
          totalVisits,
          totalUniqueClients,
          avgVisitsPerDay: parseFloat(avgVisitsPerDay),
          dateRange: {
            from: startDate ? startDate.toISOString() : 'All time',
            to: now.toISOString()
          }
        },
        groupedVisits: groupedData,
        dailyStats: dailyData,
        clientStats: clientData.map(client => ({
          userId: client.userId,
          clientName: client.clientInfo.name,
          clientEmail: client.clientInfo.email,
          clientPhone: client.clientInfo.phone,
          branchName: client.clientInfo.branchName,
          totalVisits: client.totalVisits,
          firstVisit: client.firstVisit,
          lastVisit: client.lastVisit
        })),
        topClients: clientData.slice(0, 10),
        recentVisits: visitLogs.slice(0, 20).map(log => ({
          id: log._id,
          userId: log.userId,
          clientName: clientMap[log.userId]?.name || log.userId,
          branchName: clientMap[log.userId]?.branchName || 'Unknown',
          waLink: log.waLink,
          visitedAt: log.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed client visit logs with pagination
 * GET /api/analytics/visit-logs
 */
export const getVisitLogs = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      userId,
      dateFrom,
      dateTo,
      branchName
    } = req.query;

    const filter = {};
    
    if (userId) filter.userId = { $regex: userId, $options: 'i' };
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 200);

    const [visitLogs, total] = await Promise.all([
      UserHitLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      UserHitLog.countDocuments(filter)
    ]);

    // Get client details
    const userIds = [...new Set(visitLogs.map(log => log.userId))];
    const clients = await User.find({ 
      userId: { $in: userIds },
      role: 'client' 
    }).select('userId name email phone branchName branchWaLink');

    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.userId] = client;
    });

    // Filter by branch if specified
    let filteredLogs = visitLogs;
    if (branchName) {
      filteredLogs = visitLogs.filter(log => {
        const client = clientMap[log.userId];
        return client && client.branchName && 
               client.branchName.toLowerCase().includes(branchName.toLowerCase());
      });
    }

    res.status(200).json({
      success: true,
      message: 'Visit logs retrieved',
      data: {
        visits: filteredLogs.map(log => {
          const client = clientMap[log.userId];
          return {
            id: log._id,
            userId: log.userId,
            clientName: client?.name || log.userId,
            clientEmail: client?.email || null,
            clientPhone: client?.phone || null,
            branchName: client?.branchName || 'Unknown Branch',
            waLink: log.waLink,
            visitedAt: log.createdAt,
            clientInfo: client
          };
        }),
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: branchName ? filteredLogs.length : total,
          pages: Math.ceil((branchName ? filteredLogs.length : total) / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time visit statistics
 * GET /api/analytics/realtime-stats
 */
export const getRealtimeStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayVisits,
      yesterdayVisits,
      weekVisits,
      monthVisits,
      totalVisits,
      recentVisits
    ] = await Promise.all([
      UserHitLog.countDocuments({ createdAt: { $gte: today } }),
      UserHitLog.countDocuments({ 
        createdAt: { $gte: yesterday, $lt: today } 
      }),
      UserHitLog.countDocuments({ createdAt: { $gte: thisWeek } }),
      UserHitLog.countDocuments({ createdAt: { $gte: thisMonth } }),
      UserHitLog.countDocuments({}),
      UserHitLog.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name branchName')
    ]);

    res.status(200).json({
      success: true,
      message: 'Real-time statistics retrieved',
      data: {
        today: todayVisits,
        yesterday: yesterdayVisits,
        thisWeek: weekVisits,
        thisMonth: monthVisits,
        total: totalVisits,
        recentVisits: recentVisits.map(log => ({
          id: log._id,
          userId: log.userId,
          visitedAt: log.createdAt,
          waLink: log.waLink
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
