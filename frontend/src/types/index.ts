// Central export file for all types
export * from './user';
export * from './vehicle';
export * from './booking';
export * from './investment';
export * from './campaign';
export * from './review';
export * from './notification';

// Common types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
