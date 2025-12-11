# iMessage Search

A desktop app for searching and browsing your iMessage history on Mac.

## Features

- **Full-text search** across your entire message history with instant results
- **Contact filtering** to search within specific conversations
- **Media browser** for photos, videos, and links you've shared
- **Insights dashboard** with conversation stats and activity patterns
- **100% local** — reads directly from your Mac's iMessage database, nothing leaves your machine

## Requirements

- macOS
- Node.js 18+
- **Full Disk Access** permission (System Settings → Privacy & Security → Full Disk Access)

## Running in Browser

```bash
npm install
npm run build
npm start
```

Then open http://localhost:3000

## Building the Electron App

```bash
npm install
npm run build
npm run electron:build
```

The `.dmg` will be in the `dist/` folder.

## Development

```bash
# Start the server
npm run server

# In another terminal, start webpack dev server
npm run dev

# Run tests
npm test
```

## How It Works

- Reads from `~/Library/Messages/chat.db` (SQLite)
- Resolves contact names from AddressBook
- Converts HEIC images to JPEG for display
- Generates thumbnails for media
- Fetches link previews via Open Graph

## License

MIT
