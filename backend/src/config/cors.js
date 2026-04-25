const isProduction = process.env.NODE_ENV === 'production';

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultDevOrigins = isProduction
  ? []
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const allowedOrigins = new Set([...configuredOrigins, ...defaultDevOrigins]);

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1):(\d{2,5})$/;

const normalizeOrigin = (origin) => (origin || '').trim().replace(/\/$/, '');

const isAllowedOrigin = (origin) => {
  // Allow non-browser/server-to-server requests where Origin is absent.
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.has(normalized)) return true;

  // In local development, allow localhost on any port.
  if (!isProduction && localhostPattern.test(normalized)) return true;

  return false;
};

const corsOriginHandler = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Not allowed by CORS: ${origin}`));
};

module.exports = {
  allowedOrigins: Array.from(allowedOrigins),
  corsOriginHandler,
  isAllowedOrigin,
};
