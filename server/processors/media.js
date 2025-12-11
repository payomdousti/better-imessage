/**
 * Background media processor for thumbnail generation
 * Handles HEIC conversion, image thumbnails, and video thumbnails
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const heicConvert = require('heic-convert');
const { THUMB_DIR, HEIC_DIR, MEDIA_PROCESSOR_CONCURRENCY } = require('../config');
const { expandPath } = require('../helpers/attachments');
const logger = require('../helpers/logger');

class MediaProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.processed = 0;
    this.total = 0;
    this.ready = false;
    this.concurrency = MEDIA_PROCESSOR_CONCURRENCY;
    this.activeWorkers = 0;
    this.startTime = null;
  }

  /**
   * Initialize processor with database and queue attachments for processing
   */
  async initialize(db) {
    this.db = db;
    this.startTime = Date.now();
    logger.info('media', `Starting background media processor with ${this.concurrency} workers`);
    
    return new Promise((resolve) => {
      db.all(`
        SELECT ROWID as id, filename, mime_type 
        FROM attachment 
        WHERE (mime_type LIKE 'image/%' OR mime_type LIKE 'video/%'
               OR filename LIKE '%.heic' OR filename LIKE '%.HEIC' 
               OR filename LIKE '%.heif' OR filename LIKE '%.HEIF'
               OR filename LIKE '%.jpg' OR filename LIKE '%.jpeg' OR filename LIKE '%.png'
               OR filename LIKE '%.JPG' OR filename LIKE '%.JPEG' OR filename LIKE '%.PNG'
               OR filename LIKE '%.mov' OR filename LIKE '%.MOV'
               OR filename LIKE '%.mp4' OR filename LIKE '%.MP4'
               OR filename LIKE '%.m4v' OR filename LIKE '%.M4V')
          AND filename IS NOT NULL
      `, [], (err, rows) => {
        if (err) {
          logger.error('media', 'Error fetching attachments for processing', err);
          this.ready = true;
          resolve();
          return;
        }

        // Filter to only unprocessed (check cache)
        const unprocessed = rows.filter(row => {
          const thumbPath = path.join(THUMB_DIR, `${row.id}.jpg`);
          return !fs.existsSync(thumbPath);
        });

        this.queue = unprocessed;
        this.total = unprocessed.length;
        logger.info('media', `Found ${this.total} images to process`);
        
        if (this.total === 0) {
          this.ready = true;
          logger.info('media', 'Media processor ready (no images to process)');
          resolve();
          return;
        }

        this.startProcessing();
        resolve();
      });
    });
  }

  /**
   * Start parallel processing workers
   */
  startProcessing() {
    for (let i = 0; i < this.concurrency; i++) {
      this.processNext();
    }
  }

  /**
   * Process next item in queue
   */
  async processNext() {
    if (this.queue.length === 0) {
      this.activeWorkers--;
      if (this.activeWorkers === 0) {
        this.ready = true;
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        logger.info('media', `Media processor complete! Processed ${this.processed} images in ${elapsed}s`);
      }
      return;
    }

    this.activeWorkers++;
    const item = this.queue.shift();
    
    try {
      await this.processAttachment(item);
      this.processed++;
      
      if (this.processed % 100 === 0 || this.processed === this.total) {
        const pct = ((this.processed / this.total) * 100).toFixed(1);
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = (this.processed / elapsed).toFixed(1);
        logger.debug('media', `Processing: ${this.processed}/${this.total} (${pct}%) - ${rate} img/s`);
      }
    } catch (e) {
      // Silently skip failures
    }

    // Process next immediately
    setImmediate(() => this.processNext());
  }

  /**
   * Process a single attachment
   */
  async processAttachment(attachment) {
    const thumbPath = path.join(THUMB_DIR, `${attachment.id}.jpg`);
    if (fs.existsSync(thumbPath)) return;

    let filePath = expandPath(attachment.filename);
    if (!filePath || !fs.existsSync(filePath)) return;

    const isVideo = /\.(mov|mp4|m4v|avi|mkv|webm)$/i.test(filePath) || 
                    (attachment.mime_type && attachment.mime_type.startsWith('video/'));

    if (isVideo) {
      await this.createVideoThumbnail(filePath, thumbPath, 200);
      return;
    }

    // Use sips for images - it handles HEIC natively on macOS
    try {
      await this.createThumbnailWithSips(filePath, thumbPath, 200);
    } catch (e) {
      // Fallback to heic-convert for problematic files
      const isHeic = /\.(heic|heif)$/i.test(filePath);
      if (isHeic) {
        const heicCache = path.join(HEIC_DIR, `${attachment.id}.jpg`);
        if (!fs.existsSync(heicCache)) {
          try {
            const inputBuffer = fs.readFileSync(filePath);
            const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.8 });
            fs.writeFileSync(heicCache, outputBuffer);
          } catch (e2) {
            return;
          }
        }
        await this.createThumbnailWithSips(heicCache, thumbPath, 200);
      }
    }
  }

  /**
   * Create thumbnail using macOS sips command
   */
  createThumbnailWithSips(inputPath, outputPath, size = 200) {
    return new Promise((resolve, reject) => {
      exec(`sips -s format jpeg -Z ${size} "${inputPath}" --out "${outputPath}" 2>/dev/null`, (err) => {
        if (err || !fs.existsSync(outputPath)) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Create thumbnail from video using ffmpeg
   */
  createVideoThumbnail(inputPath, outputPath, size = 200) {
    return new Promise((resolve) => {
      // Try at 1 second first
      exec(`ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -vf "scale=${size}:-1" -y "${outputPath}" 2>/dev/null`, (err) => {
        if (!err && fs.existsSync(outputPath)) {
          resolve(true);
        } else {
          // Fallback to 0 seconds for short videos
          exec(`ffmpeg -i "${inputPath}" -ss 00:00:00 -vframes 1 -vf "scale=${size}:-1" -y "${outputPath}" 2>/dev/null`, (err2) => {
            resolve(!err2 && fs.existsSync(outputPath));
          });
        }
      });
    });
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      ready: this.ready,
      processed: this.processed,
      total: this.total,
      remaining: this.queue.length
    };
  }
}

// Singleton instance
const mediaProcessor = new MediaProcessor();

module.exports = {
  MediaProcessor,
  mediaProcessor
};

