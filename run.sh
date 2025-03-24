#!/bin/bash

# FlowState launcher script
# This script checks for dependencies, sets up the environment, and starts the application

# Directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$SCRIPT_DIR/.venv"

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

# Check for pip3
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}pip3 not found. Please install pip3.${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv "$VENV_DIR" || {
        echo -e "${YELLOW}Failed to create venv, trying with virtualenv...${NC}"
        if ! command -v virtualenv &> /dev/null; then
            pip3 install virtualenv
        fi
        virtualenv "$VENV_DIR"
    }
fi

# Activate virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate" || {
    echo -e "${RED}Failed to activate virtual environment.${NC}"
    exit 1
}

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Install Python dependencies
echo -e "${GREEN}Installing Python dependencies...${NC}"
pip3 install -r "$BACKEND_DIR/requirements.txt"

# Cleanup function to deactivate virtual environment
cleanup() {
    echo -e "${GREEN}Deactivating virtual environment...${NC}"
    deactivate
    exit
}

# Register cleanup function
trap cleanup EXIT

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