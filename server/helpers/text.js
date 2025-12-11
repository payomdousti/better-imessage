/**
 * Text extraction and parsing utilities
 * @module helpers/text
 */

const bplist = require('bplist-parser');

/**
 * Extract text from attributedBody blob using proper plist parsing
 * 
 * The attributedBody contains a binary plist (NSKeyedArchiver format) with
 * the actual message text stored in an NSString object.
 * 
 * @param {Buffer} buffer - The attributedBody blob
 * @returns {string|null} - Extracted text or null
 */
function extractTextFromAttributedBody(buffer) {
  if (!buffer) return null;
  
  try {
    const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    
    // Try parsing as binary plist first (proper method)
    try {
      const parsed = bplist.parseBuffer(data);
      if (parsed && parsed.length > 0) {
        const text = extractTextFromParsedPlist(parsed[0]);
        if (text) return text;
      }
    } catch {
      // Binary plist parsing failed, fall back to manual extraction
    }
    
    // Fallback: Manual extraction for edge cases
    // Look for the NSString marker followed by the text
    const nsStringMarker = Buffer.from('NSString');
    let idx = data.indexOf(nsStringMarker);
    
    if (idx !== -1) {
      // Find the '+' marker after NSString (marks start of length encoding)
      const PLUS_BYTE = 0x2b;
      let plusIdx = data.indexOf(PLUS_BYTE, idx + nsStringMarker.length);
      
      if (plusIdx !== -1 && plusIdx < idx + 80) {
        let textStart = plusIdx + 1;
        let messageLength = 0;
        
        // Parse length encoding
        const firstByte = data[textStart];
        
        if (firstByte < 0x80) {
          // Single byte length (0-127)
          messageLength = firstByte;
          textStart += 1;
        } else if (firstByte === 0x81) {
          // 2-byte length (little-endian)
          messageLength = data.readUInt16LE(textStart + 1);
          textStart += 3;
        } else if (firstByte === 0x82) {
          // 3-byte length
          messageLength = data[textStart + 1] | (data[textStart + 2] << 8) | (data[textStart + 3] << 16);
          textStart += 4;
        } else if (firstByte === 0x83) {
          // 4-byte length (little-endian)
          messageLength = data.readUInt32LE(textStart + 1);
          textStart += 5;
        } else {
          // Unknown format, skip length byte and find text
          textStart += 1;
          while (textStart < data.length && data[textStart] < 0x20) {
            textStart++;
          }
        }
        
        // Find end of text
        const END_MARKER = 0x86;
        const markerIdx = data.indexOf(END_MARKER, textStart);
        let textEnd = messageLength > 0 
          ? Math.min(textStart + messageLength, markerIdx !== -1 ? markerIdx : data.length)
          : (markerIdx !== -1 ? markerIdx : data.length);
        
        // Extract and clean text
        let text = data.slice(textStart, textEnd).toString('utf8');
        text = cleanExtractedText(text);
        
        if (text.length > 0) {
          return text;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract text from a parsed plist structure
 * Navigates the NSKeyedArchiver format to find the string content
 */
function extractTextFromParsedPlist(plist) {
  if (!plist) return null;
  
  // NSKeyedArchiver stores objects in $objects array
  const objects = plist.$objects;
  if (!Array.isArray(objects)) return null;
  
  // Look for NSString or NSMutableString content
  for (const obj of objects) {
    if (typeof obj === 'string' && obj.length > 0) {
      const cleaned = cleanExtractedText(obj);
      // Return first substantial string (skip short metadata strings)
      if (cleaned.length > 1 && !isMetadataString(cleaned)) {
        return cleaned;
      }
    }
    
    // Check for NS.string key (sometimes text is stored this way)
    if (obj && typeof obj === 'object' && obj['NS.string']) {
      const cleaned = cleanExtractedText(obj['NS.string']);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }
  
  return null;
}

/**
 * Check if a string looks like internal metadata rather than message content
 */
function isMetadataString(str) {
  const metadataPatterns = [
    /^NS[A-Z]/,           // NSString, NSMutableString, etc.
    /^\$[a-z]/,           // $class, $objects, etc.
    /^__kIM/,             // Internal iMessage keys
    /^com\.apple/,        // Bundle identifiers
  ];
  
  return metadataPatterns.some(pattern => pattern.test(str));
}

/**
 * Clean extracted text by removing control characters and artifacts
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  return text
    .replace(/^[\ufffc\ufffd\x00-\x1f]+/, '')  // Leading junk
    .replace(/[\ufffc\ufffd\x00-\x1f]+$/g, '') // Trailing junk
    .replace(/\ufffc/g, '')                     // Object replacement char
    .trim();
}

/**
 * Get message text, trying text column first, then attributedBody
 * @param {Object} row - Database row with text and attributedBody
 * @returns {string|null}
 */
function getMessageText(row) {
  if (row.text && row.text.trim()) {
    return row.text;
  }
  if (row.attributedBody) {
    return extractTextFromAttributedBody(row.attributedBody);
  }
  return null;
}

/**
 * Extract URLs from text
 * @param {string} text - Text to extract URLs from
 * @returns {string[]} - Array of unique URLs
 */
function extractUrls(text) {
  if (!text) return [];
  
  // Match http/https URLs, being careful not to include trailing punctuation
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const matches = text.match(urlRegex) || [];
  
  // Clean up URLs (remove trailing punctuation that got captured)
  const cleaned = matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
  
  return [...new Set(cleaned)]; // Dedupe
}

/**
 * Parse link preview from plist data
 * @param {Buffer} buffer - Binary plist data
 * @returns {{ url: string, title: string }|null}
 */
function parseLinkPreview(buffer) {
  if (!buffer) return null;
  
  try {
    // Try proper plist parsing first
    const parsed = bplist.parseBuffer(buffer);
    if (parsed && parsed.length > 0) {
      const obj = parsed[0];
      
      // Look for URL and title in parsed structure
      if (obj.$objects) {
        let url = null;
        let title = null;
        
        for (const item of obj.$objects) {
          if (typeof item === 'string') {
            if (item.startsWith('http')) {
              url = item;
            } else if (item.length > 5 && !isMetadataString(item)) {
              title = title || item;
            }
          }
        }
        
        if (url) return { url, title };
      }
    }
    
    // Fallback: regex extraction from raw buffer
    const str = buffer.toString('utf8');
    const urlMatch = str.match(/https?:\/\/[^\x00-\x1f\x7f-\xff]+/);
    const url = urlMatch ? urlMatch[0].replace(/[^\x20-\x7e]/g, '') : null;
    
    return url ? { url, title: null } : null;
  } catch {
    return null;
  }
}

module.exports = {
  extractTextFromAttributedBody,
  getMessageText,
  extractUrls,
  parseLinkPreview,
  cleanExtractedText
};
