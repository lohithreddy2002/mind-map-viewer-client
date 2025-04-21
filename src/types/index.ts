export interface Subject {
  id: string;
  name: string;
  description?: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  markdownContent: string;
  // markdownPath is deprecated now that we use MongoDB storage
  // kept for backward compatibility with older clients
  markdownPath?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
} 