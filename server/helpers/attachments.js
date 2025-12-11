/**
 * Attachment handling utilities
 */

const path = require('path');
const os = require('os');

/**
 * Expand ~ in file paths to home directory
 */
function expandPath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Get attachment type category from mime type or filename
 */
function getAttachmentType(mimeType, filename) {
  if (!mimeType && !filename) return 'other';
  
  const mime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|heic|webp|tiff)$/i.test(name)) {
    return 'image';
  }
  if (mime.startsWith('video/') || /\.(mov|mp4|m4v|avi|webm)$/i.test(name)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || /\.(mp3|m4a|wav|aac|caf)$/i.test(name)) {
    return 'audio';
  }
  if (name.includes('pluginpayloadattachment')) {
    return 'link_preview';
  }
  return 'other';
}

module.exports = {
  expandPath,
  getAttachmentType
};

