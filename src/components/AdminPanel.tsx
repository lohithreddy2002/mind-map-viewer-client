import React, { useState, useEffect, useRef } from 'react';
import './AdminPanel.css';
import { Subject, Topic, ApiResponse } from '../types';
import api from '../services/api';

// Enum for active tab in the admin panel
enum AdminTab {
  DASHBOARD = 'dashboard',
  SUBJECTS = 'subjects',
  IMPORT = 'import',
  SETTINGS = 'settings'
}

const AdminPanel: React.FC = () => {
  // State for subject and topic management
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });
  const [newTopic, setNewTopic] = useState({ title: '', description: '' });
  const [newMarkdown, setNewMarkdown] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return document.body.classList.contains('dark-theme');
  });
  
  // ZIP import related state
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.SUBJECTS);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importedItems, setImportedItems] = useState<{subjects: number, topics: number}>({ subjects: 0, topics: 0 });
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalTopics: 0,
    recentlyUpdated: []
  });
  
  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markdownFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSubjects();
    
    // Auto-collapse sidebar on small screens
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);
  
  useEffect(() => {
    // Update dashboard stats
    setStats({
      totalSubjects: subjects.length,
      totalTopics: topics.length,
      recentlyUpdated: []
    });
  }, [subjects, topics]);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      return newMode;
    });
  };

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSubjects();
      if (response.success && response.data) {
        setSubjects(response.data);
        if (response.data.length > 0 && !selectedSubject) {
          setSelectedSubject(response.data[0].id);
        }
      } else {
        setError(response.error || 'Failed to load subjects');
      }
    } catch (err) {
      setError('Error fetching subjects: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async (subjectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getTopics(subjectId);
      if (response.success && response.data) {
        setTopics(response.data);
      } else {
        setError(response.error || 'Failed to load topics');
      }
    } catch (err) {
      setError('Error fetching topics: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
  };

  const handleNewSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSubject(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTopic(prev => ({ ...prev, [name]: value }));
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewMarkdown(e.target.files[0]);
    }
  };

  const addSubject = async () => {
    if (!newSubject.name.trim()) {
      setError('Subject name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.createSubject(newSubject.name, newSubject.description);
      if (response.success && response.data) {
        setSubjects(prev => [...prev, response.data as Subject]);
        setNewSubject({ name: '', description: '' });
        setSuccess('Subject added successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to add subject');
      }
    } catch (err) {
      setError('Error adding subject: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subject? All associated topics will also be deleted.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.deleteSubject(id);
      if (response.success) {
        setSubjects(prev => prev.filter(subject => subject.id !== id));
        if (selectedSubject === id) {
          setSelectedSubject(subjects.length > 1 ? subjects.find(s => s.id !== id)?.id || '' : '');
        }
        setSuccess('Subject deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to delete subject');
      }
    } catch (err) {
      setError('Error deleting subject: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }

    if (!newTopic.title.trim()) {
      setError('Topic title is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.createTopic(
        selectedSubject,
        newTopic.title,
        newTopic.description
      );
      
      if (response.success && response.data) {
        setTopics(prev => [...prev, response.data as Topic]);
        setNewTopic({ title: '', description: '' });
        setSuccess('Topic added successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to add topic');
      }
    } catch (err) {
      setError('Error adding topic: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.deleteTopic(id);
      if (response.success) {
        setTopics(prev => prev.filter(topic => topic.id !== id));
        setSuccess('Topic deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to delete topic');
      }
    } catch (err) {
      setError('Error deleting topic: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const uploadMarkdown = async (topicId: string) => {
    if (!newMarkdown) {
      setError('Please select a markdown file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.uploadTopicMarkdown(topicId, newMarkdown);
      if (response.success) {
        // Update the topic in the list with new content if available
        fetchTopics(selectedSubject);
        setNewMarkdown(null);
        setSuccess('Markdown uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to upload markdown');
      }
    } catch (err) {
      setError('Error uploading markdown: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ZIP file handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setZipFile(e.target.files[0]);
      setImportStatus('File selected: ' + e.target.files[0].name);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setZipFile(file);
        setImportStatus('File dropped: ' + file.name);
      } else {
        setError('Please select a ZIP file');
      }
    }
  };

  const handleZipFileUpload = async () => {
    if (!zipFile) {
      setImportStatus('error');
      setErrorMessage('No zip file selected');
      return;
    }

    setImportStatus('loading');
    setImportProgress(0);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Progress simulation
      const simulateProgress = () => {
        setImportProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      };
      
      // Start progress simulation
      const progressInterval = setInterval(simulateProgress, 500);
      
      // Call the actual API endpoint to upload the zip file
      const response = await api.processZipFile(zipFile);
      
      // Clear the progress simulation
      clearInterval(progressInterval);
      
      if (response && response.data) {
        setImportStatus('completed');
        setImportProgress(100);
        setSuccessMessage(`Import completed successfully! Added ${response.data.subjects} subjects and ${response.data.topics} topics.`);
        setImportedItems({
          subjects: response.data.subjects || 0,
          topics: response.data.topics || 0
        });
        
        // Refresh subjects after import
        fetchSubjects();
      } else {
        setImportStatus('error');
        setErrorMessage('Failed to process zip file. No data received.');
      }
    } catch (error) {
      console.error('Error uploading zip file:', error);
      setImportStatus('error');
      setErrorMessage('Failed to import zip file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setImportProgress(0);
    }
  };

  return (
    <div className={`admin-panel ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-icon"></span>
        </button>
        <h1 className="mobile-title">Mind Map Admin</h1>
        <button 
          className="theme-toggle mobile" 
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="app-logo">Mind Map</h1>
          <button 
            className="collapse-toggle" 
            onClick={() => setSidebarCollapsed(prev => !prev)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button 
                className={`nav-item ${activeTab === AdminTab.DASHBOARD ? 'active' : ''}`}
                onClick={() => setActiveTab(AdminTab.DASHBOARD)}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Dashboard</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === AdminTab.SUBJECTS ? 'active' : ''}`}
                onClick={() => setActiveTab(AdminTab.SUBJECTS)}
              >
                <span className="nav-icon">📚</span>
                <span className="nav-label">Content</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === AdminTab.IMPORT ? 'active' : ''}`}
                onClick={() => setActiveTab(AdminTab.IMPORT)}
              >
                <span className="nav-icon">📥</span>
                <span className="nav-label">Import</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === AdminTab.SETTINGS ? 'active' : ''}`}
                onClick={() => setActiveTab(AdminTab.SETTINGS)}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Settings</span>
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button 
            className="theme-toggle desktop" 
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="admin-main">
        <div className="main-header">
          <h1 className="page-title">
            {activeTab === AdminTab.DASHBOARD && 'Dashboard'}
            {activeTab === AdminTab.SUBJECTS && 'Manage Content'}
            {activeTab === AdminTab.IMPORT && 'Import Content'}
            {activeTab === AdminTab.SETTINGS && 'Settings'}
          </h1>
          
          <div className="header-actions">
            {loading && <div className="loading-spinner"></div>}
          </div>
        </div>
        
        {/* Notifications */}
        <div className="notification-container">
          {error && (
            <div className="notification error" role="alert">
              <div className="notification-icon">❌</div>
              <div className="notification-content">
                <p className="notification-message">{error}</p>
              </div>
              <button 
                className="notification-close"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          
          {success && (
            <div className="notification success" role="alert">
              <div className="notification-icon">✅</div>
              <div className="notification-content">
                <p className="notification-message">{success}</p>
              </div>
              <button 
                className="notification-close"
                onClick={() => setSuccess(null)}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        <div className="content-area">
          {/* Dashboard Tab */}
          {activeTab === AdminTab.DASHBOARD && (
            <div className="dashboard-content">
              <div className="stats-grid">
                <div className="stats-card">
                  <div className="stats-icon subjects">📚</div>
                  <div className="stats-data">
                    <h2 className="stats-value">{stats.totalSubjects}</h2>
                    <p className="stats-label">Subjects</p>
                  </div>
                </div>
                
                <div className="stats-card">
                  <div className="stats-icon topics">📝</div>
                  <div className="stats-data">
                    <h2 className="stats-value">{stats.totalTopics}</h2>
                    <p className="stats-label">Topics</p>
                  </div>
                </div>
                
                <div className="stats-card actions">
                  <div className="quick-actions">
                    <h3>Quick Actions</h3>
                    <div className="action-buttons">
                      <button 
                        className="action-button"
                        onClick={() => setActiveTab(AdminTab.SUBJECTS)}
                      >
                        <span className="action-icon">➕</span>
                        <span>Add Subject</span>
                      </button>
                      
                      <button 
                        className="action-button"
                        onClick={() => setActiveTab(AdminTab.IMPORT)}
                      >
                        <span className="action-icon">📥</span>
                        <span>Import Content</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="content-overview">
                <div className="overview-card">
                  <h3 className="card-title">Subjects Overview</h3>
                  {subjects.length === 0 ? (
                    <div className="empty-state">
                      <p>No subjects found</p>
                      <button 
                        className="empty-action-button"
                        onClick={() => setActiveTab(AdminTab.SUBJECTS)}
                      >
                        Add Your First Subject
                      </button>
                    </div>
                  ) : (
                    <ul className="overview-list">
                      {subjects.slice(0, 5).map(subject => (
                        <li key={subject.id} className="overview-item">
                          <span className="item-name">{subject.name}</span>
                          <button 
                            className="view-button"
                            onClick={() => {
                              setActiveTab(AdminTab.SUBJECTS);
                              setSelectedSubject(subject.id);
                            }}
                          >
                            View
                          </button>
                        </li>
                      ))}
                      {subjects.length > 5 && (
                        <li className="overview-item more">
                          <button 
                            className="view-all-button"
                            onClick={() => setActiveTab(AdminTab.SUBJECTS)}
                          >
                            View All Subjects ({subjects.length})
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Content Management Tab */}
          {activeTab === AdminTab.SUBJECTS && (
            <div className="content-management">
              <div className="content-grid">
                {/* Subjects Panel */}
                <div className="subjects-panel">
                  <div className="panel-header">
                    <h2>Subjects</h2>
                    <button 
                      className="header-action-button"
                      onClick={() => {
                        // Scroll to the add subject form
                        document.getElementById('add-subject-form')?.scrollIntoView({
                          behavior: 'smooth'
                        });
                      }}
                    >
                      <span className="action-icon">➕</span>
                    </button>
                  </div>
                  
                  <div className="subjects-list">
                    {subjects.length === 0 ? (
                      <div className="empty-state">
                        <p>No subjects found</p>
                      </div>
                    ) : (
                      <ul>
                        {subjects.map(subject => (
                          <li 
                            key={subject.id} 
                            className={`subject-item ${selectedSubject === subject.id ? 'active' : ''}`}
                            onClick={() => setSelectedSubject(subject.id)}
                          >
                            <div className="subject-item-content">
                              <h3 className="subject-name">{subject.name}</h3>
                              {subject.description && (
                                <p className="subject-description">{subject.description}</p>
                              )}
                            </div>
                            <div className="subject-actions">
                              <button 
                                className="delete-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubject(subject.id);
                                }}
                                aria-label={`Delete ${subject.name}`}
                                title="Delete subject"
                              >
                                🗑️
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <div id="add-subject-form" className="add-form">
                    <h3>Add New Subject</h3>
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="subjectName">Subject Name</label>
                        <input
                          id="subjectName"
                          type="text"
                          name="name"
                          placeholder="Enter subject name"
                          value={newSubject.name}
                          onChange={handleNewSubjectChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="subjectDescription">Description (Optional)</label>
                        <input
                          id="subjectDescription"
                          type="text"
                          name="description"
                          placeholder="Brief description"
                          value={newSubject.description}
                          onChange={handleNewSubjectChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        className="primary-button"
                        onClick={addSubject}
                        disabled={loading || !newSubject.name.trim()}
                      >
                        Add Subject
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Topics Panel */}
                <div className="topics-panel">
                  <div className="panel-header">
                    <h2>
                      Topics
                      {selectedSubject && subjects.find(s => s.id === selectedSubject) && 
                        ` for ${subjects.find(s => s.id === selectedSubject)?.name}`
                      }
                    </h2>
                    {selectedSubject && (
                      <button 
                        className="header-action-button"
                        onClick={() => {
                          // Scroll to the add topic form
                          document.getElementById('add-topic-form')?.scrollIntoView({
                            behavior: 'smooth'
                          });
                        }}
                      >
                        <span className="action-icon">➕</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="topics-container">
                    {!selectedSubject ? (
                      <div className="empty-state">
                        <p>Select a subject from the left panel</p>
                      </div>
                    ) : (
                      <>
                        <div className="topics-list">
                          {topics.length === 0 ? (
                            <div className="empty-state">
                              <p>No topics found for this subject.</p>
                              <p>Add your first topic using the form below.</p>
                            </div>
                          ) : (
                            <ul>
                              {topics.map(topic => (
                                <li key={topic.id} className="topic-item">
                                  <div className="topic-content">
                                    <div className="topic-header">
                                      <h3 className="topic-title">{topic.title}</h3>
                                      <div className="topic-actions">
                                        <button
                                          className="delete-button"
                                          onClick={() => deleteTopic(topic.id)}
                                          aria-label={`Delete ${topic.title}`}
                                          title="Delete topic"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {topic.description && (
                                      <p className="topic-description">{topic.description}</p>
                                    )}
                                    
                                    <div className="markdown-status">
                                      <div className="status-badge">
                                        <span className="status-icon">
                                          {topic.markdownContent ? '✅' : '⚠️'}
                                        </span>
                                        <span className="status-text">
                                          {topic.markdownContent 
                                            ? 'Has content' 
                                            : 'No content yet'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="upload-section">
                                      <button
                                        className="file-select-button"
                                        onClick={() => markdownFileInputRef.current?.click()}
                                      >
                                        Select Markdown File
                                      </button>
                                      
                                      <input
                                        type="file"
                                        ref={markdownFileInputRef}
                                        accept=".md, .markdown"
                                        onChange={handleMarkdownChange}
                                        style={{ display: 'none' }}
                                      />
                                      
                                      {newMarkdown && (
                                        <div className="file-info">
                                          <span className="file-name">{newMarkdown.name}</span>
                                          <button
                                            className="upload-button"
                                            onClick={() => uploadMarkdown(topic.id)}
                                            disabled={!newMarkdown || loading}
                                          >
                                            Upload
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        <div id="add-topic-form" className="add-form">
                          <h3>Add New Topic</h3>
                          <div className="form-row">
                            <div className="form-field">
                              <label htmlFor="topicTitle">Topic Title</label>
                              <input
                                id="topicTitle"
                                type="text"
                                name="title"
                                placeholder="Enter topic title"
                                value={newTopic.title}
                                onChange={handleNewTopicChange}
                              />
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-field">
                              <label htmlFor="topicDescription">Description (Optional)</label>
                              <input
                                id="topicDescription"
                                type="text"
                                name="description"
                                placeholder="Brief description"
                                value={newTopic.description}
                                onChange={handleNewTopicChange}
                              />
                            </div>
                          </div>
                          
                          <div className="form-actions">
                            <button 
                              className="primary-button"
                              onClick={addTopic}
                              disabled={loading || !newTopic.title.trim()}
                            >
                              Add Topic
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Import Tab */}
          {activeTab === AdminTab.IMPORT && (
            <div className="import-content">
              <div className="import-card">
                <div className="card-section">
                  <h3>Import Mind Maps from ZIP</h3>
                  <p className="section-description">
                    Upload a ZIP file containing your mind map content organized in folders.
                    Each folder will become a subject, and each markdown file (.md) will be imported as a topic.
                  </p>
                  
                  <div className="import-structure">
                    <div className="structure-info">
                      <h4>Expected ZIP File Structure</h4>
                      <pre className="file-structure">
                        {`mindmap-content.zip/
  ├── Subject1/
  │   ├── metadata.json    # {"name": "Subject Name", "description": "..."}
  │   ├── Topic1.md
  │   ├── Topic2.md
  │   └── ...
  ├── Subject2/
  │   ├── metadata.json
  │   ├── SomeTopic.md
  │   └── ...
  └── ...`}
                      </pre>
                    </div>
                    
                    <div className="import-notes">
                      <h4>Notes</h4>
                      <ul className="notes-list">
                        <li>Each subfolder represents a Subject</li>
                        <li>Each .md file becomes a Topic</li>
                        <li>The topic title is derived from the filename</li>
                        <li>Include optional metadata.json files to specify subject properties</li>
                        <li>Large ZIP files may take longer to process</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="card-section">
                  <h3>Upload ZIP File</h3>
                  <div 
                    className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      style={{ display: 'none' }} 
                      accept=".zip"
                      onChange={handleFileSelect}
                    />
                    <div className="drop-icon">{zipFile ? '📁' : '📥'}</div>
                    {zipFile ? (
                      <div className="selected-file">
                        <p className="file-name">{zipFile.name}</p>
                        <p className="file-size">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="drop-message">
                        <p className="primary-message">Drag & drop your ZIP file here</p>
                        <p className="secondary-message">or click to select a file</p>
                      </div>
                    )}
                  </div>
                    
                  {importStatus === 'loading' && (
                    <div className="import-progress-container">
                      <div className="progress-track">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">Processing ZIP file... {importProgress}%</p>
                    </div>
                  )}
                  
                  {importStatus === 'completed' && (
                    <div className="import-results success">
                      <div className="results-icon">✅</div>
                      <div className="results-content">
                        <h4>Import Successful!</h4>
                        <ul className="results-list">
                          <li><strong>{importedItems.subjects}</strong> subjects imported</li>
                          <li><strong>{importedItems.topics}</strong> topics imported</li>
                        </ul>
                        <p className="results-note">
                          All content has been successfully added and is now available in the Content section.
                        </p>
                        <button 
                          className="view-content-button"
                          onClick={() => setActiveTab(AdminTab.SUBJECTS)}
                        >
                          View Imported Content
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {importStatus === 'error' && errorMessage && (
                    <div className="import-results error">
                      <div className="results-icon">❌</div>
                      <div className="results-content">
                        <h4>Import Failed</h4>
                        <p className="error-message">{errorMessage}</p>
                        <p className="error-help">
                          Please check your ZIP file format and try again. If the problem persists,
                          ensure your file matches the expected structure.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="action-container">
                    <button 
                      className="primary-button process-button"
                      onClick={handleZipFileUpload} 
                      disabled={!zipFile || importStatus === 'loading'}
                    >
                      {importStatus === 'loading' ? 'Processing...' : 'Process ZIP File'}
                    </button>
                    
                    {zipFile && (
                      <button 
                        className="secondary-button"
                        onClick={() => {
                          setZipFile(null);
                          setImportStatus('');
                          setImportProgress(0);
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === AdminTab.SETTINGS && (
            <div className="settings-content">
              <div className="settings-card">
                <h3>Appearance Settings</h3>
                <div className="settings-section">
                  <div className="settings-option">
                    <label className="setting-label">Theme</label>
                    <div className="theme-toggle-container">
                      <button 
                        className={`theme-option ${!darkMode ? 'active' : ''}`}
                        onClick={() => setDarkMode(false)}
                      >
                        ☀️ Light
                      </button>
                      <button 
                        className={`theme-option ${darkMode ? 'active' : ''}`}
                        onClick={() => setDarkMode(true)}
                      >
                        🌙 Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="settings-card">
                <h3>Application Information</h3>
                <div className="settings-section info-section">
                  <div className="info-item">
                    <span className="info-label">Version</span>
                    <span className="info-value">1.0.0</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel; 