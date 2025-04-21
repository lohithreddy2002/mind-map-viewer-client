import React, { useState, useEffect } from 'react';
import './TopicList.css';

interface Topic {
  id: string;
  title: string;
  markdownContent?: string; // Primary field for storing markdown
  markdownPath?: string;    // Kept for backward compatibility
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  isExpanded: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

interface TopicListProps {
  onTopicSelect: (markdown: string, topicTitle: string) => void;
}

export const TopicList: React.FC<TopicListProps> = ({ onTopicSelect }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isTopicLoading, setIsTopicLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // Fetch subjects and their topics
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/subjects`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch subjects: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Transform data to include isExpanded flag
        const subjectsWithExpanded = data.map((subject: any) => ({
          ...subject,
          isExpanded: false,
          topics: subject.topics || []
        }));
        
        setSubjects(subjectsWithExpanded);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError('Failed to load subjects. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubjects();
  }, []);

  const toggleSubject = (subjectId: string) => {
    setSubjects(prevSubjects =>
      prevSubjects.map(subject => 
        subject.id === subjectId
          ? { ...subject, isExpanded: !subject.isExpanded }
          : subject
      )
    );
  };

  const handleTopicClick = async (subject: Subject, topic: Topic) => {
    try {
      setSelectedTopic(topic);
      setIsTopicLoading(true);
      setError(null);

      // If topic already has markdown content from MongoDB, use it directly
      if (topic.markdownContent) {
        console.log('Using pre-loaded markdown content from MongoDB');
        onTopicSelect(topic.markdownContent, topic.title);
        setIsTopicLoading(false);
        return;
      }

      // Fetch markdown content using the new MongoDB API route
      const response = await fetch(`${API_BASE_URL}/subjects/topics/${topic.id}/markdown`);
      
      if (!response.ok) {
        throw new Error(`Failed to load markdown: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Send the markdown content to the parent component
      onTopicSelect(data.markdown, topic.title);
    } catch (err) {
      console.error('Error loading markdown:', err);
      setError(`Failed to load markdown for ${topic.title}`);
    } finally {
      setIsTopicLoading(false);
    }
  };

  // Filter subjects and topics based on search term
  const filteredSubjects = searchTerm.trim() === '' 
    ? subjects 
    : subjects.map(subject => {
        // Filter topics within the subject
        const filteredTopics = subject.topics.filter(topic => 
          topic.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Return subject with filtered topics and expanded if there are matches
        return {
          ...subject,
          topics: filteredTopics,
          isExpanded: filteredTopics.length > 0 || subject.isExpanded
        };
      }).filter(subject => 
        // Keep subject if it has matching topics or its name matches
        subject.topics.length > 0 || 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="topic-list">
      <h2>Topics by Subject</h2>
      
      <div className="search-box">
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search" 
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      
      {error && <div className="topic-list-error">{error}</div>}
      
      {isLoading ? (
        <div className="topic-list-loading">
          <div className="spinner-small"></div>
          <span>Loading subjects...</span>
        </div>
      ) : (
        filteredSubjects.length === 0 ? (
          <div className="no-results">
            <p>No matching topics found</p>
            {searchTerm && (
              <button 
                className="clear-search-button"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="subject-list">
            {filteredSubjects.map((subject) => (
              <div key={subject.id} className="subject-container">
                <div 
                  className="subject-header" 
                  onClick={() => toggleSubject(subject.id)}
                >
                  <span className={`expand-icon ${subject.isExpanded ? 'expanded' : ''}`}>
                    {subject.isExpanded ? '▼' : '►'}
                  </span>
                  <h3>{subject.name}</h3>
                  
                  {searchTerm && subject.topics.length > 0 && (
                    <span className="match-count">
                      {subject.topics.length}
                    </span>
                  )}
                </div>
                {subject.isExpanded && (
                  <ul className="topic-items">
                    {subject.topics.map((topic) => (
                      <li
                        key={topic.id}
                        className={`topic-item ${selectedTopic?.id === topic.id ? 'selected' : ''} ${isTopicLoading && selectedTopic?.id === topic.id ? 'loading' : ''}`}
                        onClick={() => handleTopicClick(subject, topic)}
                      >
                        {topic.title}
                        {isTopicLoading && selectedTopic?.id === topic.id && (
                          <span className="topic-loading-indicator"></span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}; 