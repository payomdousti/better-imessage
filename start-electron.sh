#!/bin/bash
# Start script for Electron app
# This works around the issue where the npm electron package interferes with 
# Electron's built-in 'electron' module

cd "$(dirname "$0")"

# Temporarily rename the electron npm package so require('electron') 
# resolves to Electron's built-in module
if [ -d "node_modules/electron" ]; then
  mv node_modules/electron node_modules/.electron-bin
fi

# Run electron, pointing to the binary directly
./node_modules/.electron-bin/dist/Electron.app/Contents/MacOS/Electron .

# Restore the electron npm package
if [ -d "node_modules/.electron-bin" ]; then
  mv node_modules/.electron-bin node_modules/electron
fi

