/**
 * Unicode text handling utilities
 * @module helpers/unicode
 * 
 * Shared constants and functions for handling invisible/special Unicode characters
 * Used by both text extraction and conversation previews
 */

// Invisible characters that should be stripped from message text:
// - U+FFFC: Object Replacement Character (attachment placeholder)
// - U+FFFD: Replacement Character (invalid/unknown char)
// - U+200B: Zero Width Space (used in tapback reactions)
// - U+200C: Zero Width Non-Joiner
// - U+200D: Zero Width Joiner
// - U+2060: Word Joiner
// - U+FEFF: Zero Width No-Break Space (BOM)
// - U+200A: Hair Space (also used in tapback text wrappers)
const INVISIBLE_CHARS_REGEX = /[\uFFFC\uFFFD\u200B\u200C\u200D\u2060\uFEFF\u200A]/g;

/**
 * Clean text by removing invisible Unicode characters
 */
const cleanText = (text) => {
  if (!text) return '';
  return text.replace(INVISIBLE_CHARS_REGEX, '').trim();
};

/**
 * Check if text has visible content after cleaning
 */
const hasVisibleText = (text) => 
  cleanText(text).length > 0;

module.exports = {
  INVISIBLE_CHARS_REGEX,
  cleanText,
  hasVisibleText
};

