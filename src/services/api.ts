import { Subject, Topic, ApiResponse } from '../types';

// API base URL - direct access to backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mindmap-backend-eight.vercel.app/api';
const ADMIN_API_URL = `${API_BASE_URL}/admin`;

// API Key for admin endpoints - in a real app, this would be stored more securely
const API_KEY = 'admin-secret-key';

// Helper for making API requests
const fetchApi = async <T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    console.log(`Fetching: ${url}`, options);
    const response = await fetch(url, options);
    
    // Check for non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Received non-JSON response from ${url} (${response.status}):`, text);
      return {
        success: false,
        error: `API returned non-JSON response (${response.status})`
      };
    }
    
    // Parse JSON once
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data && typeof data === 'object' && 'error' in data 
        ? data.error as string
        : `API request failed with status ${response.status}`;
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    console.log(`Response from ${url}:`, data);
    
    // If data already has a success property, assume it's already an ApiResponse
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }
    
    // Otherwise, wrap it in an ApiResponse
    return {
      success: true,
      data: data as T
    };
  } catch (error) {
    // Detect CORS errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error(`CORS or network error for ${url}:`, error);
      return {
        success: false,
        error: `CORS or network error: ${error instanceof Error ? error.message : String(error)}. Make sure the backend server is running.`
      };
    }
    
    console.error(`API Error for ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Admin API endpoints with authentication
const adminFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...(options.headers as Record<string, string>)
  };
  
  return fetchApi<T>(`${ADMIN_API_URL}${endpoint}`, {
    ...options,
    headers
  });
};

// Public API endpoints
const api = {
  // Get all subjects
  getSubjects: async (): Promise<ApiResponse<Subject[]>> => {
    return adminFetch<Subject[]>('/subjects');
  },
  
  // Get topics for a subject
  getTopics: async (subjectId: string): Promise<ApiResponse<Topic[]>> => {
    try {
      // Use the public API to fetch the subject (not admin)
      const response = await fetchApi<any>(`${API_BASE_URL}/subjects/${subjectId}`);
      
      if (!response.success || !response.data || !response.data.topics) {
        console.warn(`No topics found for subject ${subjectId}`);
        return {
          success: true,
          data: []
        };
      }
      
      // Map to our frontend Topic type
      const topics = response.data.topics.map((topic: any) => ({
        id: topic.id,
        subjectId: subjectId,
        title: topic.title,
        description: topic.description || '',
        markdownContent: topic.markdownContent || '' // Main field for markdown from MongoDB
      }));
      
      return {
        success: true,
        data: topics
      };
    } catch (error) {
      console.error(`Error fetching topics for subject ${subjectId}:`, error);
      return {
        success: false,
        error: `Error fetching topics: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  // Get markdown content for a topic
  getTopicMarkdown: async (subjectId: string, topicId: string): Promise<ApiResponse<string>> => {
    try {
      // Use the updated endpoint path for MongoDB backend
      const response = await fetchApi<{ markdown: string }>(
        `${API_BASE_URL}/subjects/topics/${topicId}/markdown`
      );
      
      if (!response.success) {
        return {
          success: false,
          error: response.error
        };
      }
      
      return {
        success: true,
        data: response.data?.markdown || ''
      };
    } catch (error) {
      console.error(`Failed to fetch markdown for topic ${topicId}:`, error);
      return {
        success: false,
        error: `Failed to fetch markdown: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  // Create a new subject
  createSubject: async (name: string, description: string = ''): Promise<ApiResponse<Subject>> => {
    return adminFetch<Subject>('/subjects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  },
  
  // Delete a subject
  deleteSubject: async (subjectId: string): Promise<ApiResponse<void>> => {
    return adminFetch<void>(`/subjects/${subjectId}`, {
      method: 'DELETE'
    });
  },
  
  // Create a new topic
  createTopic: async (
    subjectId: string, 
    title: string, 
    description: string = ''
  ): Promise<ApiResponse<Topic>> => {
    return adminFetch<Topic>(`/subjects/${subjectId}/topics`, {
      method: 'POST',
      body: JSON.stringify({ 
        title,
        description,
        markdown: '' // Initial empty markdown content
      })
    });
  },
  
  // Update a topic's markdown content
  updateTopicMarkdown: async (topicId: string, markdown: string): Promise<ApiResponse<Topic>> => {
    return adminFetch<Topic>(`/topics/${topicId}/markdown`, {
      method: 'PUT',
      body: JSON.stringify({ markdown })
    });
  },
  
  // Delete a topic
  deleteTopic: async (topicId: string): Promise<ApiResponse<void>> => {
    return adminFetch<void>(`/topics/${topicId}`, {
      method: 'DELETE'
    });
  },
  
  // Upload markdown file for a topic
  uploadTopicMarkdown: async (topicId: string, file: File): Promise<ApiResponse<void>> => {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('markdown', file);
    
    // Use special headers (or lack thereof) for multipart/form-data
    const headers = {
      'X-API-Key': API_KEY
    };
    
    // Make the request to the updated endpoint
    try {
      const response = await fetch(`${ADMIN_API_URL}/topics/${topicId}/markdown`, {
        method: 'POST',
        body: formData,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error:', errorText);
        return {
          success: false,
          error: `Upload failed: ${response.status} - ${errorText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data as void
      };
    } catch (error) {
      console.error(`File upload error:`, error);
      return {
        success: false,
        error: `File upload error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  // Process a ZIP file for bulk import
  processZipFile: async (file: File): Promise<ApiResponse<{subjects: number, topics: number}>> => {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('zipFile', file);
    
    // Use special headers for multipart/form-data
    const headers = {
      'X-API-Key': API_KEY
    };
    
    // Make the request to the new endpoint
    try {
      const response = await fetch(`${ADMIN_API_URL}/import/zip`, {
        method: 'POST',
        body: formData,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ZIP upload error:', errorText);
        return {
          success: false,
          error: `ZIP upload failed: ${response.status} - ${errorText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data as {subjects: number, topics: number}
      };
    } catch (error) {
      console.error(`ZIP file upload error:`, error);
      return {
        success: false,
        error: `ZIP file upload error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

export default api; 