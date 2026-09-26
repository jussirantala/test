// API client for the Kanban backend
import { Todo, TodoStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class KanbanAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Get all todos
  async getTodos(): Promise<{ success: boolean; data: Todo[]; total: number }> {
    return this.request<{ success: boolean; data: Todo[]; total: number }>('/todos');
  }

  // Get single todo by ID
  async getTodo(id: number): Promise<{ success: boolean; data: Todo }> {
    return this.request<{ success: boolean; data: Todo }>(`/todos/${id}`);
  }

  // Create a new todo
  async createTodo(text: string, status: TodoStatus = 'todo'): Promise<{ success: boolean; data: Todo; message: string }> {
    return this.request<{ success: boolean; data: Todo; message: string }>('/todos', {
      method: 'POST',
      body: JSON.stringify({ text, status }),
    });
  }

  // Update a todo
  async updateTodo(
    id: number,
    updates: Partial<Pick<Todo, 'text' | 'status'>>
  ): Promise<{ success: boolean; data: Todo; message: string }> {
    return this.request<{ success: boolean; data: Todo; message: string }>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Delete a todo
  async deleteTodo(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/todos/${id}`, {
      method: 'DELETE',
    });
  }

  // Delete all todos
  async deleteAllTodos(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/todos', {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.request<{ success: boolean; message: string; timestamp: string }>('/health');
  }

  // Move a todo to a new status
  async moveTodo(id: number, status: TodoStatus): Promise<{ success: boolean; data: Todo; message: string }> {
    return this.updateTodo(id, { status });
  }
}

// Export singleton instance
export const kanbanAPI = new KanbanAPI();
export default kanbanAPI;
