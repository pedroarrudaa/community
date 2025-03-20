import { useState, useCallback } from "react";

/**
 * Hook to manage application state
 *
 * @returns {object} Application state and setters
 */
export function useAppState() {
  const [posts, setPosts] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [sortBy, setSortBy] = useState("new");
  const [timeFilter, setTimeFilter] = useState("week");
  const [completedItems, setCompletedItems] = useState([]);

  // Add more state variables as needed

  return {
    // State
    posts,
    tweets,
    loading,
    error,
    searchTerm,
    selectedPlatform,
    sortBy,
    timeFilter,
    completedItems,

    // Setters
    setPosts,
    setTweets,
    setLoading,
    setError,
    setSearchTerm,
    setSelectedPlatform,
    setSortBy,
    setTimeFilter,
    setCompletedItems,
  };
}

export default useAppState;
