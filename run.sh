#!/bin/bash

# FlowState launcher script
# This script checks for dependencies, sets up the environment, and starts the application

# Directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for required dependencies
echo -e "${GREEN}Checking dependencies...${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js and npm.${NC}"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 not found. Please install Python 3.${NC}"
    exit 1
fi

# Check for uvicorn
if ! command -v uvicorn &> /dev/null; then
    echo -e "${YELLOW}uvicorn not found. Installing it globally...${NC}"
    sudo apt-get install -y python3-fastapi python3-uvicorn python3-sqlalchemy python3-pydantic || {
        echo -e "${RED}Failed to install required Python packages.${NC}"
        exit 1
    }
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Start the application
if [[ "$1" == "--dev" ]]; then
    # Development mode
    echo -e "${GREEN}Starting FlowState in development mode...${NC}"
    python3 "$BACKEND_DIR/main.py" &
    npm run dev
else
    # Production mode
    echo -e "${GREEN}Starting FlowState...${NC}"
    python3 "$BACKEND_DIR/main.py" &
    npm start
fi 