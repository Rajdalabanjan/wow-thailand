// ========================================================================
// WOW THAILAND: Centralized Error Handler
// ========================================================================

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isConflict = statusCode === 409 || err.code === 'ER_DUP_ENTRY';

  const response = {
    success: false,
    error: err.message || 'An internal server error occurred.',
    conflict: isConflict
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
