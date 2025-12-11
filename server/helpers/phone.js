/**
 * Phone and email normalization utilities
 */

/**
 * Normalize phone number for consistent matching
 * Returns last 10 digits for valid numbers, empty string for invalid
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  
  // Strip leading 1 for US numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  
  // Return last 10 digits if valid, otherwise empty string
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return '';
}

/**
 * Normalize email for consistent matching
 */
function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

module.exports = {
  normalizePhone,
  normalizeEmail
};

