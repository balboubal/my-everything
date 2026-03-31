#!/bin/bash

# Chronos Study Timer - Setup Script
# This script installs all dependencies and sets up the project

set -e  # Exit on error

echo "╔════════════════════════════════════════╗"
echo "║     Chronos Study Timer Setup          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✓ npm $(npm -v) detected"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..
echo ""

echo "╔════════════════════════════════════════╗"
echo "║     ✅ Setup Complete!                 ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "To start the application, run:"
echo ""
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  • Frontend at http://localhost:5173"
echo "  • Backend at http://localhost:3001"
echo ""
echo "Happy tracking! 🍅"
