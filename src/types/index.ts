// Types for the Kanban Board
export interface Todo {
  id: number;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  created_at?: string;
  updated_at?: string;
}

export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface KanbanColumn {
  id: TodoStatus;
  title: string;
  color: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
