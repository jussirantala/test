import React, { useState, useCallback, KeyboardEvent, useEffect } from 'react';
import './App.scss';
import { kanbanAPI } from './services/kanbanApi';
import { Todo, TodoStatus } from './types';

interface KanbanColumn {
  id: TodoStatus;
  title: string;
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#4a90d9' },
  { id: 'in-progress', title: 'In Progress', color: '#f5a623' },
  { id: 'done', title: 'Done', color: '#7bd693' }
];

const KanbanBoard: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedColumn, setSelectedColumn] = useState<TodoStatus>('todo');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos from API on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await kanbanAPI.getTodos();
      setTodos(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTodo = useCallback(async () => {
    if (inputValue.trim() !== '') {
      try {
        setError(null);
        const response = await kanbanAPI.createTodo(inputValue.trim(), selectedColumn);
        setTodos(prevTodos => [...prevTodos, response.data]);
        setInputValue('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add todo');
        console.error('Error adding todo:', err);
      }
    }
  }, [inputValue, selectedColumn]);

  const moveTodo = useCallback(async (id: number, direction: 'next' | 'prev') => {
    try {
      setError(null);
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      const statuses: TodoStatus[] = ['todo', 'in-progress', 'done'];
      const currentIndex = statuses.indexOf(todo.status);
      const newIndex = direction === 'next'
        ? Math.min(currentIndex + 1, statuses.length - 1)
        : Math.max(currentIndex - 1, 0);
      const newStatus = statuses[newIndex];

      await kanbanAPI.moveTodo(id, newStatus);
      setTodos(prevTodos => prevTodos.map(t =>
        t.id === id ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move todo');
      console.error('Error moving todo:', err);
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id: number) => {
    try {
      setError(null);
      await kanbanAPI.deleteTodo(id);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
      console.error('Error deleting todo:', err);
    }
  }, []);

  const handleKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  }, [addTodo]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const getTodosByStatus = (status: TodoStatus) => {
    return todos.filter(todo => todo.status === status);
  };

  return (
    <div className="App">
      <div className="kanban-container">
        <h1>Kanban Board</h1>
        
        <div className="input-section">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Add a new task..."
            disabled={loading}
          />
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value as TodoStatus)}
            disabled={loading}
          >
            {COLUMNS.map(column => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
          <button onClick={addTodo} disabled={loading}>
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchTodos}>Retry</button>
          </div>
        )}

        <div className="board">
          {COLUMNS.map(column => (
            <div key={column.id} className="column" style={{ borderColor: column.color }}>
              <div className="column-header" style={{ backgroundColor: column.color }}>
                <h2>{column.title}</h2>
                <span className="count">{getTodosByStatus(column.id).length}</span>
              </div>
              <div className="column-content">
                {getTodosByStatus(column.id).length === 0 ? (
                  <div className="empty-column">No tasks</div>
                ) : (
                  getTodosByStatus(column.id).map(todo => (
                    <div
                      key={todo.id}
                      className={`card ${todo.status}`}
                      style={{ borderTopColor: column.color }}
                    >
                      <div className="card-body">
                        <p>{todo.text}</p>
                        <div className="card-actions">
                          {todo.status !== 'todo' && (
                            <button
                              onClick={() => moveTodo(todo.id, 'prev')}
                              className="move-btn"
                              title="Move back"
                            >
                              ←
                            </button>
                          )}
                          {todo.status !== 'done' && (
                            <button
                              onClick={() => moveTodo(todo.id, 'next')}
                              className="move-btn"
                              title="Move forward"
                            >
                              →
                            </button>
                          )}
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="delete-btn"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
