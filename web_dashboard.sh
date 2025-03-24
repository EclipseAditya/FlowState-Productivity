#!/bin/bash

# FlowState Web Dashboard Launcher
# This script starts both the backend API and a simple web server to serve the frontend files

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill any existing processes
echo -e "${YELLOW}Stopping any running servers...${NC}"
pkill -f "python3 backend/main.py" &>/dev/null
pkill -f "python3 -m http.server" &>/dev/null

# Create web version of frontend JavaScript files
echo -e "${GREEN}Creating web versions of JavaScript files...${NC}"

# Find all JS files in frontend/js and create web versions
JS_DIR="frontend/js"
if [ -d "$JS_DIR" ]; then
    for js_file in $JS_DIR/*.js; do
        if [ -f "$js_file" ]; then
            # Skip if already a web version
            if [[ "$js_file" == *web-api.js ]]; then
                continue
            fi
            
            # Create a temp file
            temp_file=$(mktemp)
            
            # Replace electron API calls with fetch API calls
            sed 's/window.api.getTasks()/fetch("http:\/\/localhost:8000\/tasks\/").then(response => response.json())/g' "$js_file" | \
            sed 's/window.api.createTask(\([^)]*\))/fetch("http:\/\/localhost:8000\/tasks\/", { method: "POST", headers: { "Content-Type": "application\/json" }, body: JSON.stringify(\1) }).then(response => response.json())/g' | \
            sed 's/window.api.updateTask(\([^,]*\), \([^)]*\))/fetch(`http:\/\/localhost:8000\/tasks\/${\1}`, { method: "PUT", headers: { "Content-Type": "application\/json" }, body: JSON.stringify(\2) }).then(response => response.json())/g' | \
            sed 's/window.api.deleteTask(\([^)]*\))/fetch(`http:\/\/localhost:8000\/tasks\/${\1}`, { method: "DELETE" })/g' | \
            sed 's/window.api.getSessions()/fetch("http:\/\/localhost:8000\/sessions\/").then(response => response.json())/g' | \
            sed 's/window.api.createSession(\([^)]*\))/fetch("http:\/\/localhost:8000\/sessions\/", { method: "POST", headers: { "Content-Type": "application\/json" }, body: JSON.stringify(\1) }).then(response => response.json())/g' | \
            sed 's/window.api.updateSession(\([^,]*\), \([^)]*\))/fetch(`http:\/\/localhost:8000\/sessions\/${\1}`, { method: "PUT", headers: { "Content-Type": "application\/json" }, body: JSON.stringify(\2) }).then(response => response.json())/g' | \
            sed 's/window.api.getStatistics()/fetch("http:\/\/localhost:8000\/statistics\/").then(response => response.json())/g' | \
            sed 's/window.api.getSettings()/fetch("http:\/\/localhost:8000\/settings\/").then(response => response.json())/g' | \
            sed 's/window.api.updateSettings(\([^)]*\))/fetch("http:\/\/localhost:8000\/settings\/", { method: "POST", headers: { "Content-Type": "application\/json" }, body: JSON.stringify(\1) }).then(response => response.json())/g' > "$temp_file"
            
            # Update the original file
            cat "$temp_file" > "$js_file"
            rm "$temp_file"
            
            echo -e "Updated ${YELLOW}$js_file${NC} for web"
        fi
    done
fi

# Start the backend server
echo -e "${GREEN}Starting FlowState backend server...${NC}"
python3 backend/main.py &
BACKEND_PID=$!

# Wait for the backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 2

# Start a simple HTTP server to serve the frontend files
echo -e "${GREEN}Starting web server for frontend...${NC}"
cd frontend && python3 -m http.server 8080 &
FRONTEND_PID=$!

echo -e "${GREEN}FlowState Web Dashboard is running!${NC}"
echo -e "Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:8080${NC}"
echo -e "Press Ctrl+C to stop the servers"

# Wait for Ctrl+C
trap "echo -e '${RED}Stopping servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait 