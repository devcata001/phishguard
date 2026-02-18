#!/bin/bash

# PhishGuard Backend - Quick Start Script
# Automated setup and launch for development

set -e

echo "🛡️  PhishGuard Backend - Quick Start"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required"
    echo "   Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your GEMINI_API_KEY"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Ask if user wants to run tests
read -p "🧪 Run tests before starting? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running tests..."
    npm test
    echo ""
fi

# Start the server
echo "🚀 Starting PhishGuard API..."
echo ""
echo "The API will be available at:"
echo "  - Health: http://localhost:5000/health"
echo "  - Analyze: http://localhost:5000/analyze"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
