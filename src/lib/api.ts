// src/lib/api.ts

// 类型定义
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: 'tutorial' | 'tech' | 'dataset' | 'code';
  tags: Tag[];
  author: User;
  published: boolean;
  views: number;
  likes: number;
  comments_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions';

// 辅助函数：处理 API 响应
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '请求失败');
  }
  return response.json();
}

// 获取认证 headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// API 实现
export const api = {
  // 用户认证
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    return handleResponse<{ user: User; token: string }>(response);
  },

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    return handleResponse<{ user: User; token: string }>(response);
  },

  // 文章相关
  async getPosts(): Promise<Post[]> {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<Post[]>(response);
  },

  async getPost(id: string): Promise<Post> {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<Post>(response);
  },

  async createPost(data: CreatePostData): Promise<Post> {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<Post>(response);
  },

  async updatePost(id: string, data: Partial<CreatePostData>): Promise<Post> {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<Post>(response);
  },

  async deletePost(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse<void>(response);
  },

  // 点赞功能
  async likePost(id: string): Promise<{ likes: number }> {
    const response = await fetch(`${API_BASE_URL}/posts/${id}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse<{ likes: number }>(response);
  },

  // 评论功能
  async getComments(postId: string): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<Comment[]>(response);
  },

  async createComment(postId: string, content: string): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    return handleResponse<Comment>(response);
  },

  // 标签相关
  async getTags(): Promise<Tag[]> {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<Tag[]>(response);
  },

  // 用户资料
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<User>(response);
  },

  // 文件上传
  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    return handleResponse<{ url: string }>(response);
  },

  // 错误处理示例
  async handleError(error: any): Promise<never> {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // 未授权，清除本地存储并重定向到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    throw error;
  },

  // 工具方法
  getImageUrl(path: string): string {
    return path.startsWith('http') ? path : `${API_BASE_URL}/uploads/${path}`;
  },

  // 格式化日期
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
};

// 导出错误类
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 导出工具函数
export const utils = {
  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  // 获取当前用户
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // 清除认证信息
  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // 检查权限
  hasPermission(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const roles = {
      admin: 3,
      teacher: 2,
      student: 1,
    };
    
    return roles[user.role as keyof typeof roles] >= roles[requiredRole as keyof typeof roles];
  },
};

export default api;