import React from "react";
import {
  MessageSquare,
  Calendar,
  Eye,
  ExternalLink,
  User,
  ArrowRight,
} from "lucide-react";
import "./PostCard.css"; // Reuse base styles
import "./CursorForumCard.css"; // We'll create this file next
import DOMPurify from "dompurify";

/**
 * CursorForumCard component for displaying Cursor Forum posts
 *
 * @param {Object} props
 * @param {Object} props.post - Cursor Forum post data
 * @param {Function} props.onViewDetails - Function to view post details
 */
const CursorForumCard = ({ post, onViewDetails }) => {
  // Format date to a readable format
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    // Format date as "Month Day, Year"
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle external link click
  const handleExternalLinkClick = (e) => {
    e.stopPropagation();
    window.open(post.url, "_blank", "noopener,noreferrer");
  };

  // Função para truncar o título se for muito longo
  const truncateText = (text, maxLength = 70) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  // Classification color mapping
  const classificationColors = {
    positive_feedback: "#4caf50", // Green
    frustration: "#f44336", // Red
    bug_report: "#ff9800", // Orange
    feature_suggestion: "#2196f3", // Blue
    trending_topic: "#e91e63", // Pink
    question: "#9c27b0", // Purple
    neutral: "#9e9e9e", // Gray
  };

  // Classification emoji mapping
  const classificationEmojis = {
    positive_feedback: "🟢",
    frustration: "🔴",
    bug_report: "🐛",
    feature_suggestion: "🎯",
    trending_topic: "🔥",
    question: "❓",
    neutral: "⚪",
  };

  // Get primary classification
  const primaryClassification = post.primary_classification || "neutral";

  // Get color for primary classification
  const classColor =
    classificationColors[primaryClassification] || classificationColors.neutral;

  // Get emoji for primary classification
  const classEmoji =
    classificationEmojis[primaryClassification] || classificationEmojis.neutral;

  return (
    <div
      className="post-card cursor-forum-card"
      onClick={() => onViewDetails(post)}
    >
      <div className="card-header">
        <div className="category-badge">{post.category || "General"}</div>
        <div className="sentiment-pill">
          <span
            className={`sentiment-dot ${post.sentiment_label || "neutral"}`}
          ></span>
          <span className="sentiment-text">
            {post.sentiment_label || "Neutral"}
          </span>
        </div>
      </div>

      <h3 className="card-title">{truncateText(post.title, 80)}</h3>

      <div className="card-meta">
        <div className="meta-item author">
          <User size={14} />
          <span>{post.author}</span>
        </div>
        <div className="meta-item date">
          <Calendar size={14} />
          <span>{formatDate(post.created_at)}</span>
        </div>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <MessageSquare size={14} />
          <span>{post.replies} replies</span>
        </div>
        <div className="stat-item">
          <Eye size={14} />
          <span>{post.views} views</span>
        </div>
      </div>

      <div className="card-footer">
        <button
          className="details-button"
          onClick={() => onViewDetails(post)}
          aria-label="View Details"
        >
          <span>View Details</span>
          <ArrowRight size={14} />
        </button>

        <button
          className="external-link-button"
          onClick={handleExternalLinkClick}
          aria-label="Open in Cursor Forum"
        >
          <ExternalLink size={14} />
          <span>Open in Forum</span>
        </button>
      </div>

      {/* Display classification badge */}
      <div
        className="cursor-forum-card-classification"
        style={{ borderColor: classColor }}
      >
        {classEmoji} {primaryClassification.replace("_", " ")}
      </div>
    </div>
  );
};

export default CursorForumCard;
