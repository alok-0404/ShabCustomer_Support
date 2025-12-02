/**
 * Zod Validation Middleware
 */

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors
    });
  }
};
