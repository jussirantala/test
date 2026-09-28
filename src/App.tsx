import React, { useState, useCallback, KeyboardEvent, useEffect, useMemo, useRef } from 'react';
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

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

  // ── Inline card editing ─────────────────────────────────────────────────
  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  }, []);

  const saveEdit = useCallback(async (id: number) => {
    if (editText.trim() === '') return;
    try {
      setError(null);
      await kanbanAPI.updateTodo(id, { text: editText.trim() });
      setTodos(prevTodos => prevTodos.map(t =>
        t.id === id ? { ...t, text: editText.trim() } : t
      ));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [editText]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveEdit(editingId!);
    if (e.key === 'Escape') cancelEdit();
  }, [editingId, saveEdit, cancelEdit]);

  // ── Drag and drop ───────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, todoId: number) => {
    dragItem.current = todoId;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, todoId: number) => {
    dragOverItem.current = todoId;
  }, []);

  const handleDragEnd = useCallback(async () => {
    const fromId = dragItem.current;
    const toId = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;

    if (fromId === null || toId === null || fromId === toId) return;

    const fromTodo = todos.find(t => t.id === fromId);
    const toTodo = todos.find(t => t.id === toId);
    if (!fromTodo || !toTodo || fromTodo.status === toTodo.status) return;

    await kanbanAPI.moveTodo(fromId, toTodo.status);
    setTodos(prevTodos => prevTodos.map(t =>
      t.id === fromId ? { ...t, status: toTodo.status } : t
    ));
  }, [todos]);

  // Memoize todos grouped by status to avoid repeated calls
  const todosByStatus = useMemo(() => {
    const map: Record<TodoStatus, Todo[]> = { 'todo': [], 'in-progress': [], 'done': [] };
    todos.forEach(t => map[t.status].push(t));
    return map;
  }, [todos]);

  const getTodosByStatus = useCallback((status: TodoStatus) => todosByStatus[status], [todosByStatus]);

  return (
    <div className="App">
      <div className={`kanban-container${loading ? ' loading' : ''}`}>
        <h1>Kanban Board</h1>
        
        <div className="input-section">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
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
            <div key={column.id} className="column" style={{ '--col-color': column.color } as React.CSSProperties} data-col={column.id}>
              <div className="column-header">
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
                      data-status={todo.status}
                      draggable
                      onDragStart={e => handleDragStart(e, todo.id)}
                      onDragEnter={e => handleDragEnter(e, todo.id)}
                      onDragOver={e => e.preventDefault()}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="card-body">
                        {editingId === todo.id ? (
                          <input
                            type="text"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={() => saveEdit(todo.id)}
                            autoFocus
                          />
                        ) : (
                          <p onDoubleClick={() => startEdit(todo)}>{todo.text}</p>
                        )}
                        <div className="card-actions">
                          {editingId !== todo.id && (
                            <>
                              {todo.status !== 'todo' && (
                                <button
                                  onClick={() => moveTodo(todo.id, 'prev')}
                                  className="move-btn"
                                  title="Move back"
                                  aria-label="Move task back"
                                >
                                  ←
                                </button>
                              )}
                              {todo.status !== 'done' && (
                                <button
                                  onClick={() => moveTodo(todo.id, 'next')}
                                  className="move-btn"
                                  title="Move forward"
                                  aria-label="Move task forward"
                                >
                                  →
                                </button>
                              )}
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="delete-btn"
                                title="Delete"
                                aria-label="Delete task"
                              >
                                <span aria-hidden="true">×</span>Delete
                              </button>
                            </>
                          )}
                          {editingId === todo.id && (
                            <button
                              onClick={() => saveEdit(todo.id)}
                              className="move-btn"
                              title="Save"
                              aria-label="Save task"
                            >
                              ✓
                            </button>
                          )}
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
