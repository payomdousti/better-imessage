/**
 * Generate macOS app icon (.icns) from PNG
 * 
 * Usage: node generate-icon.js
 * 
 * Requires a 1024x1024 PNG named "icon.png" in this directory.
 * Outputs icon.icns for use in Electron app.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024];
const ICON_SET_DIR = path.join(__dirname, 'icon.iconset');
const SOURCE_PNG = path.join(__dirname, 'icon.png');
const OUTPUT_ICNS = path.join(__dirname, 'icon.icns');

// Check for source file
if (!fs.existsSync(SOURCE_PNG)) {
  console.log('icon.png not found. Creating a placeholder icon...');
  
  // Create a simple placeholder using sips (macOS built-in)
  // This creates a blue gradient square as a placeholder
  const placeholderScript = `
    convert -size 1024x1024 \
      -define gradient:angle=135 \
      gradient:'#1d4ed8'-'#3b82f6' \
      -gravity center \
      -font "SF-Pro-Display-Bold" -pointsize 400 \
      -fill white -annotate 0 "M" \
      "${SOURCE_PNG}"
  `;
  
  // Alternative: create with sips if ImageMagick not available
  console.log('Note: For a custom icon, place a 1024x1024 PNG named "icon.png" in the assets folder.');
  console.log('Then run: node generate-icon.js');
  process.exit(0);
}

// Create iconset directory
if (fs.existsSync(ICON_SET_DIR)) {
  fs.rmSync(ICON_SET_DIR, { recursive: true });
}
fs.mkdirSync(ICON_SET_DIR);

console.log('Generating icon sizes...');

// Generate all required sizes
for (const size of ICON_SIZES) {
  const filename1x = `icon_${size}x${size}.png`;
  const filename2x = `icon_${size}x${size}@2x.png`;
  
  // 1x size
  if (size <= 512) {
    execSync(`sips -z ${size} ${size} "${SOURCE_PNG}" --out "${path.join(ICON_SET_DIR, filename1x)}"`, { stdio: 'pipe' });
    console.log(`  Created ${filename1x}`);
  }
  
  // 2x size (for retina)
  if (size <= 512) {
    const size2x = size * 2;
    execSync(`sips -z ${size2x} ${size2x} "${SOURCE_PNG}" --out "${path.join(ICON_SET_DIR, filename2x)}"`, { stdio: 'pipe' });
    console.log(`  Created ${filename2x}`);
  }
}

// Special case for 512@2x (which is 1024)
execSync(`sips -z 1024 1024 "${SOURCE_PNG}" --out "${path.join(ICON_SET_DIR, 'icon_512x512@2x.png')}"`, { stdio: 'pipe' });

console.log('Converting to .icns...');

// Convert iconset to icns
execSync(`iconutil -c icns "${ICON_SET_DIR}" -o "${OUTPUT_ICNS}"`, { stdio: 'pipe' });

// Cleanup
fs.rmSync(ICON_SET_DIR, { recursive: true });

console.log(`✓ Created ${OUTPUT_ICNS}`);

