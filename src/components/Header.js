import React from 'react';
import './Header.css';

/**
 * Header component for the Community Surf application
 * 
 * @param {Object} props
 * @param {function} props.onSubredditChange - Handler for subreddit selection changes
 * @param {string} props.selectedSubreddit - Currently selected subreddit
 * @param {function} props.onRefresh - Handler for refresh button click
 */
const Header = ({ onSubredditChange, selectedSubreddit, onRefresh }) => {
  const handleSubredditChange = (e) => {
    onSubredditChange(e.target.value);
  };

  const handleRefreshClick = () => {
    onRefresh();
  };

  return (
    <header className="header">
      <div className="container">
        <h1 className="logo">Community Surf: Windsurf AI Monitor</h1>
        <div className="header-right">
          <select 
            className="subreddit-select" 
            value={selectedSubreddit} 
            onChange={handleSubredditChange}
          >
            <option value="">All Subreddits</option>
            <option value="programming">r/programming</option>
            <option value="coding">r/coding</option>
            <option value="ArtificialIntelligence">r/ArtificialIntelligence</option>
            <option value="MachineLearning">r/MachineLearning</option>
            <option value="webdev">r/webdev</option>
            <option value="javascript">r/javascript</option>
            <option value="Python">r/Python</option>
            <option value="codeium">r/codeium</option>
            <option value="IDEs">r/IDEs</option>
            <option value="vscode">r/vscode</option>
            <option value="aitools">r/aitools</option>
          </select>
          <button className="refresh-btn" onClick={handleRefreshClick}>
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 