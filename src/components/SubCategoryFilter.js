import React from "react";
import "./SubCategoryFilter.css";

/**
 * SubCategoryFilter component that filters Cursor Forum posts by topic category
 *
 * @param {Object} props
 * @param {string} props.selectedPlatform - Currently selected platform
 * @param {string} props.activeTopicFilter - Currently active topic filter
 * @param {Function} props.onFilterChange - Function to call when filter changes
 */
const SubCategoryFilter = ({
  selectedPlatform,
  activeTopicFilter = "all",
  onFilterChange,
}) => {
  // Only display for Cursor Forum
  if (selectedPlatform !== "cursor") {
    return null;
  }

  // Define the topic categories available for filtering
  const topicCategories = [
    { value: "all", label: "All Topics" },
    { value: "bug", label: "Bug Reports" },
    { value: "feature", label: "Feature Requests" },
    { value: "howto", label: "How To" },
    { value: "discussion", label: "Discussion" },
  ];

  return (
    <div className="sub-category-filter">
      <div className="sub-filter-header">
        <span>Filter by topic:</span>
      </div>
      <div className="sub-filter-options">
        {topicCategories.map((category) => (
          <button
            key={category.value}
            className={`sub-filter-option ${
              activeTopicFilter === category.value ? "active" : ""
            }`}
            onClick={() => onFilterChange(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubCategoryFilter;
