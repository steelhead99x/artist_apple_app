// User types
export type UserType = 'artist' | 'band' | 'studio' | 'manager';

export interface User {
  id: string;
  username: string;
  email: string;
  userType: UserType;
  profileImage?: string;
  bio?: string;
  createdAt: string;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  userType: UserType;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Project types (example - adjust based on your API)
export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  collaborators: User[];
  createdAt: string;
  updatedAt: string;
}

// Message types (example)
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}
