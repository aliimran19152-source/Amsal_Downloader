#!/bin/sh
echo "Starting bgutil PO token provider server..."
cd /opt/bgutil-provider/server
node build/main.js --port 4416 &

echo "Waiting for token provider to be ready..."
sleep 3

echo "Starting main downloader app..."
cd /app
node index.js
