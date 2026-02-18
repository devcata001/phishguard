#!/bin/bash

# PhishGuard Backend - Production Deployment Script
# This script prepares and deploys the Node.js backend

set -e

echo "🚀 PhishGuard Backend Deployment"
echo "================================"

# Check Node.js version
required_node_version="18"
current_node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$current_node_version" -lt "$required_node_version" ]; then
    echo "❌ Error: Node.js version $required_node_version or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --production

# Run tests (optional, comment out for quick deploy)
if [ "${SKIP_TESTS}" != "true" ]; then
    echo ""
    echo "🧪 Running tests..."
    npm test
fi

# Build Docker image (if using Docker)
if [ "${USE_DOCKER}" = "true" ]; then
    echo ""
    echo "🐳 Building Docker image..."
    docker build -t phishguard-api:latest .
    
    echo ""
    echo "✓ Docker image built successfully"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 5000:5000 --env-file .env phishguard-api:latest"
fi

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in .env file"
echo "2. Start the server: npm start"
echo "3. Test health endpoint: curl http://localhost:5000/health"
