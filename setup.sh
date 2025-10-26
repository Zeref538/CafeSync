#!/bin/bash

# CafeSync Quick Start Script
# This script will set up and run CafeSync for your team

echo "🚀 CafeSync Quick Start Script"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    echo "   Download from: https://git-scm.com/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "✅ Environment file created. You may need to edit .env with your settings."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Open Terminal 1 and run: cd server && npm start"
echo "2. Open Terminal 2 and run: cd client && npm start"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "For detailed instructions, see: TEAM_SETUP_GUIDE.md"
