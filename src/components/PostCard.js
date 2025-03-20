import React, { useState, useRef, useEffect, useCallback } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import "./PostCard.css";
import {
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Bot,
  Keyboard,
  Play,
  Pause,
  Clock,
  MessageSquare,
  Calendar,
  Heart,
  User as UserIcon,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Tag,
} from "lucide-react";

// Template responses for common questions about Windsurf AI
const TEMPLATE_RESPONSES = [
  {
    id: "template-1",
    name: "General Introduction",
    text: "Windsurf AI is an intelligent development environment by Codeium that combines AI agents with intuitive co-pilots. It uses proprietary Cascade technology that maintains deep contextual awareness across your codebase. It's available at https://windsurfai.org/",
  },
  {
    id: "template-2",
    name: "Comparison with Cursor",
    text: "Compared to Cursor IDE, Windsurf AI offers more advanced features like proprietary deep understanding systems with real-time awareness, advanced coherent multi-file editing, and comprehensive natural language command support. It also has a more accessible pricing model with a free tier.",
  },
  {
    id: "template-3",
    name: "Installation Help",
    text: "To install Windsurf AI, visit https://windsurfai.org/ and follow the download instructions for your platform. The installation process is straightforward, and there's excellent documentation available on their website if you encounter any issues.",
  },
  {
    id: "template-4",
    name: "Configuration Tips",
    text: 'For the best Windsurf AI experience, I recommend configuring these settings: 1) Enable "Deep Context" mode for better code understanding 2) Set up project-specific completions in the settings panel 3) Connect your GitHub account for enhanced repository integration.',
  },
];

/**
 * PostCard component for displaying Reddit posts
 *
 * @param {Object} props
 * @param {Object} props.post - Post data object
 * @param {Function} props.onNextPost - Function to navigate to next post in Surf Mode
 * @param {Function} props.onPrevPost - Function to navigate to previous post in Surf Mode
 * @param {Function} props.onViewDetails - Function to view post details
 * @param {Object} props.categoryColors - Object mapping categories to colors
 */
const PostCard = ({
  post,
  onNextPost,
  onPrevPost,
  onViewDetails,
  categoryColors = {},
}) => {
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [replyHistory, setReplyHistory] = useState([]);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [surfMode, setSurfMode] = useState(false);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [autoPostStatus, setAutoPostStatus] = useState("");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(5000); // 5 seconds default
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const textareaRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Define as funções utilizadas pelo useEffect antes de usá-las
  const toggleReplyForm = useCallback(() => {
    setIsReplying(!isReplying);
  }, [isReplying]);

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance(!autoAdvance);
  }, [autoAdvance]);

  // Simulate auto-posting to Reddit
  const simulateAutoPost = useCallback(() => {
    setAutoPostStatus("posting");

    // Simulate API call delay
    setTimeout(() => {
      setAutoPostStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => {
        setAutoPostStatus("");

        // In surf mode, automatically move to next post
        if (surfMode && onNextPost) {
          onNextPost();
        }
      }, 3000);
    }, 1500);
  }, [surfMode, onNextPost]);

  const handleCopyReply = useCallback(() => {
    // Only save to history if there's actual content
    if (replyText.trim()) {
      // Save to reply history
      setReplyHistory([
        ...replyHistory,
        {
          id: Date.now(),
          text: replyText,
          postId: post.id,
          postTitle: post.title,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Copy to clipboard
      navigator.clipboard
        .writeText(replyText)
        .then(() => {
          // Show success status
          setCopiedStatus(true);

          // If auto-post is enabled, simulate posting
          if (autoPostEnabled) {
            simulateAutoPost();
          }
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          alert("Failed to copy text. Please try again or copy manually.");
        });
    }
  }, [
    replyText,
    replyHistory,
    post.id,
    post.title,
    autoPostEnabled,
    simulateAutoPost,
  ]);

  // Toggle surf mode
  const toggleSurfMode = useCallback(() => {
    setSurfMode(!surfMode);
  }, [surfMode]);

  // Toggle keyboard shortcuts info
  const toggleKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(!showKeyboardShortcuts);
  }, [showKeyboardShortcuts]);

  // Focus textarea when reply form is opened
  useEffect(() => {
    if (isReplying && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isReplying]);

  // Reset copied status after 2 seconds
  useEffect(() => {
    if (copiedStatus) {
      const timer = setTimeout(() => {
        setCopiedStatus(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedStatus]);

  // Handle auto-advance mode
  useEffect(() => {
    if (surfMode && autoAdvance) {
      // Clear any existing timer
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }

      // Set a new timer to advance to the next post
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (onNextPost) {
          onNextPost();
        }
      }, autoAdvanceDelay);

      // Return cleanup function
      return () => {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
        }
      };
    }
  }, [surfMode, autoAdvance, autoAdvanceDelay, onNextPost, post.id]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only process keyboard shortcuts when surfMode is active
      if (surfMode) {
        // Next post with 'j'
        if (e.key === "j") {
          onNextPost();
        }

        // Previous post with 'k'
        if (e.key === "k") {
          onPrevPost();
        }

        // Toggle reply form with 'r'
        if (e.key === "r") {
          toggleReplyForm();
        }

        // Toggle surf mode with 's'
        if (e.key === "s") {
          toggleSurfMode();
        }

        // Toggle auto advance with 'a'
        if (e.key === "a") {
          toggleAutoAdvance();
        }

        // Copy reply with Ctrl+Enter
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          handleCopyReply();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onNextPost,
    onPrevPost,
    surfMode,
    toggleReplyForm,
    toggleAutoAdvance,
    handleCopyReply,
    toggleSurfMode,
  ]);

  const handleReplyChange = (e) => {
    setReplyText(e.target.value);
  };

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);

    if (templateId) {
      const template = TEMPLATE_RESPONSES.find((t) => t.id === templateId);
      if (template) {
        setReplyText(template.text);
      }
    }
  };

  // Format date if available
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return "";

    // Calculate time difference
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    // Format as relative time
    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? "just now" : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    } else {
      return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
    }
  };

  // Get score class based on value - now returns empty string to avoid different colors
  const getScoreClass = (score) => {
    // All scores now use the same styling, regardless of value
    return "";
  };

  // Update auto-advance delay
  const handleDelayChange = (e) => {
    const newDelay = parseInt(e.target.value, 10) * 1000; // Convert seconds to milliseconds
    setAutoAdvanceDelay(newDelay);
  };

  // Handle card click to view details
  const handleCardClick = (e) => {
    // Ignore clicks on links, buttons, and form elements
    if (
      e.target.tagName === "A" ||
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.closest("a") ||
      e.target.closest("button")
    ) {
      return;
    }

    // Call the onViewDetails prop with this post
    if (onViewDetails) {
      onViewDetails(post);
    }
  };

  // New handler for filtering by Reddit
  const handleRedditFilterClick = (e) => {
    e.stopPropagation(); // Important to prevent the click from propagating to the card
    // Use custom event to communicate with App.js
    const event = new CustomEvent("filterByPlatform", {
      detail: { platform: "reddit" },
    });
    window.dispatchEvent(event);
  };

  // Add new function to clean and normalize content
  const normalizeContent = (content) => {
    if (!content) return "";

    // Remove excess whitespace and normalize line breaks
    return content
      .replace(/\n{3,}/g, "\n\n") // Replace 3+ consecutive line breaks with just 2
      .replace(/\s+$/g, ""); // Trim trailing whitespace
  };

  // Melhorar o tratamento de URLs de imagem
  const getOptimizedImageUrl = (url) => {
    if (
      !url ||
      url === "spoiler" ||
      url === "default" ||
      url === "nsfw" ||
      url === "self"
    ) {
      // Retornar null para imagens inválidas ou spoilers
      return null;
    }

    try {
      // Decodificar URL se necessário
      const decodedUrl = url.includes("&amp;")
        ? decodeURIComponent(url.replace(/&amp;/g, "&"))
        : url;

      // Limpeza básica de URL
      return decodedUrl
        .replace(/\s/g, "") // Remover espaços
        .replace(/["']/g, ""); // Remover aspas que podem ter entrado na URL
    } catch (error) {
      console.warn("Error processing image URL:", error);
      return null;
    }
  };

  // Handle image loading error
  const handleImageError = (e) => {
    console.log("Image failed to load:", post.image);
    // Add no-image class to card when image fails to load
    const cardElement = e.target.closest(".post-card");
    if (cardElement) {
      cardElement.classList.add("no-image");
    }
    setImageError(true);
  };

  // Dev only - component render counter
  const renderCount = useRef(0);
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      renderCount.current += 1;
      console.log(
        `PostCard for ${post.id} rendered ${renderCount.current} times`
      );
    }
  });

  // Function to render category labels
  const renderCategoryLabels = () => {
    if (!post.classifications || post.classifications.length === 0) {
      return null;
    }

    return (
      <div className="post-categories">
        {post.classifications.map((category, index) => {
          const color = categoryColors[category] || "#9e9e9e";
          return (
            <span
              key={`${category}-${index}`}
              className="post-category-label"
              style={{
                backgroundColor: `${color}20`, // 20% opacity
                color: color,
                borderColor: color,
              }}
            >
              <span
                className="label-dot"
                style={{ backgroundColor: color }}
              ></span>
              {category}
            </span>
          );
        })}
      </div>
    );
  };

  // Add this to display the primary classification if it exists
  const getPrimaryClassStyle = () => {
    if (!post.primary_classification) return {};

    const color = categoryColors[post.primary_classification] || "#9e9e9e";
    return {
      borderLeftColor: color,
      className: `post-card ${
        post.primary_classification ? "post-filtered" : ""
      }`,
    };
  };

  // Get the classification styles
  const classStyles = getPrimaryClassStyle();

  return (
    <div
      ref={containerRef}
      className={classStyles.className || "post-card"}
      style={{ borderLeftColor: classStyles.borderLeftColor }}
      onClick={handleCardClick}
    >
      <div className="post-header">
        <div className="post-meta">
          <div className="post-source">
            <div className="post-source-icon">
              <span className="post-header-info">
                <span
                  className="platform-label clickable"
                  onClick={handleRedditFilterClick}
                >
                  Reddit
                </span>
                {post.author && (
                  <span className="post-author-info">
                    {" "}
                    • Post by {post.author}
                  </span>
                )}
              </span>
            </div>

            <div className="post-source-right">
              {post.created_utc && (
                <span className="post-date">
                  <Calendar size={14} className="post-date-icon" />
                  {formatDate(post.created_utc)}
                </span>
              )}
            </div>
          </div>
          <h2 className="post-title">{post.title}</h2>
        </div>
        {renderCategoryLabels()}
      </div>

      <div className="post-body">
        <div className="post-content">
          <p
            className={`post-excerpt ${
              !post.image || imageError ? "no-image-excerpt" : ""
            }`}
          >
            {normalizeContent(post.content)}
          </p>
          {post.image && !imageError && (
            <div
              ref={containerRef}
              className={`post-image-container ${
                imageLoaded ? "loaded" : "loading"
              }`}
            >
              <LazyLoadImage
                ref={imageRef}
                src={getOptimizedImageUrl(post.image)}
                alt={post.title || "Post attachment"}
                className="post-image"
                effect="blur"
                threshold={400}
                placeholderSrc={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23cccccc'/%3E%3C/svg%3E`}
                afterLoad={() => {
                  setImageLoaded(true);
                  // Check if image is very small and apply class for better handling
                  if (imageRef.current) {
                    const { naturalWidth, naturalHeight } = imageRef.current;
                    if (naturalWidth < 100 || naturalHeight < 100) {
                      containerRef.current?.classList.add("small-image");
                    }
                  }
                }}
                onError={handleImageError}
                wrapperClassName="lazy-image-wrapper"
              />
              {!imageLoaded && (
                <div className="image-loading-indicator">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="post-stats">
          {post.score !== undefined && (
            <span className={`post-score ${getScoreClass(post.score)}`}>
              <Heart size={16} className="post-stat-icon like-icon" />
              <span className="stat-label">Likes:</span> {post.score}
            </span>
          )}
          {post.num_comments !== undefined && (
            <span className="post-stat">
              <MessageSquare size={16} className="post-stat-icon" />
              <span className="stat-label">Comments:</span> {post.num_comments}
            </span>
          )}
        </div>
      </div>

      {showKeyboardShortcuts && (
        <div className="keyboard-shortcuts">
          <h4>
            <Keyboard size={16} className="shortcuts-icon" />
            Keyboard Shortcuts
          </h4>
          <ul className="shortcuts-list">
            <li>
              <span className="shortcut-key">↓</span> or{" "}
              <span className="shortcut-key">j</span>: Next Post
            </li>
            <li>
              <span className="shortcut-key">↑</span> or{" "}
              <span className="shortcut-key">k</span>: Previous Post
            </li>
            <li>
              <span className="shortcut-key">r</span>: Toggle Reply Form
            </li>
            <li>
              <span className="shortcut-key">s</span>: Toggle Surf Mode
            </li>
            <li>
              <span className="shortcut-key">a</span>: Toggle Auto-Advance
            </li>
            <li>
              <span className="shortcut-key">Ctrl</span> +{" "}
              <span className="shortcut-key">Enter</span>: Copy Reply (when
              typing)
            </li>
          </ul>
        </div>
      )}

      {isReplying && (
        <div className="reply-form">
          {surfMode && (
            <>
              <div className="surf-mode-controls">
                <div className="surf-nav-buttons">
                  <button
                    className="surf-nav-button prev"
                    onClick={onPrevPost}
                    title="Previous Post (↑ or k)"
                    aria-label="Previous Post"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button
                    className="surf-nav-button next"
                    onClick={onNextPost}
                    title="Next Post (↓ or j)"
                    aria-label="Next Post"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>

              <div className="auto-advance-controls">
                <button
                  className={`auto-advance-btn ${autoAdvance ? "active" : ""}`}
                  onClick={toggleAutoAdvance}
                  title="Toggle Auto-Advance (a)"
                >
                  {autoAdvance ? (
                    <>
                      <Pause size={16} className="button-icon" />
                      Pause Auto-Advance
                    </>
                  ) : (
                    <>
                      <Play size={16} className="button-icon" />
                      Auto-Advance
                    </>
                  )}
                </button>

                {autoAdvance && (
                  <div className="delay-selector">
                    <Clock size={14} className="delay-icon" />
                    <select
                      value={autoAdvanceDelay / 1000}
                      onChange={handleDelayChange}
                      className="delay-select"
                    >
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                    </select>

                    <div className="progress-bar">
                      <div
                        className="progress-indicator"
                        style={{
                          animationDuration: `${autoAdvanceDelay}ms`,
                          animationPlayState: autoAdvance
                            ? "running"
                            : "paused",
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="template-selector">
            <label htmlFor={`template-select-${post.id}`}>Use template:</label>
            <select
              id={`template-select-${post.id}`}
              value={selectedTemplate}
              onChange={handleTemplateSelect}
              className="template-select"
            >
              <option value="">Select a template...</option>
              {TEMPLATE_RESPONSES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={handleReplyChange}
            placeholder="Type your reply here..."
            rows={6}
            className="reply-textarea"
          />

          <div className="reply-controls">
            <div className="auto-post-controls">
              <label className="auto-post-label">
                <input
                  type="checkbox"
                  checked={autoPostEnabled}
                  onChange={() => setAutoPostEnabled(!autoPostEnabled)}
                />
                <Bot size={16} className="auto-icon" />
                Auto-post to Reddit
              </label>
              {autoPostStatus && (
                <span className={`auto-post-status ${autoPostStatus}`}>
                  {autoPostStatus === "posting" ? "Posting..." : "Posted!"}
                </span>
              )}
            </div>

            <button
              className={`copy-button ${copiedStatus ? "copied" : ""}`}
              onClick={handleCopyReply}
              disabled={!replyText.trim()}
              title="Copy to Clipboard (Ctrl+Enter)"
            >
              {copiedStatus ? (
                <>
                  <Check size={16} className="copy-icon" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} className="copy-icon" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>

          {replyHistory.length > 0 && (
            <div className="reply-history">
              <h4>Reply History</h4>
              <ul className="history-list">
                {replyHistory.slice(-5).map((reply) => (
                  <li key={reply.id} className="history-item">
                    <div className="history-meta">
                      <span className="history-timestamp">
                        {new Date(reply.timestamp).toLocaleTimeString("en-US")}
                      </span>
                      <span
                        className="history-post-title"
                        title={reply.postTitle}
                      >
                        {reply.postTitle.length > 30
                          ? reply.postTitle.substring(0, 30) + "..."
                          : reply.postTitle}
                      </span>
                    </div>
                    <div className="history-preview">
                      {reply.text.substring(0, 50)}
                      {reply.text.length > 50 ? "..." : ""}
                    </div>
                    <button
                      className="history-use-btn"
                      onClick={() => setReplyText(reply.text)}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Apply memoization with custom comparison to avoid unnecessary renders
export default React.memo(PostCard, (prevProps, nextProps) => {
  // Only re-render if post ID changes or important properties change
  const prevPost = prevProps.post;
  const nextPost = nextProps.post;

  // If IDs are different, we need to render
  if (prevPost.id !== nextPost.id) return false;

  // Check if score or comments changed (common updates)
  if (
    prevPost.score !== nextPost.score ||
    prevPost.num_comments !== nextPost.num_comments
  ) {
    return false;
  }

  // By default, assume posts are equal and no re-render is needed
  return true;
});
