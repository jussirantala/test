# React Kanban Board with Node.js Backend

A Kanban board application with a Node.js backend using Express and SQLite.

## Project Structure

```
├── public/                 # React public assets
├── src/
│   ├── server/            # Node.js backend
│   │   └── index.ts       # Express server with SQLite
│   ├── services/          # API client
│   │   └── kanbanApi.ts   # REST API client
│   ├── types/             # TypeScript types
│   │   └── index.ts       # Shared interfaces
│   ├── App.tsx            # Main Kanban board component
│   ├── App.scss           # SCSS styles
│   └── index.tsx          # React entry point
├── .env                   # Environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

## Features

- **Three columns**: To Do, In Progress, Done
- **RESTful API**: Full CRUD operations via Express
- **SQLite database**: Persistent data storage
- **TypeScript**: Full type safety
- **SCSS styles**: Modern, responsive design
- **Loading states**: Visual feedback during API calls
- **Error handling**: User-friendly error messages with retry
- **Auto-seeded data**: Sample tasks on first run

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install all dependencies
npm install
```

### Running the Application

**Development mode (both frontend and backend):**

```bash
# Starts both servers (backend on :5000, frontend on :3000)
npm run dev
```

**Start servers individually:**

```bash
# Start the Node.js backend (separate terminal)
npm run server

# Start the React frontend (separate terminal)
npm start
```

**Production:**

```bash
# Build the React app
npm run build

# Start the backend server
npm run server:prod
```

### API Endpoints

| Method | Endpoint           | Description         |
|--------|-------------------|---------------------|
| GET    | `/api/todos`       | Get all todos       |
| GET    | `/api/todos/:id`   | Get single todo     |
| POST   | `/api/todos`       | Create new todo     |
| PUT    | `/api/todos/:id`   | Update todo         |
| DELETE | `/api/todos/:id`   | Delete todo         |
| DELETE | `/api/todos`       | Delete all todos    |
| GET    | `/api/health`      | Health check        |

## Tech Stack

### Frontend
- React 18 with TypeScript
- SCSS for styling
- Custom API client

### Backend
- Node.js with Express
- SQLite (via better-sqlite3)
- CORS enabled
