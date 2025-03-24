# FlowState Productivity App

A desktop productivity application built with Electron and FastAPI for task management and focus tracking.

## Features

- Task management with priority and status tracking
- Focus sessions with time tracking
- Productivity statistics and visualizations
- User settings customization
- Cross-platform desktop application

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Python 3.8+
- pip

### Installation

1. Clone this repository
2. Run the setup script:
```
./run.sh
```

### Development

For development mode:
```
./run.sh --dev
```

### Web Dashboard

If you prefer to use the web version:
```
./web_dashboard.sh
```

## Architecture

- **Frontend**: Electron-based desktop app with HTML/CSS/JavaScript
- **Backend**: FastAPI Python server
- **Database**: SQLite database for data storage

## License

MIT 