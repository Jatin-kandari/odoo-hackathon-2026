# TransitOps - Smart Transport Operations Platform

A comprehensive fleet management system for logistics companies to manage vehicles, drivers, trips, maintenance, and expenses.

## Problem Statement

Many logistics companies rely on spreadsheets and manual logbooks for transport operations, leading to scheduling conflicts, underutilized vehicles, missed maintenance, expired driver licenses, and poor operational visibility. TransitOps solves this by providing a centralized platform for complete transport lifecycle management.

## Features

- Vehicle registry with unique registration tracking
- Driver management with license expiry monitoring
- Trip dispatcher with full lifecycle (Draft to Completed)
- Automatic status transitions for vehicles and drivers
- Maintenance scheduling with vehicle status auto-update
- Fuel and expense logging with auto-calculations
- Reports and analytics with interactive charts
- CSV export functionality
- Role-based authentication (Admin, Dispatcher)
- Responsive design

## Tech Stack

**Frontend:** HTML5, CSS3, JavaScript, Chart.js
**Backend:** Node.js, Express.js
**Database:** SQLite (better-sqlite3)
**Authentication:** JWT, bcrypt

## Prerequisites

- Node.js version 20 or higher
- npm

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Jatin-kandari/transitops.git
cd transitops

### 2.Run backend server
cd server 
npm run dev

## open new terminal
cd client
python3 -m http.server 8080

###Demo Credentials
    Admin: admin@transitops.com / admin123
    Dispatcher: dispatcher@transitops.com / user123

## project structure
transitops/
├── client/                 # Frontend
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── pages/             # HTML pages
│
└── server/                # Backend
    ├── controllers/       # Business logic
    ├── routes/            # API routes
    ├── middleware/        # Auth middleware
    ├── database/          # SQLite database
    └── server.js          # Main server file

#Business Rules

    Vehicle registration numbers must be unique
    Retired or In-Shop vehicles cannot be assigned to trips
    Drivers with expired licenses cannot be assigned to trips
    Suspended drivers are blocked from trip assignment
    Cargo weight cannot exceed vehicle capacity
    Dispatching a trip automatically updates vehicle and driver status to On Trip
    Completing a trip restores vehicle and driver to Available
    Creating maintenance automatically changes vehicle status to In Shop
    Closing maintenance restores vehicle to Available

##Team

    Team Leader - Backend, Maintenance, Fuel & Expenses, Reports, Authentication
    Member 2 - Vehicles, Drivers, Trip Dispatcher
    Member 3 - Additional features and testing
