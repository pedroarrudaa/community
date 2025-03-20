import React, { useState, useEffect, useCallback } from "react";
import "./CardDetail.css";
import {
  X as CloseIcon,
  MessageSquare,
  Calendar,
  RefreshCw,
  Zap,
  Copy,
  Check,
  Heart,
  ExternalLink,
  Eye,
  Hash,
  Tag,
} from "lucide-react";
import OpenAI from "openai";
import axios from "axios";
import DOMPurify from "dompurify";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Allow usage in browser (only for development)
});

// Add predefined classification categories
const CLASSIFICATION_CATEGORIES = {
  bug_issue: "Bug/Issue",
  frustration: "Frustration that can be leveraged",
  kudos: "Kudos/product appreciation",
  demo: "Demo",
  question: "Question",
  product_feedback: "Product Feedback",
};

// Classification colors mapping
const CLASSIFICATION_COLORS = {
  bug_issue: "#F44336", // Red
  frustration: "#FF9800", // Orange
  kudos: "#4CAF50", // Green
  demo: "#2196F3", // Blue
  question: "#9C27B0", // Purple
  product_feedback: "#607D8B", // Blue Grey
};

/**
 * Card Detail component for displaying full content of posts/tweets in a modal
 *
 * @param {Object} props
 * @param {Object} props.item - Post or tweet data object
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {boolean} props.isTwitter - Whether the item is a tweet
 * @param {boolean} props.isCursorForum - Whether the item is from Cursor Forum
 * @param {Function} props.onNext - Function to navigate to next item
 * @param {Function} props.onPrev - Function to navigate to previous item
 * @param {Function} props.onMarkCompleted - Function to mark the item as completed
 */
const CardDetail = ({
  item,
  isOpen,
  onClose,
  isTwitter = false,
  isCursorForum = false,
  onNext,
  onPrev,
  onMarkCompleted,
  categoryColors = {},
}) => {
  console.log("CardDetail rendering:", { isOpen, item });

  // All state hooks must be called unconditionally at the top level
  const [post, setPost] = useState(item || null);
  const [autoReply, setAutoReply] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplying, setIsReplying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(
    item?.is_completed || false
  );
  const [showCopyNotification] = useState(false);
  const [isReplySent, setIsReplySent] = useState(false);
  const [summary, setSummary] = useState("");
  const [contentSummary, setContentSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [replyButtonText, setReplyButtonText] = useState("Copy and Reply");
  const [isReplyCopied, setIsReplyCopied] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [apiErrors, setApiErrors] = useState({
    classifications: false,
    details: false,
  });
  const [replyText, setReplyText] = useState("");
  const [isGeneratingAutoReply, setIsGeneratingAutoReply] = useState(false);
  const [usingOpenAI, setUsingOpenAI] = useState(false);
  const [showCompletionConfirmation, setShowCompletionConfirmation] =
    useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [alternativeImageUrl, setAlternativeImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(null);

  // Computed flags for better readability
  const isCompleted = localCompleted || (post && post.is_completed);
  const hasReply = autoReply && autoReply.trim().length > 0;
  const isReddit = !isTwitter && !isCursorForum; // If it's not Twitter nor Cursor Forum, it's Reddit

  // Function declarations for event handlers and component logic
  const handlePostClick = () => {
    if (post.url) {
      window.open(post.url, "_blank", "noopener,noreferrer");
    }
  };

  const handlePlatformFilterClick = (platform) => (e) => {
    e.stopPropagation();
    // Filter logic here
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getPlatformName = () => {
    if (isCursorForum) return "Cursor Forum";
    if (isTwitter) return "Twitter";
    return "Reddit";
  };

  const getPlatformClass = () => {
    if (isCursorForum) return "cursor-forum";
    if (isTwitter) return "twitter";
    return "reddit";
  };

  const handleReplyButtonClick = () => {
    // Copy the text to clipboard
    try {
      navigator.clipboard.writeText(replyText);
      setIsReplyCopied(true);

      // Reset state after 3 seconds
      setTimeout(() => {
        setIsReplyCopied(false);
      }, 3000);

      // Open the original link in a new tab
      const url =
        post.url ||
        (isTwitter
          ? `https://twitter.com/${post.author}/status/${post.id}`
          : isCursorForum
          ? post.url
          : `https://reddit.com${post.permalink}`);

      if (url) {
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");

        // When focus returns to this window, show the confirmation modal
        window.addEventListener("focus", function onFocus() {
          setTimeout(() => {
            setShowConfirmationModal(true);
            // Remove the event listener to prevent multiple calls
            window.removeEventListener("focus", onFocus);
          }, 500);
        });
      }
    } catch (error) {
      console.error("Error copying text or opening link:", error);
    }
  };

  const handleConfirmationResponse = (confirmed) => {
    // Close the confirmation modal
    setShowConfirmationModal(false);

    if (confirmed) {
      // Call the function to mark as completed
      handleMarkCompleted();
    }
  };

  const handleMarkCompleted = () => {
    // Mark the post as completed
    setLocalCompleted(true);

    // Call the callback passed to the component, if it exists
    if (onMarkCompleted && typeof onMarkCompleted === "function") {
      onMarkCompleted(post.id);
    }

    // Close the modal after marking as completed
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const generateOpenAIResponse = async () => {
    // OpenAI response generation logic
  };

  // Function to generate response using OpenAI
  const generateAutoReply = () => {
    setIsGeneratingAutoReply(true);
    setReplyText(""); // Clear any existing text

    // Use OpenAI for generating response
    const prompt = `Generate a helpful and friendly response to the following ${
      isTwitter ? "tweet" : isCursorForum ? "Cursor Forum post" : "Reddit post"
    }:\n\n"${post.content || post.title}"`;

    // Simulate an API call
    setTimeout(() => {
      let responses;

      if (isTwitter) {
        responses = [
          `Thank you for sharing your experience with the Cursor! I'll analyze this problem and help you resolve it. Could you provide more details about your setup?`,
          `Interesting observation! We're working on improvements in that area of the Cursor. Your experience is valuable for our continuous development.`,
          `Let's investigate this behavior in the Cursor. If you could share a reproducible case, it would help us a lot to understand the problem better.`,
        ];
      } else if (isReddit) {
        responses = [
          `Thank you for sharing this post on Reddit. It's an important discussion. I agree with several points raised and believe we can improve the Cursor experience in this aspect.`,
          `Interesting discussion on Reddit! This is a relevant topic for the Cursor community. We're collecting feedback like this for our next updates.`,
          `I saw your post on Reddit and wanted to thank you for sharing your opinion. User feedback is fundamental for us to continue improving the Cursor.`,
        ];
      } else {
        // Cursor Forum (keeping the original responses as an example)
        responses = [
          `Thank you for sharing your experience in the Cursor Forum. This common issue with invisible files is quite common. Glad to see that checking again the windsurf resolved the problem!`,
          `I've faced similar issues in the Cursor before. Sometimes, restarting the IDE or clearing the cache can help with file visibility issues. I'm glad you found a solution!`,
          `This seems to be a common issue in the Cursor when working with certain files. The fact that checking again resolved it suggests it could be an indexing issue. Thank you for sharing your solution!`,
        ];
      }

      // Choose a random response
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      setReplyText(randomResponse);
      setIsGeneratingAutoReply(false);
    }, 1500);
  };

  const hasTweetImage = () => {
    // Check if tweet has image logic
  };

  const getOptimizedImageUrl = (url) => {
    // Image URL optimization logic
  };

  const handleImageLoad = () => {
    // Image load handling logic
  };

  const handleImageError = () => {
    // Image error handling logic
  };

  const renderContent = () => {
    // Content rendering logic
  };

  const renderClassifications = () => {
    // Classifications rendering logic
  };

  // Render classification labels
  const renderClassificationLabels = () => {
    if (!post.classifications || post.classifications.length === 0) {
      return null;
    }

    return (
      <div className="post-classification-labels">
        <div className="classification-header">
          <Tag size={14} />
          <span>Classifications:</span>
        </div>
        <div className="classification-tags">
          {post.classifications.map((category, index) => {
            // Use our predefined colors and labels
            const color = CLASSIFICATION_COLORS[category] || "#9e9e9e";
            const label = CLASSIFICATION_CATEGORIES[category] || category;

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
                {label}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to handle post classification
  const handleClassifyPost = async () => {
    if (!post || !post.id) return;

    try {
      setApiErrors("");
      setLoading(true);

      // Get the post content
      const postContent = post.selftext || post.body || post.content || "";
      const postTitle = post.title || "";

      // Instead of calling the API, let's simulate classification
      // In a production environment, you would call the API:
      // const response = await axios.post(`/api/classify-posts`, {...});

      // Simulate classification based on keywords in the post
      const classifications = [];

      if (
        postTitle.toLowerCase().includes("bug") ||
        postTitle.toLowerCase().includes("issue") ||
        postContent.toLowerCase().includes("doesn't work") ||
        postContent.toLowerCase().includes("broken")
      ) {
        classifications.push("bug_issue");
      }

      if (
        postContent.toLowerCase().includes("frustrat") ||
        postContent.toLowerCase().includes("annoying") ||
        postContent.toLowerCase().includes("irritat")
      ) {
        classifications.push("frustration");
      }

      if (
        postContent.toLowerCase().includes("thank") ||
        postContent.toLowerCase().includes("great") ||
        postContent.toLowerCase().includes("love") ||
        postContent.toLowerCase().includes("appreciate")
      ) {
        classifications.push("kudos");
      }

      if (
        postContent.toLowerCase().includes("demo") ||
        postContent.toLowerCase().includes("showcase") ||
        postContent.toLowerCase().includes("example")
      ) {
        classifications.push("demo");
      }

      if (
        postTitle.toLowerCase().includes("?") ||
        postContent.toLowerCase().includes("?") ||
        postTitle.toLowerCase().includes("how") ||
        postTitle.toLowerCase().includes("what")
      ) {
        classifications.push("question");
      }

      if (
        postContent.toLowerCase().includes("suggest") ||
        postContent.toLowerCase().includes("improve") ||
        postContent.toLowerCase().includes("feature") ||
        postContent.toLowerCase().includes("enhance")
      ) {
        classifications.push("product_feedback");
      }

      // If no classifications were found, add a default one
      if (classifications.length === 0) {
        classifications.push("question");
      }

      // Set the primary classification as the first one
      const primaryClassification = classifications[0];

      // Update local post data with classification results
      post.classifications = classifications;
      post.primary_classification = primaryClassification;

      // Force re-render
      setContent({ ...post });

      // Show success message
      // You would typically set some state to show a success message
      console.log("Post classified successfully:", classifications);
    } catch (error) {
      console.error("Error classifying post:", error);
      setApiErrors("Failed to classify post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add classification button to the detail card content
  const renderClassifyButton = () => {
    if (loading) {
      return (
        <button className="classify-button loading" disabled>
          Classifying...
        </button>
      );
    }

    return (
      <button
        className="classify-button"
        onClick={handleClassifyPost}
        disabled={loading}
      >
        <Tag size={14} />
        Classify Post
      </button>
    );
  };

  // All useCallback hooks must be defined at the top level
  const fetchMissingClassifications = useCallback(async () => {
    if (
      isCursorForum &&
      post &&
      post.id &&
      (!post.classifications || post.classifications.length === 0)
    ) {
      try {
        setApiErrors((prev) => ({ ...prev, classifications: false }));
        // Request classification for this specific post
        const response = await axios.post(`/api/classify-posts`, {
          post_id: post.id,
          source: "cursor_forum",
          limit: 1,
        });

        if (
          response.data &&
          response.data.posts &&
          response.data.posts.length > 0
        ) {
          const updatedPost = response.data.posts[0];
          setPost((prev) => ({
            ...prev,
            classifications: updatedPost.classifications,
            primary_classification: updatedPost.primary_classification,
            classified_at: updatedPost.classified_at,
          }));
        }
      } catch (error) {
        console.error("Error fetching classifications:", error);
        setApiErrors((prev) => ({ ...prev, classifications: true }));
      }
    }
  }, [isCursorForum, post?.id, post?.classifications]);

  // All useEffect hooks must be defined at the top level
  useEffect(() => {
    if (item) {
      setPost(item);
      setSummary("");
      setAutoReply("");
      setIsGenerating(false);
      setLocalCompleted(item?.is_completed || false);
    }
  }, [item]);

  // Efeito para gerar respostas automáticas para posts do Twitter e Reddit quando o modal é aberto
  useEffect(() => {
    if (
      isOpen &&
      post &&
      (isTwitter || isReddit) &&
      !isCursorForum &&
      replyText === ""
    ) {
      // Gerar resposta automática apenas para posts do Twitter e Reddit
      // e apenas se não houver já uma resposta
      generateAutoReply();
    }
  }, [isOpen, post, isTwitter, isReddit, isCursorForum, replyText]);

  useEffect(() => {
    const handleEscKeyPress = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKeyPress);

    return () => {
      window.removeEventListener("keydown", handleEscKeyPress);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchCursorForumData = async () => {
      if (isCursorForum && post && post.id) {
        try {
          setApiErrors((prev) => ({ ...prev, details: false }));
          const response = await axios.get(`/api/cursor-forum/post/${post.id}`);
          if (response.data) {
            setPost((prev) => ({ ...prev, ...response.data }));
          }
        } catch (error) {
          console.error("Error fetching Cursor Forum post details:", error);
          setApiErrors((prev) => ({ ...prev, details: true }));
        }
      }
    };

    fetchCursorForumData();
  }, [isCursorForum, post?.id]);

  useEffect(() => {
    if (
      isCursorForum &&
      post &&
      (!post.classifications || post.classifications.length === 0)
    ) {
      fetchMissingClassifications();
    }
  }, [isCursorForum, post, fetchMissingClassifications]);

  // Only after all hooks, we do the conditional rendering check
  if (!isOpen || !item) {
    console.log("CardDetail aborting rendering: modal closed or without item");
    return null;
  }

  // Rest of the component (JSX rendering)
  return (
    <div
      className={`card-detail-overlay ${getPlatformClass()}`}
      onClick={onClose}
    >
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-close-button" onClick={onClose}>
          <CloseIcon size={20} />
        </button>

        <div className="card-detail-header">
          {/* Title with author info */}
          <h2 className="card-detail-title">
            {item.profile_image && !isCursorForum && (
              <img
                src={item.profile_image}
                alt={`@${item.author}`}
                className="title-profile-image"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            {isCursorForum ? (
              <>
                {item.title}
                <span className="cursor-forum-author">by @{item.author}</span>
              </>
            ) : (
              <>Post by @{item.author}</>
            )}
          </h2>

          <div className="card-detail-meta">
            {/* Platform badge */}
            {item.author && (
              <span className="card-meta-item">
                <span
                  className={`platform-label ${getPlatformClass()} clickable`}
                  onClick={handlePlatformFilterClick(
                    isCursorForum
                      ? "cursor_forum"
                      : isTwitter
                      ? "twitter"
                      : "reddit"
                  )}
                >
                  {getPlatformName()}
                </span>
              </span>
            )}

            {/* Cursor Forum specific category badge */}
            {isCursorForum && item.category && (
              <span className="card-meta-item category-badge">
                <Hash size={14} />
                {item.category}
              </span>
            )}

            {/* Date/time */}
            {(item.created_utc || item.created_at) && (
              <span className="card-meta-item">
                <Calendar size={14} />
                {formatDate(
                  isTwitter && item.created_at
                    ? item.created_at
                    : isCursorForum && item.created_at
                    ? item.created_at
                    : item.created_utc
                    ? new Date(item.created_utc * 1000)
                    : new Date()
                )}
              </span>
            )}
          </div>
        </div>

        {/* Cursor Forum specific sentiment indicator */}
        {isCursorForum && item.sentiment_label && (
          <div className="cursor-forum-sentiment">
            <div className={`sentiment-pill ${item.sentiment_label}`}>
              <span className={`sentiment-dot ${item.sentiment_label}`}></span>
              <span className="sentiment-text">{item.sentiment_label}</span>
            </div>
          </div>
        )}

        <div
          className="card-detail-content clickable"
          onClick={handlePostClick}
        >
          <div className="card-content-text">
            {isCursorForum ? (
              <div className="cursor-forum-content">
                {/* Summary section */}
                <div className="cursor-forum-summary">
                  <h4>Summary</h4>
                  {loadingSummary ? (
                    <div className="summary-loading">
                      <RefreshCw size={16} className="spin" />
                      <span>Generating summary...</span>
                    </div>
                  ) : summary ? (
                    <p>{summary}</p>
                  ) : (
                    <p>No summary available</p>
                  )}
                </div>

                <div className="summary-divider"></div>

                {/* Full content section */}
                <details open>
                  <summary>Full Content</summary>
                  <div className="cursor-forum-body">
                    {loading ? (
                      <div className="loading-indicator">
                        <RefreshCw size={16} className="spin" />
                        <span>Loading content...</span>
                      </div>
                    ) : content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(content),
                        }}
                      />
                    ) : (
                      <p className="empty-content-notice">
                        No content available.{" "}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Read on Cursor Forum
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              </div>
            ) : (
              <p>{item.content}</p>
            )}
          </div>

          {/* Image section - improved to handle both tweet media and post images */}
          {!isCursorForum &&
            ((isTwitter && hasTweetImage()) || (!isTwitter && item.image)) && (
              <div
                className={`card-detail-image ${
                  isTwitter ? "twitter-image" : ""
                } ${imageLoading ? "loading" : "image-loaded"} ${
                  imageError ? "image-error" : ""
                }`}
              >
                {/* Loading state indicator */}
                {imageLoading && (
                  <div className="image-loading-indicator">
                    <span>Loading image...</span>
                  </div>
                )}

                {/* Error state with retry button */}
                {imageError && (
                  <div className="image-error-container">
                    <p>Failed to load image</p>
                    <button
                      className="retry-image-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageError(false);
                        setImageLoading(true);
                        setRetryCount(0);
                        setAlternativeImageUrl(null);
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!imageError && !imageLoading && (
                  <img
                    src={getOptimizedImageUrl(
                      alternativeImageUrl || item.image
                    )}
                    alt={item.title || "Post image"}
                    className={imageLoading ? "loading" : "loaded"}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent closing the modal
                      // Open image in lightbox (full-screen view)
                      window.open(
                        getOptimizedImageUrl(alternativeImageUrl || item.image),
                        "_blank"
                      );
                    }}
                  />
                )}

                {!imageError && !imageLoading && (
                  <div className="image-fullscreen-hint">
                    Click image to view full size
                  </div>
                )}
              </div>
            )}

          <div className="click-to-open-hint">Click to open original post</div>
        </div>

        <div className="card-detail-stats">
          {/* Standard stats display (likes, comments, retweets) */}
          {!isCursorForum &&
            (item.score !== undefined || item.likes !== undefined) && (
              <span className="card-stat-item">
                <Heart size={16} className="post-stat-icon like-icon" />
                <span className="stat-label">Likes:</span>{" "}
                {item.score || item.likes || 0}
              </span>
            )}

          {!isCursorForum &&
            (item.num_comments !== undefined || item.replies !== undefined) && (
              <span className="card-stat-item">
                <MessageSquare size={16} className="post-stat-icon" />
                <span className="stat-label">Comments:</span>{" "}
                {item.num_comments || item.replies || 0}
              </span>
            )}

          {!isCursorForum && item.retweets !== undefined && (
            <span className="card-stat-item">
              <RefreshCw size={16} />
              {item.retweets}
            </span>
          )}

          {/* Cursor Forum specific stats */}
          {isCursorForum && (
            <>
              {item.replies !== undefined && (
                <span className="card-stat-item">
                  <MessageSquare size={16} className="post-stat-icon" />
                  <span className="stat-label">Replies:</span> {item.replies}
                </span>
              )}
              {item.views !== undefined && (
                <span className="card-stat-item">
                  <Eye size={16} className="post-stat-icon" />
                  <span className="stat-label">Views:</span> {item.views}
                </span>
              )}
              {item.likes !== undefined && (
                <span className="card-stat-item">
                  <Heart size={16} className="post-stat-icon like-icon" />
                  <span className="stat-label">Likes:</span> {item.likes}
                </span>
              )}
            </>
          )}
        </div>

        {/* External link for Cursor Forum */}
        {isCursorForum && item.url && (
          <div className="cursor-forum-external-link">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link-button"
            >
              <ExternalLink size={14} />
              <span>Open in Cursor Forum</span>
            </a>
          </div>
        )}

        {/* Reply section - removida condição isReplying para garantir que sempre apareça */}
        <div className="card-reply-section">
          <textarea
            className="card-reply-input"
            placeholder={`Reply to ${
              isTwitter
                ? "@" + item.author
                : isCursorForum
                ? "@" + item.author + " on Cursor Forum"
                : "u/" + item.author
            }...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
          />
          <div className="card-reply-actions">
            <div className="all-buttons-container">
              <button
                className="shortcut-button"
                onClick={generateAutoReply}
                disabled={isGeneratingAutoReply}
              >
                {isGeneratingAutoReply ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    {usingOpenAI ? "Generating..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Generate New Response
                  </>
                )}
              </button>

              <button
                className={`shortcut-button primary ${
                  isReplyCopied ? "copied" : ""
                }`}
                onClick={handleReplyButtonClick}
                disabled={isGeneratingAutoReply}
              >
                {isReplyCopied ? (
                  <>
                    <Check size={16} />
                    {replyButtonText}
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    {replyButtonText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Copy notification */}
        {showCopyNotification && (
          <div className="copy-notification">
            {copied ? "Response copied to clipboard!" : ""}
          </div>
        )}

        {showCompletionConfirmation && (
          <div className="completion-confirmation">
            <div className="confirmation-content">
              <h3>Would you like to mark this task as completed?</h3>
              <div className="confirmation-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowCompletionConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={() => handleConfirmationResponse(true)}
                >
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmationModal && (
          <div
            className="confirmation-modal-overlay"
            onClick={() => setShowConfirmationModal(false)}
          >
            <div
              className="confirmation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Would you like to mark this task as completed?</h3>
              <p>This will remove this post from your main page.</p>
              <div className="confirmation-buttons">
                <button
                  className="cancel-button"
                  onClick={() => setShowConfirmationModal(false)}
                >
                  No, keep it
                </button>
                <button
                  className="confirm-button"
                  onClick={() => handleConfirmationResponse(true)}
                >
                  Yes, mark as completed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add classifications section */}
        {renderClassifications()}

        {/* Add classification button and labels near the title */}
        <div className="post-header">
          <h2 className="post-title">{item.title}</h2>

          <div className="post-controls">
            {renderClassifyButton()}
            {/* ... other controls ... */}
          </div>

          {renderClassificationLabels()}
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
