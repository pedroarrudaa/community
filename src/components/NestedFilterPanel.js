import React, { useState } from "react";
import "./FilterPanel.css"; // Reuse existing styles

/**
 * NestedFilterPanel component for filtering posts by competitor categories
 *
 * @param {Object} props
 * @param {Object} props.competitorFilter - Current competitor filter state
 * @param {function} props.onCompetitorFilterChange - Handler for filter changes
 */
const NestedFilterPanel = ({ competitorFilter, onCompetitorFilterChange }) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  // Dynamic competitor categories and their tools
  const competitorCategories = {
    all: {
      label: "All",
      competitors: [],
    },
    ai_ides: {
      label: "AI IDEs",
      competitors: [
        { id: "cursor", label: "Cursor" },
        { id: "codeium", label: "Codeium" },
        { id: "copilot", label: "GitHub Copilot" },
        { id: "tabnine", label: "Tabnine" },
        { id: "kite", label: "Kite" },
      ],
    },
    website_builders: {
      label: "Website Builders",
      competitors: [
        { id: "lovable", label: "Lovable" },
        { id: "webflow", label: "Webflow" },
        { id: "wix", label: "Wix" },
        { id: "squarespace", label: "Squarespace" },
        { id: "framer", label: "Framer" },
      ],
    },
    code_assistants: {
      label: "Code Assistants",
      competitors: [
        { id: "chatgpt", label: "ChatGPT" },
        { id: "claude", label: "Claude" },
        { id: "bard", label: "Bard" },
        { id: "llama", label: "Llama" },
      ],
    },
  };

  // Toggle the expanded state for a category
  const toggleCategory = (categoryId) => {
    setExpandedCategories({
      ...expandedCategories,
      [categoryId]: !expandedCategories[categoryId],
    });
  };

  // Handle selection of a category
  const handleCategorySelect = (categoryId) => {
    if (categoryId === "all") {
      onCompetitorFilterChange({
        category: "all",
        competitor: null,
      });
    } else {
      onCompetitorFilterChange({
        category: categoryId,
        competitor: null,
      });
    }
  };

  // Handle selection of a specific competitor
  const handleCompetitorSelect = (categoryId, competitorId) => {
    onCompetitorFilterChange({
      category: categoryId,
      competitor: competitorId,
    });
  };

  return (
    <div className="nested-filter-panel">
      <h3>Competitor Filters</h3>
      <ul className="category-list">
        {Object.keys(competitorCategories).map((categoryId) => (
          <li key={categoryId} className="category-item">
            <div
              className={`category-header ${
                competitorFilter.category === categoryId ? "active" : ""
              }`}
            >
              <span
                onClick={() => handleCategorySelect(categoryId)}
                className="category-label"
              >
                {competitorCategories[categoryId].label}
              </span>

              {/* Only show expand button if there are competitors in this category */}
              {competitorCategories[categoryId].competitors.length > 0 && (
                <button
                  className="expand-button"
                  onClick={() => toggleCategory(categoryId)}
                >
                  {expandedCategories[categoryId] ? "−" : "+"}
                </button>
              )}
            </div>

            {/* Show competitors if category is expanded */}
            {expandedCategories[categoryId] &&
              competitorCategories[categoryId].competitors.length > 0 && (
                <ul className="competitor-list">
                  {competitorCategories[categoryId].competitors.map(
                    (competitor) => (
                      <li
                        key={competitor.id}
                        className={`competitor-item ${
                          competitorFilter.category === categoryId &&
                          competitorFilter.competitor === competitor.id
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          handleCompetitorSelect(categoryId, competitor.id)
                        }
                      >
                        {competitor.label}
                      </li>
                    )
                  )}
                </ul>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NestedFilterPanel;
