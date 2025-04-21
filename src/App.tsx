import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import MarkmapViewer from './components/MarkmapViewer';
import { TopicList } from './components/TopicList';
import AdminPanel from './components/AdminPanel';
import './App.css';

const defaultMarkdown = `# Select a Topic
## Choose a topic from the list
### Topics are organized by subject`;

function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [topicTitle, setTopicTitle] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [initialExpandLevel, setInitialExpandLevel] = useState(-1);
  const [zoom, setZoom] = useState(true);
  const [pan, setPan] = useState(true);

  const handleTopicSelect = (markdownContent: string, title: string) => {
    setMarkdown(markdownContent);
    setTopicTitle(title);
  };

  return (
    <Router>
      <div className={`App ${theme}`}>
        <nav className="app-nav">
          <div className="nav-logo">
            <h1>Mind Map Viewer</h1>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/admin" className="nav-link">Admin</Link>
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </nav>
        
        <Routes>
          <Route 
            path="/" 
            element={
              <>
                <div className="controls">
                  <div className="control-group">
                    <label>
                      Initial Expand Level:
                      <input
                        type="number"
                        value={initialExpandLevel}
                        onChange={(e) => setInitialExpandLevel(Number(e.target.value))}
                        min={-1}
                        max={10}
                      />
                    </label>
                  </div>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={zoom}
                        onChange={(e) => setZoom(e.target.checked)}
                      />
                      Enable Zoom
                    </label>
                  </div>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={pan}
                        onChange={(e) => setPan(e.target.checked)}
                      />
                      Enable Pan
                    </label>
                  </div>
                </div>
                
                <div className="App-main">
                  <div className="sidebar">
                    <TopicList onTopicSelect={handleTopicSelect} />
                  </div>
                  <div className="content">
                    <div className="viewer">
                      <MarkmapViewer
                        markdown={markdown}
                        theme={theme}
                        initialExpandLevel={initialExpandLevel}
                        zoom={zoom}
                        pan={pan}
                        topicTitle={topicTitle}
                      />
                    </div>
                  </div>
                </div>
              </>
            } 
          />
          <Route 
            path="/admin" 
            element={<AdminPanel />} 
          />
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
