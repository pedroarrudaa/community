import React from 'react';
import './FilterPanel.css';

/**
 * FilterPanel component for filtering and sorting Reddit posts
 * 
 * @param {Object} props
 * @param {string} props.sortBy - Current sort method
 * @param {string} props.timeFilter - Current time filter
 * @param {string} props.dataSource - Current data source
 * @param {function} props.onSortChange - Handler for sort changes
 * @param {function} props.onTimeFilterChange - Handler for time filter changes
 * @param {function} props.onDataSourceChange - Handler for data source changes
 */
const FilterPanel = ({ 
  sortBy, 
  timeFilter, 
  dataSource,
  onSortChange,
  onTimeFilterChange,
  onDataSourceChange
}) => {
  return (
    <div className="filter-panel">
      <div className="filter-section">
        <label htmlFor="sort-select">Sort By:</label>
        <select 
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="filter-select"
        >
          <option value="hot">Hot</option>
          <option value="new">New</option>
          <option value="top">Top</option>
          <option value="relevance">Relevance</option>
        </select>
      </div>

      <div className="filter-section">
        <label htmlFor="time-select">Time Period:</label>
        <select 
          id="time-select"
          value={timeFilter}
          onChange={(e) => onTimeFilterChange(e.target.value)}
          className="filter-select"
          disabled={sortBy !== 'top'}
        >
          <option value="all">All Time</option>
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="filter-section">
        <label htmlFor="source-select">Data Source:</label>
        <select 
          id="source-select"
          value={dataSource}
          onChange={(e) => onDataSourceChange(e.target.value)}
          className="filter-select"
        >
          <option value="api">Reddit API</option>
          <option value="scraper">Web Scraper</option>
          <option value="mock">Mock Data</option>
        </select>
      </div>
    </div>
  );
};

export default FilterPanel; 