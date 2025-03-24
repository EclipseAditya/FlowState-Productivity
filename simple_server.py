#!/usr/bin/env python3
"""
Simple HTTP server for serving static files
"""

import http.server
import socketserver
import os
import sys

def run_server(directory="frontend", port=8080):
    """Run a simple HTTP server for static files"""
    handler = http.server.SimpleHTTPRequestHandler
    
    # Change directory if needed
    if directory:
        os.chdir(directory)
    
    # Create server
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving at http://localhost:{port}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
            sys.exit(0)

if __name__ == "__main__":
    # Get port from command line if provided
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}")
            sys.exit(1)
    
    run_server(port=port) 