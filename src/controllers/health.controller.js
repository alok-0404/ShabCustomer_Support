/**
 * Health Controller
 */

export const getHealth = async (req, res, next) => {
  try {
    res.status(200).json({
      ok: true,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
