import React from "react";
import { Card, Image } from "react-bootstrap";
import {
  FaHeart,
  FaRetweet,
  FaComment,
  FaTwitter,
  FaExternalLinkAlt,
} from "react-icons/fa";
import "./TwitterCard.css";

const TwitterCard = ({ tweet, onViewDetails }) => {
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="twitter-card">
      <Card.Header className="d-flex align-items-center bg-primary text-white">
        <FaTwitter className="me-2" />
        <span className="fw-bold">Twitter</span>
      </Card.Header>
      <Card.Body>
        <div className="d-flex mb-3">
          {tweet.profile_image ? (
            <Image
              src={tweet.profile_image}
              roundedCircle
              width={50}
              height={50}
              className="me-3"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
              }}
            />
          ) : (
            <div className="profile-placeholder me-3"></div>
          )}
          <div>
            <div className="fw-bold">{tweet.author_name || tweet.author}</div>
            <div className="text-muted">@{tweet.author}</div>
          </div>
        </div>

        <Card.Text>{tweet.content}</Card.Text>

        {tweet.media_url && (
          <div className="tweet-media mb-3">
            <img
              src={tweet.media_url}
              alt="Tweet media"
              className="img-fluid rounded"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        <div className="d-flex justify-content-between text-muted mt-3">
          <div className="d-flex align-items-center">
            <FaHeart className="me-1 text-danger" />
            <small>{tweet.likes || 0}</small>
          </div>
          <div className="d-flex align-items-center">
            <FaRetweet className="me-1 text-success" />
            <small>{tweet.retweets || 0}</small>
          </div>
          <div className="d-flex align-items-center">
            <FaComment className="me-1 text-primary" />
            <small>{tweet.replies || 0}</small>
          </div>
          <small>{formatDate(tweet.created_at)}</small>
        </div>
      </Card.Body>
      <Card.Footer className="d-flex justify-content-between align-items-center bg-white">
        <button
          onClick={() => onViewDetails && onViewDetails(tweet)}
          className="btn btn-sm btn-outline-secondary"
        >
          Ver Detalhes
        </button>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary"
        >
          <FaExternalLinkAlt className="me-1" />
          View on Twitter
        </a>
      </Card.Footer>
    </Card>
  );
};

export default TwitterCard;
