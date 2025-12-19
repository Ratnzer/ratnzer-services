const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Prisma Specific Errors
  // P2002: Unique constraint failed (e.g. email already exists)
  if (err.code === 'P2002') {
    statusCode = 400;
    const target = err.meta?.target || 'Field';
    message = `${target} already exists.`;
  }

  // P2025: Record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found.';
  }

  res.status(statusCode).json({
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };