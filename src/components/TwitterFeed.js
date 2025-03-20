import React, { useState, useEffect } from "react";
import { Card, Row, Col, Container, Spinner } from "react-bootstrap";
import TwitterCard from "./TwitterCard";

const TwitterFeed = ({ searchTerm, sortBy }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTweets = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = searchTerm
          ? `http://localhost:5001/api/tweets/search?query=${encodeURIComponent(
              searchTerm
            )}&sort=${sortBy}`
          : `http://localhost:5001/api/tweets/search?sort=${sortBy}`;

        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        setTweets(data.posts || []);
      } catch (err) {
        console.error("Error fetching tweets:", err);
        setError("Failed to load tweets. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, [searchTerm, sortBy]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-3" role="alert">
        {error}
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="alert alert-info my-3" role="alert">
        No tweets found. Try a different search term or check back later.
      </div>
    );
  }

  return (
    <Container>
      <Row>
        {tweets.map((tweet, index) => (
          <Col key={tweet.id || index} xs={12} className="mb-3">
            <TwitterCard tweet={tweet} />
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default TwitterFeed;
