# Chronos - Study Timer

A modern, full-stack time tracking application for focused productivity.

![Chronos](https://img.shields.io/badge/version-1.0.0-blue)

## Quick Start

### Option 1: Using Setup Scripts (Recommended)

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows:**
```cmd
setup.bat
```

### Option 2: Using npm
```bash
npm run setup
```

### Option 3: Manual Installation
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### Start the Application
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

## Features

### Timer
- **Triple Mode**: Stopwatch, Countdown, and Pomodoro timer
- **Pomodoro Mode**: Auto-cycling work/break intervals (25min work → 5min break → repeat)
- **Time Adjustments**: Add or remove time with quick buttons (±10s, ±1m, ±5m, etc.)
- **Manual Time Edit**: Click on the timer to set a specific time
- **Countdown Presets**: Quick preset buttons for common durations (15m, 25m, 45m, 1h, 2h)
- **Keyboard Shortcuts**: Space to start/pause, R to reset, S to save
- **Timer Settings**: Customizable durations, auto-start, notifications, display options

### Goals
- **Daily/Weekly/Monthly Targets**: Set and track time goals with visual progress
- **Streak Tracking**: Track consecutive days of activity
- **Category Targets**: Set specific goals per category
- **Milestones**: Create achievement milestones (e.g., "100 hours of coding")
- **Daily Medals**: Earn Bronze/Silver/Gold based on daily activity

### Categories
- **Hierarchical Organization**: Create categories with subcategories
- **Color Coding**: Assign colors to categories for visual organization
- **Statistics per Category**: View total time and session count per category
- **Flexible Assignment**: Assign sessions to categories before or during timing

### Session Tracking
- **Auto-save Timer State**: Timer persists across page refreshes
- **Session Details**: Add title, notes, and date to each session
- **Edit Sessions**: Modify session details, duration, and category after saving
- **Bulk Operations**: Select and delete multiple sessions at once
- **Filter & Search**: Find sessions by date, month, category, or text

### Analytics
- **Time-based Insights**: View today, weekly, monthly, and yearly statistics
- **Daily Activity Chart**: Visualize your tracking patterns over time
- **Category Breakdown**: See how time is distributed across categories
- **Heatmap Calendar**: GitHub-style activity heatmap for the past year
- **Streak Tracking**: Track consecutive days of activity
- **Best Day**: Highlight your most productive day

### Authentication
- **User Accounts**: Sign up and log in to sync data across devices
- **Guest Mode**: Use the app without an account (data stored locally)
- **Data Persistence**: Automatic cloud sync for logged-in users

### Data Management
- **Export/Import**: Backup and restore your data as JSON
- **Merge Import**: Imported data merges with existing data

## Tech Stack

### Frontend
- **React 18** - UI library
- **React Router** - Client-side routing
- **Recharts** - Charts and visualizations
- **Lucide React** - Icon library
- **Vite** - Build tool and dev server

### Backend
- **Node.js + Express** - API server
- **SQLite (better-sqlite3)** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd studytimer
```

2. Install all dependencies:
```bash
npm run install:all
```

Or manually:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Start the development servers:
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

### Production Build

```bash
cd client
npm run build
```

## Project Structure

```
studytimer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   └── styles/         # Global CSS
│   └── index.html
├── server/                 # Express backend
│   ├── db/                 # SQLite database
│   └── index.js            # Main server file
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/preferences` - Update preferences

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Sessions
- `GET /api/sessions` - List sessions (with filters)
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/bulk-delete` - Delete multiple sessions

### Analytics
- `GET /api/analytics/summary` - Get stats summary
- `GET /api/analytics/heatmap` - Get heatmap data

### Data
- `GET /api/export` - Export all user data
- `POST /api/import` - Import data

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |
| `S` | Save session |

## Future Enhancements

- [ ] Goals and targets
- [ ] Desktop notifications
- [ ] Pomodoro mode (work/break cycles)
- [ ] Dark/Light theme toggle
- [ ] PWA support for offline use
- [ ] Team/collaboration features
- [ ] Integrations (Google Calendar, etc.)

## License

MIT
