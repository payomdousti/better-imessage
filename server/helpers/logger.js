/**
 * Simple logger with log levels
 * @module helpers/logger
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Set via environment variable, default to 'info' in production
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

/**
 * Format a log message with timestamp and context
 */
function formatMessage(level, context, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

/**
 * Log a debug message (only shown when LOG_LEVEL=debug)
 */
function debug(context, message, data) {
  if (currentLevel <= LOG_LEVELS.debug) {
    console.log(formatMessage('debug', context, message));
    if (data !== undefined) console.log(data);
  }
}

/**
 * Log an info message
 */
function info(context, message, data) {
  if (currentLevel <= LOG_LEVELS.info) {
    console.log(formatMessage('info', context, message));
    if (data !== undefined) console.log(data);
  }
}

/**
 * Log a warning message
 */
function warn(context, message, data) {
  if (currentLevel <= LOG_LEVELS.warn) {
    console.warn(formatMessage('warn', context, message));
    if (data !== undefined) console.warn(data);
  }
}

/**
 * Log an error message
 */
function error(context, message, err) {
  if (currentLevel <= LOG_LEVELS.error) {
    console.error(formatMessage('error', context, message));
    if (err) {
      console.error(err.stack || err.message || err);
    }
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  LOG_LEVELS
};
