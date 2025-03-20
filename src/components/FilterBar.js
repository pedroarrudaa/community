import React, { useState, useEffect } from "react";
import "./FilterBar.css";

/**
 * FilterBar component for filtering posts by classification
 * @param {Object} props Component props
 * @param {Array} props.classifications Available classifications
 * @param {Function} props.onFilterChange Callback when filter changes
 * @param {String} props.activeFilter Current active filter
 * @param {Boolean} props.isLoading Loading state indicator
 */
const FilterBar = ({
  classifications,
  onFilterChange,
  activeFilter,
  isLoading = false,
}) => {
  const [categories, setCategories] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryColors, setCategoryColors] = useState({});

  // Load classification categories
  useEffect(() => {
    if (classifications) {
      setCategories(classifications);

      // Generate consistent colors for each category
      const colors = {};
      Object.keys(classifications).forEach((key, index) => {
        // Use predefined color scheme
        const colorOptions = [
          "#4CAF50", // Green
          "#2196F3", // Blue
          "#FF9800", // Orange
          "#9C27B0", // Purple
          "#F44336", // Red
          "#00BCD4", // Cyan
          "#795548", // Brown
          "#607D8B", // Blue Grey
        ];

        colors[key] = colorOptions[index % colorOptions.length];
      });

      setCategoryColors(colors);
    } else {
      // Fetch classifications from API if not provided
      fetch("/api/classification-categories")
        .then((response) => response.json())
        .then((data) => {
          if (data.categories) {
            setCategories(data.categories);

            // Generate consistent colors for each category
            const colors = {};
            Object.keys(data.categories).forEach((key, index) => {
              // Use predefined color scheme
              const colorOptions = [
                "#4CAF50", // Green
                "#2196F3", // Blue
                "#FF9800", // Orange
                "#9C27B0", // Purple
                "#F44336", // Red
                "#00BCD4", // Cyan
                "#795548", // Brown
                "#607D8B", // Blue Grey
              ];

              colors[key] = colorOptions[index % colorOptions.length];
            });

            setCategoryColors(colors);
          }
        })
        .catch((error) => {
          console.error("Error fetching classifications:", error);
        });
    }
  }, [classifications]);

  const handleFilterClick = (filterKey) => {
    // Call the parent component's callback with the selected filter
    if (onFilterChange) {
      onFilterChange(filterKey);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`filter-bar ${isExpanded ? "expanded" : ""}`}>
      <div className="filter-bar-header">
        <h3>Filter by Category</h3>
        <button className="expand-button" onClick={toggleExpand}>
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      <div className="filter-options">
        <button
          className={`filter-option ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => handleFilterClick("all")}
        >
          All Posts
        </button>

        {isLoading ? (
          <div className="filter-loading">Loading categories...</div>
        ) : (
          Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              className={`filter-option ${
                activeFilter === key ? "active" : ""
              }`}
              onClick={() => handleFilterClick(key)}
              style={{
                borderLeft: `4px solid ${categoryColors[key] || "#ccc"}`,
              }}
            >
              <span className="filter-label">{label}</span>
              <span
                className="filter-color-indicator"
                style={{ backgroundColor: categoryColors[key] || "#ccc" }}
              ></span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default FilterBar;
