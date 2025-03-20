import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sun,
  Moon,
  ChevronDown,
  X,
  Database,
  Tag,
  Filter,
} from "lucide-react";
import "./Navbar.css";
import SubCategoryFilter from "./SubCategoryFilter";

/**
 * Responsive navbar component with logo, platform filters, search, and theme toggle
 *
 * @param {Object} props
 * @param {string} props.selectedPlatform - Current selected platform
 * @param {Function} props.onPlatformChange - Function to handle platform change
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.onSearchChange - Function to handle search term change
 * @param {Function} props.onSearchClear - Function to handle search clear
 * @param {Function} props.onSearch - Function to handle search submission
 * @param {string} props.sortBy - Current sort option
 * @param {Array} props.sortOptions - Available sort options
 * @param {Function} props.onSortChange - Function to handle sort change
 * @param {boolean} props.darkMode - Current theme mode
 * @param {Function} props.onThemeToggle - Function to toggle theme
 * @param {string} props.topicFilter - Current topic filter (for Cursor Forum)
 * @param {Function} props.onTopicFilterChange - Function to handle topic filter change
 * @param {string} props.categoryFilter - Current category filter
 * @param {Object} props.categoryOptions - Available category options
 * @param {Function} props.onCategoryFilterChange - Function to handle category filter change
 * @param {Object} props.classifications - Available classification categories
 * @param {string} props.activeClassificationFilter - Current active classification filter
 * @param {Function} props.onClassificationFilterChange - Function to handle classification filter change
 */
const Navbar = ({
  selectedPlatform,
  onPlatformChange,
  searchTerm,
  onSearchChange,
  onSearchClear,
  onSearch,
  sortBy,
  sortOptions,
  onSortChange,
  darkMode,
  onThemeToggle,
  topicFilter = "all",
  onTopicFilterChange,
  categoryFilter = "all",
  categoryOptions = {},
  onCategoryFilterChange,
  categoryColors = {},
  classifications = {},
  activeClassificationFilter = "all",
  onClassificationFilterChange,
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showClassificationDropdown, setShowClassificationDropdown] =
    useState(false);
  const sortDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const classificationDropdownRef = useRef(null);

  // Toggle sort dropdown
  const toggleSortDropdown = () => {
    setShowSortDropdown(!showSortDropdown);
    setShowCategoryDropdown(false);
    setShowClassificationDropdown(false);
  };

  // Toggle category dropdown
  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
    setShowSortDropdown(false);
    setShowClassificationDropdown(false);
  };

  // Toggle classification dropdown
  const toggleClassificationDropdown = () => {
    setShowClassificationDropdown(!showClassificationDropdown);
    setShowSortDropdown(false);
    setShowCategoryDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setShowSortDropdown(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false);
      }
      if (
        classificationDropdownRef.current &&
        !classificationDropdownRef.current.contains(event.target)
      ) {
        setShowClassificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle sort option selection
  const handleSortSelect = (value) => {
    onSortChange(value);
    setShowSortDropdown(false);
  };

  // Handle category option selection
  const handleCategorySelect = (value) => {
    onCategoryFilterChange(value);
    setShowCategoryDropdown(false);
  };

  // Handle classification option selection
  const handleClassificationSelect = (filterKey) => {
    if (onClassificationFilterChange) {
      onClassificationFilterChange(filterKey);
      setShowClassificationDropdown(false);
    }
  };

  // Handle search input keypress
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      onSearch(searchTerm);
    }
  };

  // Get the current category label
  const getCurrentCategoryLabel = () => {
    if (categoryFilter === "all") return "All Posts";
    return categoryOptions[categoryFilter] || "All Posts";
  };

  // Get the current classification label
  const getCurrentClassificationLabel = () => {
    if (activeClassificationFilter === "all") return "All Categories";
    return classifications[activeClassificationFilter] || "All Categories";
  };

  return (
    <header className="site-header">
      {/* Top bar with logo and theme toggle */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="logo-container">
            <div className="logo-icon">
              <Database size={20} />
            </div>
            <h1 className="site-title">CommunitySurf</h1>

            {/* Theme toggle moved here */}
            <button
              className="theme-toggle"
              onClick={onThemeToggle}
              aria-label="Toggle dark/light theme"
            >
              {darkMode ? (
                <Sun size={20} className="theme-icon" />
              ) : (
                <Moon size={20} className="theme-icon" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <nav className="navbar">
        <div className="navbar-container">
          {/* Centralized navigation elements */}
          <div className="navbar-center">
            {/* Platform filter buttons */}
            <div className="platform-filters">
              <button
                className={`platform-btn ${
                  selectedPlatform === "all" ? "active" : ""
                }`}
                onClick={() => onPlatformChange("all")}
              >
                All Platforms
              </button>
              <button
                className={`platform-btn ${
                  selectedPlatform === "reddit" ? "active" : ""
                }`}
                onClick={() => onPlatformChange("reddit")}
              >
                Reddit
              </button>
              <button
                className={`platform-btn ${
                  selectedPlatform === "twitter" ? "active" : ""
                }`}
                onClick={() => onPlatformChange("twitter")}
              >
                X
              </button>
              <button
                className={`platform-btn ${
                  selectedPlatform === "cursor" ? "active" : ""
                }`}
                onClick={() => onPlatformChange("cursor")}
              >
                Cursor Forum
              </button>

              {/* Classification filter dropdown */}
              {onClassificationFilterChange && (
                <div
                  className="classification-dropdown"
                  ref={classificationDropdownRef}
                >
                  <button
                    className={`classification-btn ${
                      showClassificationDropdown ? "active" : ""
                    }`}
                    onClick={toggleClassificationDropdown}
                  >
                    <Filter size={16} className="filter-icon" />
                    Filter By Category
                    <ChevronDown
                      size={16}
                      className={`dropdown-icon ${
                        showClassificationDropdown ? "rotate" : ""
                      }`}
                    />
                  </button>

                  {showClassificationDropdown && (
                    <div className="classification-dropdown-menu">
                      <div className="dropdown-header">Filter by Category</div>
                      <button
                        className={`classification-option ${
                          activeClassificationFilter === "all" ? "active" : ""
                        }`}
                        onClick={() => handleClassificationSelect("all")}
                      >
                        All Posts
                      </button>

                      {Object.entries(classifications).map(([key, label]) => (
                        <button
                          key={key}
                          className={`classification-option ${
                            activeClassificationFilter === key ? "active" : ""
                          }`}
                          onClick={() => handleClassificationSelect(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sort dropdown */}
              <div className="sort-dropdown" ref={sortDropdownRef}>
                <button
                  className={`sort-btn ${showSortDropdown ? "active" : ""}`}
                  onClick={toggleSortDropdown}
                >
                  {sortOptions.find((option) => option.value === sortBy)
                    ?.label || "Newest"}
                  <ChevronDown
                    size={16}
                    className={`dropdown-icon ${
                      showSortDropdown ? "rotate" : ""
                    }`}
                  />
                </button>

                {showSortDropdown && (
                  <div className="sort-dropdown-menu">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        className={`sort-option ${
                          sortBy === option.value ? "active" : ""
                        }`}
                        onClick={() => handleSortSelect(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search and Category Filter Container */}
            <div className="search-category-container">
              {/* Search bar */}
              <div className="search-bar">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search posts"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={onSearchClear}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Category filter dropdown */}
              {onCategoryFilterChange && (
                <div className="category-dropdown" ref={categoryDropdownRef}>
                  <button
                    className={`category-btn ${
                      showCategoryDropdown ? "active" : ""
                    }`}
                    onClick={toggleCategoryDropdown}
                  >
                    <Tag size={16} className="category-icon" />
                    {getCurrentCategoryLabel()}
                    <ChevronDown
                      size={16}
                      className={`dropdown-icon ${
                        showCategoryDropdown ? "rotate" : ""
                      }`}
                    />
                  </button>

                  {showCategoryDropdown && (
                    <div className="category-dropdown-menu">
                      <button
                        className={`category-option ${
                          categoryFilter === "all" ? "active" : ""
                        }`}
                        onClick={() => handleCategorySelect("all")}
                      >
                        All Posts
                      </button>

                      {Object.entries(categoryOptions).map(([key, label]) => (
                        <button
                          key={key}
                          className={`category-option ${
                            categoryFilter === key ? "active" : ""
                          }`}
                          onClick={() => handleCategorySelect(key)}
                        >
                          <span
                            className="category-dot"
                            style={{
                              backgroundColor: categoryColors[key] || "#ccc",
                            }}
                          ></span>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Topic filter for Cursor Forum */}
      {selectedPlatform === "cursor" && onTopicFilterChange && (
        <SubCategoryFilter
          selectedPlatform={selectedPlatform}
          activeTopicFilter={topicFilter}
          onFilterChange={onTopicFilterChange}
        />
      )}
    </header>
  );
};

export default Navbar;
