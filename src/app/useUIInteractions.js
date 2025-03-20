import { useState, useCallback, useRef } from "react";
import { useSortingFunctions } from "./useSortingFunctions";

/**
 * Hook that provides UI interaction handlers
 *
 * @param {object} appState Current application state
 * @param {function} fetchPosts Function to fetch posts
 * @param {function} fetchTweets Function to fetch tweets
 * @returns {object} UI interaction handlers
 */
export function useUIInteractions(appState, fetchPosts, fetchTweets) {
  const {
    sortBy,
    setSortBy,
    timeFilter,
    setTimeFilter,
    selectedPlatform,
    searchTerm,
    posts,
    tweets,
  } = appState;

  // Get sorting functions
  const { sortAllPosts } = useSortingFunctions();

  // Dropdown states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  // For throttling refresh requests
  const lastRefreshTime = useRef(0);
  const MIN_REFRESH_INTERVAL = 30000; // 30 seconds

  /**
   * Handle sort change
   *
   * @param {string} value New sort value
   */
  const handleSortChange = useCallback(
    (value) => {
      console.log(`Changing sort from ${sortBy} to ${value}`);

      // Prevent unnecessary operations if value didn't change
      if (sortBy === value) {
        console.log("Sort value unchanged, skipping operations");
        setShowSortDropdown(false);
        return;
      }

      // Update sortBy immediately to avoid UI consistency issues
      setSortBy(value);

      // Set appropriate time filter for each sort type
      if (value === "new") {
        // For newest posts, default to last week
        setTimeFilter("week");
      } else if (value === "engagement") {
        // For popular by engagement, prioritize recent posts (last 7 days)
        setTimeFilter("week");
      } else if (value === "top") {
        // For most likes, keep current time filter or set to all time
        if (!["day", "week", "month", "year", "all"].includes(timeFilter)) {
          setTimeFilter("all");
        }
      }

      // Debug log
      console.log(`Sort changed to: ${value}, Time filter: ${timeFilter}`);

      // Check if we have enough data to sort locally
      const hasEnoughDataToSortLocally =
        (selectedPlatform === "reddit" && posts.length > 0) ||
        (selectedPlatform === "twitter" && tweets.length > 0) ||
        (selectedPlatform === "all" && (posts.length > 0 || tweets.length > 0));

      // If we have recent data, just apply sorting locally without refetch
      if (hasEnoughDataToSortLocally && !searchTerm) {
        console.log("Using local sorting (no API call)");
        // Sorting will be applied automatically by useMemo in currentItems
      } else {
        // Otherwise, fetch new data from API
        console.log("Fetching new data with updated sort param");

        // Re-fetch data with new sorting
        if (selectedPlatform === "reddit" || selectedPlatform === "all") {
          fetchPosts(true);
        }
        if (selectedPlatform === "twitter" || selectedPlatform === "all") {
          fetchTweets(true);
        }
      }

      setShowSortDropdown(false);
    },
    [
      sortBy,
      setSortBy,
      timeFilter,
      setTimeFilter,
      selectedPlatform,
      searchTerm,
      posts.length,
      tweets.length,
      fetchPosts,
      fetchTweets,
    ]
  );

  /**
   * Handle time filter change
   *
   * @param {string} value New time filter value
   */
  const handleTimeChange = useCallback(
    (value) => {
      setTimeFilter(value);
      setShowTimeDropdown(false);
      console.log(`Time filter changed to: ${value}`);

      // Re-fetch data with new time filter
      if (selectedPlatform === "reddit" || selectedPlatform === "all") {
        fetchPosts(true);
      }
      if (selectedPlatform === "twitter" || selectedPlatform === "all") {
        fetchTweets(true);
      }
    },
    [selectedPlatform, fetchPosts, fetchTweets, setTimeFilter]
  );

  /**
   * Toggle dropdown visibility
   *
   * @param {string} dropdown Dropdown to toggle ('sort', 'time', 'platform')
   */
  const toggleDropdown = useCallback(
    (dropdown) => {
      // Ensure only one dropdown is open at a time
      if (dropdown === "sort") {
        setShowSortDropdown(!showSortDropdown);
        setShowTimeDropdown(false);
        setShowPlatformDropdown(false);
      } else if (dropdown === "time") {
        setShowTimeDropdown(!showTimeDropdown);
        setShowSortDropdown(false);
        setShowPlatformDropdown(false);
      } else if (dropdown === "platform") {
        setShowPlatformDropdown(!showPlatformDropdown);
        setShowSortDropdown(false);
        setShowTimeDropdown(false);
      }
    },
    [showSortDropdown, showTimeDropdown, showPlatformDropdown]
  );

  /**
   * Handle refresh (force fetch from API)
   */
  const handleRefresh = useCallback(() => {
    const now = new Date().getTime();
    const lastRefresh = lastRefreshTime.current || 0;
    const timeSinceLastRefresh = now - lastRefresh;

    // Check if we're refreshing too soon
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      const secondsToWait = Math.ceil(
        (MIN_REFRESH_INTERVAL - timeSinceLastRefresh) / 1000
      );
      console.log(
        `Please wait ${secondsToWait} seconds before refreshing again.`
      );
      return;
    }

    console.log("Forcing server data update...");
    lastRefreshTime.current = now;

    // Check which platform is active and update
    if (selectedPlatform === "reddit" || selectedPlatform === "all") {
      fetchPosts(true);
    }
    if (selectedPlatform === "twitter" || selectedPlatform === "all") {
      fetchTweets(true);
    }
  }, [selectedPlatform, fetchPosts, fetchTweets]);

  return {
    // Dropdown states
    showSortDropdown,
    showTimeDropdown,
    showPlatformDropdown,

    // Handlers
    handleSortChange,
    handleTimeChange,
    toggleDropdown,
    handleRefresh,
  };
}

export default useUIInteractions;
