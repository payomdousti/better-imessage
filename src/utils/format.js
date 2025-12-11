/**
 * Formatting utilities
 * @module utils/format
 */

// ============================================================
// Time formatting
// ============================================================

/**
 * Format timestamp as relative time (e.g., "5m ago", "2d ago")
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) return new Date(timestamp).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

/**
 * Format date for message timestamps
 */
export const formatMessageTime = (date) =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Format date for display
 */
export const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

// ============================================================
// String formatting
// ============================================================

/**
 * Extract hostname from URL
 */
export const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/**
 * Get initials from name (returns null if name has no letters)
 */
export const getInitials = (name) => {
  if (!name) return null;
  
  const hasLetters = /[a-zA-Z]{2,}/.test(name);
  if (!hasLetters) return null;
  
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};
