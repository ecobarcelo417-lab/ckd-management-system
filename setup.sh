#!/bin/bash

echo "=========================================="
echo "CKD Management System - Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Error: Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Setup Backend
echo "Setting up Backend..."
echo "---------------------"
cd "$SCRIPT_DIR/backend"

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend dependencies already installed."
fi

echo ""

# Setup Frontend
echo "Setting up Frontend..."
echo "----------------------"
cd "$SCRIPT_DIR/app"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed."
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo ""
echo "1. Start the Backend (Terminal 1):"
echo "   cd CKD_Management_System/backend && npm start"
echo ""
echo "2. Start the Frontend (Terminal 2):"
echo "   cd CKD_Management_System/app && npm run dev"
echo ""
echo "3. Open your browser and navigate to:"
echo "   http://localhost:5173"
echo ""
echo "Demo Accounts:"
echo "  Admin:     admin / admin123"
echo "  Doctor:    doctor1 / doctor123"
echo "  Nurse:     nurse1 / nurse123"
echo "  Patient:   patient1 / patient123"
echo ""
