import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import sqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database setup
const DB_PATH = path.join(__dirname, '../../data', 'kanban.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = sqlite3(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Interfaces
interface Todo {
  id: number;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  created_at: string;
  updated_at: string;
}

// Helper functions
function getTodos(): Todo[] {
  const stmt = db.prepare('SELECT * FROM todos ORDER BY created_at ASC');
  return stmt.all() as Todo[];
}

function getTodoById(id: number): Todo | undefined {
  const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
  return stmt.get(id) as Todo | undefined;
}

function insertTodo(text: string, status: string): Todo {
  const stmt = db.prepare(
    'INSERT INTO todos (text, status) VALUES (?, ?)'
  );
  const result = stmt.run(text, status);
  const todo = getTodoById(result.lastInsertRowid as number);
  return todo!;
}

function updateTodo(id: number, updates: Partial<Pick<Todo, 'text' | 'status'>>): Todo | undefined {
  const existing = getTodoById(id);
  if (!existing) return undefined;

  const fields = Object.entries(updates)
    .map(([key, value]) => `${key} = ?`)
    .join(', ');
  
  const values = Object.values(updates);
  values.push(id);

  const stmt = db.prepare(
    `UPDATE todos SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  );
  stmt.run(...values);
  
  return getTodoById(id);
}

function deleteTodo(id: number): boolean {
  const existing = getTodoById(id);
  if (!existing) return false;

  const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
  stmt.run(id);
  return true;
}

function deleteAllTodos(): void {
  db.exec('DELETE FROM todos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name='todos';");
}

// Routes

// Get all todos
app.get('/api/todos', (_req: Request, res: Response) => {
  try {
    const todos = getTodos();
    res.json({
      success: true,
      data: todos,
      total: todos.length
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single todo by ID
app.get('/api/todos/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const todo = getTodoById(id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: `Todo with id ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new todo
app.post('/api/todos', (req: Request, res: Response) => {
  try {
    const { text, status } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Text is required and must be a string'
      });
    }
    
    const validStatuses = ['todo', 'in-progress', 'done'];
    const todoStatus = (status || 'todo') as 'todo' | 'in-progress' | 'done';
    
    if (!validStatuses.includes(todoStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const todo = insertTodo(text, todoStatus);
    
    res.status(201).json({
      success: true,
      data: todo,
      message: 'Todo created successfully'
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create todo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update existing todo
app.put('/api/todos/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { text, status } = req.body;
    
    const existing = getTodoById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Todo with id ${id} not found`
      });
    }
    
    const updates: Partial<Pick<Todo, 'text' | 'status'>> = {};
    
    if (text !== undefined) {
      if (typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Text must be a string'
        });
      }
      updates.text = text;
    }
    
    if (status !== undefined) {
      const validStatuses = ['todo', 'in-progress', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      updates.status = status as 'todo' | 'in-progress' | 'done';
    }
    
    const updated = updateTodo(id, updates);
    
    res.json({
      success: true,
      data: updated,
      message: 'Todo updated successfully'
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete todo
app.delete('/api/todos/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = deleteTodo(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Todo with id ${id} not found`
      });
    }
    
    res.json({
      success: true,
      message: `Todo with id ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete all todos
app.delete('/api/todos', (_req: Request, res: Response) => {
  try {
    deleteAllTodos();
    res.json({
      success: true,
      message: 'All todos deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all todos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all todos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Kanban API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kanban API server running on http://localhost:${PORT}`);
    console.log(`Database path: ${DB_PATH}`);
    
    // Seed some sample data if database is empty
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM todos');
    const count = countStmt.get() as { count: number };
    
    if (count.count === 0) {
      console.log('Seeding sample data...');
      const sampleTodos = [
        { text: 'Design wireframes', status: 'todo' },
        { text: 'Set up project structure', status: 'in-progress' },
        { text: 'Create API endpoints', status: 'done' },
        { text: 'Write unit tests', status: 'todo' },
        { text: 'Deploy to production', status: 'done' }
      ];
      
      const insertStmt = db.prepare(
        'INSERT INTO todos (text, status) VALUES (?, ?)'
      );
      
      sampleTodos.forEach(todo => {
        insertStmt.run(todo.text, todo.status);
      });
      
      console.log('Sample data seeded successfully!');
    }
  });
}

export { app, db };
