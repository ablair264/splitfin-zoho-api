#!/bin/bash
# build.sh - Build script for Render deployment

echo "🚀 Starting Render build process..."

# Set build environment
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf node_modules/.cache
rm -rf .cache

# Install dependencies using npm ci for faster, more reliable installs
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --production=false
else
    echo "⚠️  No package-lock.json found, using npm install"
    npm install --production=false
fi

# Rebuild native dependencies
echo "🔨 Rebuilding native dependencies..."
npm rebuild

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p temp

# Verify critical dependencies
echo "✅ Verifying critical dependencies..."
node -e "
try {
    require('firebase-admin');
    console.log('✅ firebase-admin loaded successfully');
} catch (e) {
    console.error('❌ Failed to load firebase-admin:', e.message);
    process.exit(1);
}

try {
    require('@google-cloud/firestore');
    console.log('✅ @google-cloud/firestore loaded successfully');
} catch (e) {
    console.error('❌ Failed to load @google-cloud/firestore:', e.message);
    process.exit(1);
}
"

echo "✅ Build completed successfully!"