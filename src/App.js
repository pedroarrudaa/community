import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import "./App.css";
import {
  Search,
  TrendingUp,
  Clock,
  Filter,
  MessageSquare,
  ThumbsUp,
  RefreshCw,
  ChevronDown,
  Globe,
  Zap,
  Wind,
  Twitter,
  X,
  MessagesSquare,
  Database,
  ArrowUp,
  ArrowDown,
  Moon,
  Sun,
  ArrowRight,
  MoreHorizontal,
  ExternalLink,
  Flame,
} from "lucide-react";
import axios from "axios";
import ThemeSwitcher from "./components/ThemeSwitcher";

// Import UI components
import PostCard from "./components/PostCard";
import TwitterCard from "./components/TwitterCard";
import "./components/TwitterCard.css";
import CardDetail from "./components/CardDetail";
import Navbar from "./components/Navbar";
import ErrorMessage from "./components/ErrorMessage";
import { formatApiError, logError } from "./utils/errorHandling";
import NestedFilterPanel from "./components/NestedFilterPanel";
import "./components/NestedFilterPanel.css";
import CursorForumCard from "./components/CursorForumCard";
import ModalTest from "./components/ModalTest";
import ModalFix from "./components/ModalFix";
import FilterBar from "./components/FilterBar";

// API base URL - configurable for development/production
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5002";

// Debug logger that only logs in development mode
const debugLog = (...args) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds timeout

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for logging
api.interceptors.request.use((request) => {
  debugLog("Starting Request:", request.url);
  request.metadata = { startTime: new Date().getTime() };
  return request;
});

// Add response interceptor for timing
api.interceptors.response.use((response) => {
  const duration = new Date().getTime() - response.config.metadata.startTime;
  debugLog(`Request to ${response.config.url} took ${duration}ms`);
  return response;
});

// Client-side cache implementation
const cache = {
  data: {},
  timeout: 2 * 60 * 1000, // 2 minutes in milliseconds

  set(key, data) {
    this.data[key] = {
      data,
      timestamp: Date.now(),
    };
    // Store in sessionStorage for persistence between page refreshes
    try {
      sessionStorage.setItem("communitysurf_cache", JSON.stringify(this.data));
    } catch (e) {
      console.warn("Failed to store cache in sessionStorage:", e);
    }
  },

  get(key) {
    // Try to load from sessionStorage if cache is empty
    if (Object.keys(this.data).length === 0) {
      try {
        const storedCache = sessionStorage.getItem("communitysurf_cache");
        if (storedCache) {
          this.data = JSON.parse(storedCache);
        }
      } catch (e) {
        console.warn("Failed to load cache from sessionStorage:", e);
      }
    }

    const item = this.data[key];
    if (!item) return null;

    // Check if data is fresh
    if (Date.now() - item.timestamp > this.timeout) {
      delete this.data[key];
      return null;
    }

    return item.data;
  },

  clear() {
    this.data = {};
    try {
      sessionStorage.removeItem("communitysurf_cache");
    } catch (e) {
      console.warn("Failed to clear sessionStorage cache:", e);
    }
  },
};

// Post display limit (increased to show more cards)
const DEFAULT_POST_LIMIT = 20;

// Utility functions for post date normalization and sorting
const getPostDate = (post, index = -1) => {
  // Only log for diagnostic purposes for the first 5 posts
  const shouldLog = index >= 0 && index < 5;

  // Normalize timestamp handling for different platforms
  let timestamp = 0;
  let source = "Unknown";

  // Reddit uses created_utc (seconds since epoch)
  if (post && post.created_utc !== undefined) {
    timestamp = post.created_utc * 1000; // Convert to milliseconds
    source = "Reddit UTC";
  }
  // Twitter uses created_at (seconds since epoch)
  else if (post && post.created_at !== undefined) {
    timestamp = post.created_at * 1000; // Convert to milliseconds
    source = "Twitter";
  }
  // For any other platform or format that might be added later
  else if (post && post.timestamp !== undefined) {
    timestamp = typeof post.timestamp === "number" ? post.timestamp : 0;
    source = "Other";
  }

  // Create a date object from the normalized timestamp
  const date = new Date(timestamp);

  // Log the normalized date only for first 5 posts for debugging
  if (shouldLog) {
    console.log(
      `Post ${index + 1} date format:`,
      `${source}: ${timestamp / 1000}`,
      "→ Normalized:",
      date.toISOString()
    );
  }

  return date;
};

// Sort posts function that works for both Twitter and Reddit posts
const sortAllPosts = (posts, sortBy) => {
  try {
    // If there are no posts, return an empty array
    if (!posts || posts.length === 0) {
      return [];
    }

    let sortedPosts = [...posts];

    // Log sorting info
    console.log(`Sorting ${posts.length} posts with method: ${sortBy}`);

    // Apply sorting
    switch (sortBy) {
      case "new":
        // Sort by created date (most recent first)
        sortedPosts.sort((a, b) => {
          // Use a unified function to get the post date
          const dateA = getPostDate(a);
          const dateB = getPostDate(b);
          return dateB - dateA;
        });
        break;
      case "top":
        // Sort by score/likes (highest first)
        sortedPosts.sort((a, b) => {
          const scoreA = a.score !== undefined ? a.score : a.likes || 0;
          const scoreB = b.score !== undefined ? b.score : b.likes || 0;
          return scoreB - scoreA;
        });
        break;
      case "engagement":
        // Sort by a weighted combination of relevance score
        sortedPosts.sort((a, b) => {
          const relevanceA = a.relevance_score || 0;
          const relevanceB = b.relevance_score || 0;

          // If relevance scores are equal, sort by recency
          if (relevanceB === relevanceA) {
            const dateA = getPostDate(a);
            const dateB = getPostDate(b);
            return dateB - dateA;
          }

          return relevanceB - relevanceA;
        });
        break;
      default:
        // Default to "hot" - a combination of recency and engagement
        // Sort posts into time buckets, then by engagement within each bucket
        const now = new Date().getTime();
        const buckets = {
          day: [], // Last 24 hours
          threeDays: [], // Last 3 days
          week: [], // Last week
          older: [], // Older than a week
        };

        // Categorize posts by age
        sortedPosts.forEach((item) => {
          try {
            // Use the normalized getPostDate function
            const itemDate = getPostDate(item);
            const diffHours = (now - itemDate) / (1000 * 60 * 60);

            if (diffHours <= 24) {
              buckets.day.push(item);
            } else if (diffHours <= 72) {
              buckets.threeDays.push(item);
            } else if (diffHours <= 168) {
              buckets.week.push(item);
            } else {
              buckets.older.push(item);
            }
          } catch (err) {
            console.error("Error categorizing post:", err);
            // In case of error, put in the oldest bucket
            buckets.older.push(item);
          }
        });

        // Sort each bucket by relevance score
        const sortByRelevance = (items) => {
          return [...items].sort((a, b) => {
            const relevanceA = a.relevance_score || 0;
            const relevanceB = b.relevance_score || 0;
            return relevanceB - relevanceA;
          });
        };

        // Combine all buckets, preserving the time-based ordering
        sortedPosts = [
          ...sortByRelevance(buckets.day),
          ...sortByRelevance(buckets.threeDays),
          ...sortByRelevance(buckets.week),
          ...sortByRelevance(buckets.older),
        ];
    }

    // Log results for debugging
    try {
      console.log(`Sorted posts (${sortBy}):`);
      sortedPosts.slice(0, 5).forEach((post, index) => {
        try {
          const date = getPostDate(post);
          const platform = post.source || "unknown";
          const score = post.score !== undefined ? post.score : post.likes || 0;
          const comments =
            post.num_comments !== undefined
              ? post.num_comments
              : post.replies || 0;
          const relevance = post.relevance_score || 0;

          // Check if date is valid before calling toISOString
          const dateStr = !isNaN(date.getTime())
            ? date.toISOString()
            : "Invalid Date";

          console.log(
            `${
              index + 1
            }. [${platform}] ${dateStr} - Score: ${score} - Comments: ${comments} - Relevance: ${relevance}`
          );
        } catch (err) {
          console.error("Error logging post:", err);
        }
      });
    } catch (error) {
      console.error("Error in sortAllPosts logging:", error);
    }

    return sortedPosts;
  } catch (error) {
    console.error("Error in sortAllPosts:", error);
    // Return the original posts in case of critical error
    return posts;
  }
};

// Keep applySort as a reference to the centralized function for compatibility
const applySort = sortAllPosts;

// Function to decode HTML entities in content
const decodeHtmlEntities = (text) => {
  if (!text) return "";

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
};

// Utility function to enhance image URLs
const enhanceImageUrl = (url, highResolution = true) => {
  if (!url) return null;

  // Decode URLs with special characters
  try {
    url = decodeURIComponent(url.replace(/&amp;/g, "&"));
  } catch (e) {
    // If decoding fails, use the original URL
  }

  // For Reddit images
  if (url.includes("redd.it")) {
    // Distinguish between preview and direct links
    if (url.includes("preview.redd.it")) {
      // Make sure it's high resolution
      const resolution = highResolution ? 1080 : 640;
      if (!url.includes("width=")) {
        return `${url}${
          url.includes("?") ? "&" : "?"
        }width=${resolution}&format=pjpg&auto=webp&s=`;
      } else if (url.includes("width=") && !url.match(/width=[0-9]{4,}/)) {
        return url.replace(/width=[0-9]+/, `width=${resolution}`);
      }
    }
    // i.redd.it are direct image links and already high quality
    return url;
  }

  // For Reddit thumbnails
  if (url.includes("thumbnail")) {
    // Transform to preview URL for better quality
    const resolution = highResolution ? 1080 : 640;
    const previewUrl = url.replace("thumbnail", "preview");
    return `${previewUrl}${
      previewUrl.includes("?") ? "&" : "?"
    }width=${resolution}&format=pjpg&auto=webp&s=`;
  }

  // For Imgur images
  if (url.includes("imgur.com")) {
    // If there's no file extension, add .jpg
    if (!url.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return `${url}.jpg`;
    }

    // If it's an Imgur thumbnail, replace with large version
    if (highResolution) {
      return url
        .replace("s.imgur.com", "i.imgur.com")
        .replace(/[a-z]\.jpg/i, ".jpg")
        .replace(/[a-z]\.png/i, ".png")
        .replace("b.jpg", ".jpg")
        .replace("b.png", ".png");
    }
    return url;
  }

  // Twitter URLs
  if (url.includes("twimg.com")) {
    // Replace smaller sizes with 'large' or 'orig'
    if (highResolution) {
      return url
        .replace("small", "large")
        .replace("medium", "large")
        .replace("thumb", "large")
        .replace("format=jpg", "format=png")
        .replace("_normal", "_large");
    }
    return url;
  }

  // Other known image hosts
  if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    // Seems to be a direct image URL already
    return url;
  }

  // Default case - return original URL
  return url;
};

// Action Types
const ACTION_TYPES = {
  FETCH_POSTS_START: "FETCH_POSTS_START",
  FETCH_POSTS_SUCCESS: "FETCH_POSTS_SUCCESS",
  FETCH_POSTS_ERROR: "FETCH_POSTS_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  FETCH_TWEETS_START: "FETCH_TWEETS_START",
  FETCH_TWEETS_SUCCESS: "FETCH_TWEETS_SUCCESS",
  FETCH_TWEETS_ERROR: "FETCH_TWEETS_ERROR",
  FETCH_CURSOR_START: "FETCH_CURSOR_START",
  FETCH_CURSOR_SUCCESS: "FETCH_CURSOR_SUCCESS",
  FETCH_CURSOR_ERROR: "FETCH_CURSOR_ERROR",
  SET_SEARCH_TERM: "SET_SEARCH_TERM",
  SET_TWITTER_QUERY: "SET_TWITTER_QUERY",
  SET_SELECTED_PLATFORM: "SET_SELECTED_PLATFORM",
  SET_SORT_BY: "SET_SORT_BY",
  SET_TIME_FILTER: "SET_TIME_FILTER",
  MARK_COMPLETED: "MARK_COMPLETED",
  SET_VISIBLE_POSTS: "SET_VISIBLE_POSTS",
  SET_CURRENT_POST_INDEX: "SET_CURRENT_POST_INDEX",
  SET_SELECTED_ITEM: "SET_SELECTED_ITEM",
  SET_IS_DETAIL_OPEN: "SET_IS_DETAIL_OPEN",
  SET_IS_TWITTER_DETAIL: "SET_IS_TWITTER_DETAIL",
  SET_SHOW_SUBREDDIT_DROPDOWN: "SET_SHOW_SUBREDDIT_DROPDOWN",
  SET_SHOW_SORT_DROPDOWN: "SET_SHOW_SORT_DROPDOWN",
  SET_SHOW_TIME_DROPDOWN: "SET_SHOW_TIME_DROPDOWN",
  SET_SHOW_PLATFORM_DROPDOWN: "SET_SHOW_PLATFORM_DROPDOWN",
  SET_RENDER_KEY: "SET_RENDER_KEY",
  SET_ACTIVE_TAB: "SET_ACTIVE_TAB",
  SET_SELECTED_SUBREDDIT: "SET_SELECTED_SUBREDDIT",
  SET_IS_CURSOR_FORUM_DETAIL: "SET_IS_CURSOR_FORUM_DETAIL",
};

// Initial State
const initialState = {
  posts: [],
  tweets: [],
  cursorForumPosts: [], // Add support for Cursor Forum posts
  loading: false,
  error: null,
  loadingMore: false,
  hasMore: true,
  page: 1,
  completedItems: [],

  // Filter and UI states
  searchTerm: "",
  activeTab: "all",
  selectedSubreddit: "all",
  selectedTimeFilter: "all",
  selectedSort: "hot",
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  dataSource: "api",

  // Detail view states
  selectedItem: null,
  isDetailOpen: false,
  isTwitterDetail: false,
  isCursorForumDetail: false, // Add state for Cursor Forum detail

  // Shared state
  selectedPlatform: "all",
  completedItems: [],

  // UI dropdown states
  showSubredditDropdown: false,
  showSortDropdown: false,
  showTimeDropdown: false,
  showPlatformDropdown: false,
  renderKey: 0,
  visiblePosts: 20,
  currentPostIndex: 0,
};

// Reducer Function
function dataReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.FETCH_POSTS_START:
      return { ...state, loading: true, error: null };

    case ACTION_TYPES.FETCH_POSTS_SUCCESS:
      return {
        ...state,
        posts: action.payload.posts,
        loading: false,
        lastFetchTime: new Date(),
        fromCache: action.payload.fromCache || false,
        renderKey: state.renderKey + 1,
      };

    case ACTION_TYPES.FETCH_POSTS_ERROR:
      return { ...state, loading: false, error: action.payload.error };
    case ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTION_TYPES.FETCH_TWEETS_START:
      return { ...state, twitterLoading: true, twitterError: null };
    case ACTION_TYPES.FETCH_TWEETS_SUCCESS:
      return {
        ...state,
        tweets: action.payload.tweets,
        twitterLoading: false,
        renderKey: state.renderKey + 1,
      };

    case ACTION_TYPES.FETCH_TWEETS_ERROR:
      return {
        ...state,
        twitterLoading: false,
        twitterError: action.payload.error,
      };

    case ACTION_TYPES.FETCH_CURSOR_START:
      return { ...state, cursorForumLoading: true, cursorForumError: null };

    case ACTION_TYPES.FETCH_CURSOR_SUCCESS:
      return {
        ...state,
        cursorForumPosts: action.payload.posts,
        cursorForumLoading: false,
        renderKey: state.renderKey + 1,
      };

    case ACTION_TYPES.FETCH_CURSOR_ERROR:
      return {
        ...state,
        cursorForumLoading: false,
        cursorForumError: action.payload.error,
      };

    case ACTION_TYPES.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload.term };

    case ACTION_TYPES.SET_TWITTER_QUERY:
      return { ...state, twitterQuery: action.payload.query };

    case ACTION_TYPES.SET_SELECTED_PLATFORM:
      return { ...state, selectedPlatform: action.payload.platform };

    case ACTION_TYPES.SET_SORT_BY:
      return { ...state, sortBy: action.payload.sortBy };

    case ACTION_TYPES.SET_TIME_FILTER:
      return { ...state, timeFilter: action.payload.timeFilter };

    case ACTION_TYPES.MARK_COMPLETED:
      return {
        ...state,
        completedItems: [...state.completedItems, action.payload.itemId],
      };

    case ACTION_TYPES.SET_VISIBLE_POSTS:
      return { ...state, visiblePosts: action.payload.count };

    case ACTION_TYPES.SET_CURRENT_POST_INDEX:
      return { ...state, currentPostIndex: action.payload.index };

    case ACTION_TYPES.SET_SELECTED_ITEM:
      return { ...state, selectedItem: action.payload.item };

    case ACTION_TYPES.SET_IS_DETAIL_OPEN:
      return { ...state, isDetailOpen: action.payload.isOpen };

    case ACTION_TYPES.SET_IS_TWITTER_DETAIL:
      return {
        ...state,
        isTwitterDetail: action.payload.isTwitter,
        isCursorForumDetail: false,
      };

    case ACTION_TYPES.SET_IS_CURSOR_FORUM_DETAIL:
      return {
        ...state,
        isCursorForumDetail: action.payload.isCursorForum,
        isTwitterDetail: false,
      };

    case ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN:
      return {
        ...state,
        showSubredditDropdown: action.payload.showSubredditDropdown,
      };

    case ACTION_TYPES.SET_SHOW_SORT_DROPDOWN:
      return { ...state, showSortDropdown: action.payload.showSortDropdown };

    case ACTION_TYPES.SET_SHOW_TIME_DROPDOWN:
      return { ...state, showTimeDropdown: action.payload.showTimeDropdown };

    case ACTION_TYPES.SET_SHOW_PLATFORM_DROPDOWN:
      return {
        ...state,
        showPlatformDropdown: action.payload.showPlatformDropdown,
      };

    case ACTION_TYPES.SET_RENDER_KEY:
      return { ...state, renderKey: action.payload.renderKey };

    case ACTION_TYPES.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload.activeTab };

    case ACTION_TYPES.SET_SELECTED_SUBREDDIT:
      return { ...state, selectedSubreddit: action.payload.selectedSubreddit };

    default:
      return state;
  }
}

// Add this function near other utility functions
const sortPostsByDate = (a, b) => {
  // Get timestamps for both posts
  const timestampA = getPostDate(a);
  const timestampB = getPostDate(b);

  // Sort in descending order (newest first)
  return timestampB - timestampA;
};

function App() {
  const [state, dispatch] = React.useReducer(dataReducer, initialState);
  const {
    posts,
    loading,
    error,
    searchTerm,
    selectedSubreddit,
    sortBy,
    timeFilter,
    dataSource,
    visiblePosts,
    currentPostIndex,
    renderKey,
    cursorForumPosts,
    completedItems,
    selectedPlatform,
    tweets,
    twitterLoading,
    showSubredditDropdown,
    showSortDropdown,
    showTimeDropdown,
    showPlatformDropdown,
    selectedItem,
    isTwitterDetail,
    isCursorForumDetail,
  } = state;

  // Use a ref to avoid re-creating fetchPosts on every render
  const fetchInProgress = useRef(false);
  const lastFetchEndTime = useRef(0); // Track when the last fetch operation completed

  // Refs para controlar estados e evitar loops
  const hasInitialFetchRun = useRef(false);
  const hasTweetFetchRun = useRef(false);
  const lastAutoRefreshTime = useRef(Date.now());

  // Refs para debounce e throttle
  const searchTimeout = useRef(null);

  // Função utilitária para fazer chamadas de API com axios
  const fetchData = async (endpoint) => {
    try {
      console.log(`Fetching data from: ${endpoint}`);
      const apiEndpoint = endpoint.startsWith("http")
        ? endpoint.replace(API_BASE_URL, "")
        : endpoint;

      const response = await api.get(apiEndpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      throw error;
    }
  };

  // Throttle refresh requests
  const lastRefreshTime = useRef(0);
  const MIN_REFRESH_INTERVAL = 30000; // 30 seconds
  const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

  // Ref para guardar resultado do sorting
  const currentItemsRef = useRef({
    lastItems: [],
    lastParams: {
      selectedPlatform: null,
      posts: [],
      tweets: [],
      sortBy: null,
      renderKey: -1,
    },
  });

  // Utility function to ensure fetches are spaced out
  const waitForFetchCooldown = async (minInterval = 500) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchEndTime.current;

    if (timeSinceLastFetch < minInterval) {
      const waitTime = minInterval - timeSinceLastFetch;
      console.log(
        `Waiting ${waitTime}ms before next fetch to avoid race conditions`
      );
      return new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    return Promise.resolve();
  };

  // Define sort options
  const sortOptions = [
    {
      value: "new",
      label: "Newest",
      description: "Show most recent posts first",
    },
    {
      value: "engagement",
      label: "Popular",
      description: "Sort by overall engagement (likes and comments)",
    },
    {
      value: "top",
      label: "Most Likes",
      description: "Show posts with the most likes first",
    },
  ];

  // Add missing state variables
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme-preference") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Toggle theme function
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    // Save preference to localStorage
    localStorage.setItem("theme-preference", newDarkMode ? "dark" : "light");

    // Apply theme to body for global styling
    document.body.classList.toggle("dark-theme", newDarkMode);
  };

  const [topicFilter, setTopicFilter] = useState("all");

  // For platform selection
  const [activePlatform, setActivePlatform] = useState("all");

  // Sort options constant
  const SORT_OPTIONS = [
    { value: "new", label: "Newest", icon: Clock },
    { value: "top", label: "Most Likes", icon: ThumbsUp },
    { value: "engagement", label: "Most Comments", icon: MessageSquare },
  ];

  // Function to toggle the sorting dropdown visibility
  const toggleSortDropdown = () => {
    dispatch({
      type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
      payload: { showSortDropdown: !showSortDropdown },
    });
  };

  // Main search function
  const handleSearch = (term) => {
    dispatch({ type: ACTION_TYPES.SET_SEARCH_TERM, payload: { term } });

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search
    searchTimeout.current = setTimeout(() => {
      // No need to call API again, just filter client-side
      console.log(`Searching for: ${term}`);
    }, 300);
  };

  // Handle search clear
  const handleSearchClear = () => {
    if (selectedPlatform === "twitter") {
      dispatch({
        type: ACTION_TYPES.SET_TWITTER_QUERY,
        payload: { query: "" },
      });
    } else {
      dispatch({ type: ACTION_TYPES.SET_SEARCH_TERM, payload: { term: "" } });
    }
  };

  // Handle search submission
  const handleSearchSubmit = (term) => {
    if (selectedPlatform === "twitter") {
      handleTwitterSearch(term);
    } else {
      handleSearch(term);
    }
  };

  // Handle navigation to previous post in Surf Mode
  const handlePrevPost = useCallback(() => {
    if (currentPostIndex > 0) {
      dispatch({
        type: ACTION_TYPES.SET_CURRENT_POST_INDEX,
        payload: { index: currentPostIndex - 1 },
      });
      // Scroll to the post
      const postElements = document.querySelectorAll(".post-card");
      if (postElements[currentPostIndex - 1]) {
        postElements[currentPostIndex - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentPostIndex]);

  // Load more posts handler
  const handleLoadMore = useCallback(() => {
    dispatch({
      type: ACTION_TYPES.SET_VISIBLE_POSTS,
      payload: { count: state.visiblePosts + 10 },
    });
  }, [dispatch, state.visiblePosts]);

  // Handle navigation to next post in Surf Mode
  const handleNextPost = useCallback(() => {
    if (currentPostIndex < posts.length - 1) {
      dispatch({
        type: ACTION_TYPES.SET_CURRENT_POST_INDEX,
        payload: { index: currentPostIndex + 1 },
      });
      // Scroll to the post
      const postElements = document.querySelectorAll(".post-card");
      if (postElements[currentPostIndex + 1]) {
        postElements[currentPostIndex + 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      // Load more posts if we're near the end of the list
      if (
        currentPostIndex + 1 >= posts.length - 3 &&
        posts.length < visiblePosts
      ) {
        handleLoadMore();
      }
    }
  }, [currentPostIndex, posts.length, visiblePosts, dispatch, handleLoadMore]);

  // Function to fetch Cursor Forum posts
  const fetchCursorForumPosts = useCallback(
    async (forceRefresh = false) => {
      // Skip if a fetch is already in progress, unless we're forcing a refresh
      if (fetchInProgress.current && !forceRefresh) {
        console.log(
          "Cursor Forum posts fetch skipped - another fetch is in progress"
        );
        return Promise.reject(new Error("Fetch already in progress"));
      }

      // Wait for any cooldown period
      await waitForFetchCooldown();

      // Set fetch in progress flag
      fetchInProgress.current = true;
      dispatch({ type: ACTION_TYPES.FETCH_CURSOR_START });

      try {
        // Use state from closure to avoid dependency issues
        const sortByState = state.sortBy;
        const searchTermState = state.searchTerm;

        // Map frontend sort values to backend
        const apiSortBy =
          sortByState === "top"
            ? "top"
            : sortByState === "engagement"
            ? "hot"
            : "new";

        console.log(
          `Fetching Cursor Forum posts with: sort=${apiSortBy}, search=${searchTermState}`
        );

        // Build API URL
        const endpoint = `${API_BASE_URL}/api/cursor-forum/topics?sort=${apiSortBy}&limit=20${
          forceRefresh ? "&refresh=true" : ""
        }${
          searchTermState
            ? `&search=${encodeURIComponent(searchTermState)}`
            : ""
        }`;

        console.log(`Fetching from: ${endpoint}`);

        const data = await fetchData(endpoint);
        console.log(
          `Received ${data.posts.length} Cursor Forum posts from API`
        );

        // Update state with received posts
        dispatch({
          type: ACTION_TYPES.FETCH_CURSOR_SUCCESS,
          payload: {
            posts: data.posts,
            fromCache: data.metadata?.from_cache || false,
          },
        });

        return data.posts; // Return posts for chaining
      } catch (error) {
        console.error("Error fetching Cursor Forum posts:", error);
        dispatch({
          type: ACTION_TYPES.FETCH_CURSOR_ERROR,
          payload: { error: error.message },
        });
        return Promise.reject(error);
      } finally {
        // Record the fetch end time
        lastFetchEndTime.current = Date.now();
        // Always clear the fetch in progress flag when done
        fetchInProgress.current = false;
      }
    },
    [dispatch, state.searchTerm, state.sortBy] // Add required dependencies
  );

  // Function to fetch tweets
  const fetchTweets = useCallback(
    async (forceRefresh = false) => {
      console.log("===== INICIANDO FETCH_TWEETS =====");
      console.log("Estado atual:", {
        tweets: state.tweets.length,
        twitterLoading: state.twitterLoading,
        fetchInProgress: fetchInProgress.current,
        forceRefresh,
      });

      // Skip if a fetch is already in progress, unless we're forcing a refresh
      if (fetchInProgress.current && !forceRefresh) {
        console.log("Twitter fetch skipped - another fetch is in progress");
        return Promise.reject(new Error("Fetch already in progress"));
      }

      // Wait for any cooldown period
      await waitForFetchCooldown();

      // Set fetch in progress flag
      fetchInProgress.current = true;
      dispatch({ type: ACTION_TYPES.FETCH_TWEETS_START });

      try {
        // Get state values from closure
        const twitterQueryState = state.twitterQuery;
        const sortByState = state.sortBy;

        // Map frontend sort values to backend
        const apiSortBy =
          sortByState === "top"
            ? "top"
            : sortByState === "engagement"
            ? "hot"
            : "new";

        // Use the correct endpoint with the proper parameter names
        const endpoint = `${API_BASE_URL}/api/tweets/search?query=${encodeURIComponent(
          twitterQueryState || "cursor editor"
        )}&sort=${apiSortBy}${forceRefresh ? "&refresh=true" : ""}`;

        console.log(`Fetching tweets from ${endpoint}`);

        const data = await fetchData(endpoint);
        console.log(`Received ${data.posts.length} tweets from API`);
        if (data.posts.length > 0) {
          console.log("Primeiro tweet:", data.posts[0]);
        }

        // Update state with received tweets using dispatch instead of state setter
        dispatch({
          type: ACTION_TYPES.FETCH_TWEETS_SUCCESS,
          payload: {
            tweets: data.posts,
          },
        });

        return data.posts; // Return tweets for chaining
      } catch (error) {
        console.error("Error fetching tweets:", error);
        dispatch({
          type: ACTION_TYPES.FETCH_TWEETS_ERROR,
          payload: {
            error: error.message,
          },
        });
        return Promise.reject(error);
      } finally {
        // Record the fetch end time
        lastFetchEndTime.current = Date.now();
        // Clear fetch in progress flag even on error
        fetchInProgress.current = false;
        console.log("===== FIM DO FETCH_TWEETS =====");
        console.log("Estado final:", {
          tweets: state.tweets.length,
          twitterLoading: state.twitterLoading,
        });
      }
    },
    [dispatch, state.twitterQuery, state.sortBy] // Remove unnecessary dependency
  );

  // Function to fetch Reddit posts
  const fetchPosts = useCallback(
    async (forceRefresh = false) => {
      // Skip if a fetch is already in progress, unless we're forcing a refresh
      if (fetchInProgress.current && !forceRefresh) {
        console.log(
          "Reddit posts fetch skipped - another fetch is in progress"
        );
        return Promise.reject(new Error("Fetch already in progress"));
      }

      // Wait for any cooldown period
      await waitForFetchCooldown();

      // Set fetch in progress flag
      fetchInProgress.current = true;
      dispatch({ type: ACTION_TYPES.FETCH_POSTS_START });

      try {
        // Use state from closure to avoid dependency issues
        const searchTermState = state.searchTerm;
        const sortByState = state.sortBy;
        const timeFilterState = state.timeFilter;

        // Map frontend sort values to backend API values
        const apiSortBy =
          sortByState === "top"
            ? "top"
            : sortByState === "engagement"
            ? "hot"
            : "new";

        console.log(
          `Fetching Reddit posts with: search=${searchTermState}, sort=${apiSortBy}, time=${timeFilterState}`
        );

        // Construct API URL with query parameters
        const endpoint = `${API_BASE_URL}/api/posts?${
          searchTermState
            ? `search=${encodeURIComponent(searchTermState)}&`
            : ""
        }sort=${apiSortBy}&t=${timeFilterState}${
          forceRefresh ? "&refresh=true" : ""
        }`;

        console.log(`Fetching from: ${endpoint}`);

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received ${data.posts.length} Reddit posts from API`);

        // Update state with received posts
        dispatch({
          type: ACTION_TYPES.FETCH_POSTS_SUCCESS,
          payload: {
            posts: data.posts,
            fromCache: data.metadata?.from_cache || false,
          },
        });

        return data.posts; // Return posts for chaining
      } catch (error) {
        console.error("Error fetching Reddit posts:", error);
        dispatch({
          type: ACTION_TYPES.FETCH_POSTS_ERROR,
          payload: { error: error.message },
        });
        return Promise.reject(error);
      } finally {
        // Record the fetch end time
        lastFetchEndTime.current = Date.now();
        // Always clear the fetch in progress flag when done
        fetchInProgress.current = false;
      }
    },
    [dispatch, state.searchTerm, state.sortBy, state.timeFilter] // Remove unnecessary dependency
  );

  // Set platform to Reddit only
  const selectRedditPlatform = useCallback(() => {
    dispatch({
      type: ACTION_TYPES.SET_SELECTED_PLATFORM,
      payload: { platform: "reddit" },
    });
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_TAB,
      payload: { activeTab: "all" },
    });
    if (tweets.length === 0) {
      fetchTweets(true);
    }
  }, [tweets.length, fetchTweets, dispatch]);

  // Set platform to Twitter only
  const selectTwitterPlatform = useCallback(() => {
    console.log("===== SELECIONANDO PLATAFORMA TWITTER =====");
    console.log("Estado antes da seleção:", {
      selectedPlatform: state.selectedPlatform,
      tweets: state.tweets.length,
      twitterLoading: state.twitterLoading,
    });

    dispatch({
      type: ACTION_TYPES.SET_SELECTED_PLATFORM,
      payload: { platform: "twitter" },
    });

    // Clear the search term "windsurf OR codeium" when X filter is applied
    if (searchTerm === "windsurf OR codeium") {
      dispatch({ type: ACTION_TYPES.SET_SEARCH_TERM, payload: { term: "" } });
    }

    // Reset current page and visible posts
    dispatch({
      type: ACTION_TYPES.SET_CURRENT_POST_INDEX,
      payload: { index: 0 },
    });
    dispatch({
      type: ACTION_TYPES.SET_VISIBLE_POSTS,
      payload: { count: DEFAULT_POST_LIMIT },
    });

    // Sempre buscar tweets ao selecionar a plataforma Twitter
    // Usando um pequeno delay para evitar problemas de concorrência
    setTimeout(() => {
      console.log("Iniciando busca de tweets para plataforma Twitter");
      fetchTweets(true);

      // Log para verificar estado após a mudança
      setTimeout(() => {
        console.log("===== APÓS SELECIONAR TWITTER =====");
        console.log("Novo estado:", {
          selectedPlatform: state.selectedPlatform,
          tweets: state.tweets.length,
        });
      }, 1500);
    }, 100);
  }, [searchTerm, dispatch, fetchTweets, state]);

  // Set platform to All (both Reddit and Twitter)
  const selectAllPlatforms = useCallback(() => {
    dispatch({
      type: ACTION_TYPES.SET_SELECTED_PLATFORM,
      payload: { platform: "all" },
    });
    dispatch({
      type: ACTION_TYPES.SET_ACTIVE_TAB,
      payload: { activeTab: "all" },
    });
    if (tweets.length === 0) {
      fetchTweets(true);
    }
    // If posts are empty, fetch them
    if (posts.length === 0) {
      fetchPosts(true);
    }
  }, [tweets.length, posts.length, fetchTweets, fetchPosts, dispatch]);

  // Fetch data on component mount
  useEffect(() => {
    // Skip if we've already done the initial fetch in this session
    if (hasInitialFetchRun.current) {
      console.log("Initial data fetch already ran once this session, skipping");
      return;
    }

    // Use a small timeout to ensure other effects have settled
    const timeoutId = setTimeout(() => {
      // Skip if a fetch is already in progress
      if (fetchInProgress.current) {
        console.log(
          "Initial data fetch skipped - another fetch is in progress"
        );
        return;
      }

      // Mark that we've run the initial fetch
      hasInitialFetchRun.current = true;

      // Set a specific flag to track this initial fetch sequence
      const initialFetchSequence = async () => {
        try {
          // Set fetch in progress flag
          fetchInProgress.current = true;
          console.log("Starting coordinated initial data fetch sequence");

          // Step 1: Fetch Reddit posts first
          try {
            console.log("Initial fetch sequence: Fetching Reddit posts");
            dispatch({ type: ACTION_TYPES.FETCH_POSTS_START });
            const postsEndpoint = `${API_BASE_URL}/api/posts?sort=new&t=week`;
            const postsResponse = await fetch(postsEndpoint);

            if (postsResponse.ok) {
              const postsData = await postsResponse.json();
              dispatch({
                type: ACTION_TYPES.FETCH_POSTS_SUCCESS,
                payload: {
                  posts: postsData.posts,
                  fromCache: postsData.metadata?.from_cache || false,
                },
              });
              console.log(`Loaded ${postsData.posts.length} Reddit posts`);
            } else {
              throw new Error(`HTTP Error ${postsResponse.status}`);
            }
          } catch (error) {
            console.error("Error loading initial Reddit posts:", error);
            dispatch({
              type: ACTION_TYPES.FETCH_POSTS_ERROR,
              payload: { error: error.message },
            });
          }

          // Wait before next fetch to prevent race conditions
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Step 2: Then fetch tweets after a delay
          try {
            console.log("Initial fetch sequence: Fetching Twitter posts");
            dispatch({ type: ACTION_TYPES.FETCH_TWEETS_START });
            const tweetsEndpoint = `${API_BASE_URL}/api/tweets/search?query=${encodeURIComponent(
              "cursor editor"
            )}&sort=new`;

            const tweetsResponse = await fetch(tweetsEndpoint);
            if (tweetsResponse.ok) {
              const tweetsData = await tweetsResponse.json();
              dispatch({
                type: ACTION_TYPES.FETCH_TWEETS_SUCCESS,
                payload: {
                  tweets: tweetsData.posts,
                },
              });
              console.log(`Loaded ${tweetsData.posts.length} Twitter posts`);
            } else {
              throw new Error(`HTTP Error ${tweetsResponse.status}`);
            }
          } catch (error) {
            console.error("Error loading initial Twitter posts:", error);
            dispatch({
              type: ACTION_TYPES.FETCH_TWEETS_ERROR,
              payload: { error: error.message },
            });
          }

          // Wait before next fetch to prevent race conditions
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Step 3: Finally fetch cursor forum posts
          try {
            console.log("Initial fetch sequence: Fetching Cursor forum posts");
            dispatch({ type: ACTION_TYPES.FETCH_CURSOR_START });
            const cursorEndpoint = `${API_BASE_URL}/api/cursor-forum/topics?sort=new&limit=20`;

            const cursorResponse = await fetch(cursorEndpoint);
            if (cursorResponse.ok) {
              const cursorData = await cursorResponse.json();
              dispatch({
                type: ACTION_TYPES.FETCH_CURSOR_SUCCESS,
                payload: {
                  posts: cursorData.posts,
                  fromCache: cursorData.metadata?.from_cache || false,
                },
              });
              console.log(
                `Loaded ${cursorData.posts.length} Cursor forum posts`
              );
            } else {
              throw new Error(`HTTP Error ${cursorResponse.status}`);
            }
          } catch (error) {
            console.error("Error loading initial Cursor forum posts:", error);
            dispatch({
              type: ACTION_TYPES.FETCH_CURSOR_ERROR,
              payload: { error: error.message },
            });
          }

          console.log("Initial data fetch sequence completed");
          // Record the fetch end time
          lastFetchEndTime.current = Date.now();
        } catch (error) {
          console.error("General error in initial data fetch sequence:", error);
        } finally {
          // Always clear the fetch in progress flag when done
          fetchInProgress.current = false;
        }
      };

      // Start the fetch sequence
      initialFetchSequence();
    }, 500);

    // Add listener for platform filter events
    const handleFilterByPlatform = (event) => {
      const { platform } = event.detail;
      console.log(`Filtering by platform: ${platform}`);

      if (platform === "reddit") {
        selectRedditPlatform();
      } else if (platform === "twitter") {
        selectTwitterPlatform();
      } else {
        selectAllPlatforms();
      }
    };

    window.addEventListener("filterByPlatform", handleFilterByPlatform);

    // Clean up when unmounting
    return () => {
      window.removeEventListener("filterByPlatform", handleFilterByPlatform);
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array to ensure this only runs once

  // Auto-refresh effect
  useEffect(() => {
    // Auto-refresh every 15 minutes
    const refreshTimer = setInterval(() => {
      // Get current time for time-based decisions
      const now = Date.now();

      // Skip if it's been less than the minimum time since last refresh
      // This helps prevent refresh loops
      if (now - lastAutoRefreshTime.current < REFRESH_INTERVAL * 0.9) {
        console.log("Auto-refresh skipped - minimum interval not elapsed");
        return;
      }

      // Skip refresh if another fetch is already in progress
      if (fetchInProgress.current) {
        console.log("Auto-refresh skipped - another fetch is in progress");
        return;
      }

      // Check if the user is active and the document is visible
      const isVisible = document.visibilityState === "visible";
      const timeSinceLastFetch = state.lastFetchTime
        ? Date.now() - new Date(state.lastFetchTime).getTime()
        : Infinity;

      const shouldRefresh = isVisible && timeSinceLastFetch > REFRESH_INTERVAL;

      console.log(
        `Auto-refresh check: isVisible=${isVisible}, timeSinceLastFetch=${Math.round(
          timeSinceLastFetch / 1000
        )}s`
      );

      if (shouldRefresh) {
        console.log("Running auto-refresh");

        // Update last refresh time
        lastAutoRefreshTime.current = now;

        // Execute fetches in sequence with proper spacing
        const refreshData = async () => {
          // Skip if a fetch is already in progress
          if (fetchInProgress.current) {
            console.log(
              "Auto-refresh aborted - another fetch started in the meantime"
            );
            return;
          }

          try {
            // Set fetch in progress flag
            fetchInProgress.current = true;

            // Step 1: Fetch Reddit posts
            console.log("Auto-refresh: Starting with Reddit posts");
            try {
              await fetchPosts(true);
              console.log("Auto-refresh: Reddit posts fetched successfully");
            } catch (error) {
              console.error(
                "Auto-refresh: Error fetching Reddit posts -",
                error
              );
            }

            // Step 2: Fetch Twitter posts after a short delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Check if we're still in auto-refresh mode or if another operation took over
            if (!fetchInProgress.current) {
              console.log(
                "Auto-refresh: Fetch flag cleared externally, stopping sequence"
              );
              return;
            }

            console.log("Auto-refresh: Next fetching Twitter posts");
            try {
              await fetchTweets(true);
              console.log("Auto-refresh: Twitter posts fetched successfully");
            } catch (error) {
              console.error(
                "Auto-refresh: Error fetching Twitter posts -",
                error
              );
            }

            // Step 3: Fetch Cursor Forum posts after another delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Check again if we can continue
            if (!fetchInProgress.current) {
              console.log(
                "Auto-refresh: Fetch flag cleared externally, stopping sequence"
              );
              return;
            }

            console.log("Auto-refresh: Finally fetching Cursor Forum posts");
            try {
              await fetchCursorForumPosts(true);
              console.log(
                "Auto-refresh: Cursor Forum posts fetched successfully"
              );
            } catch (error) {
              console.error(
                "Auto-refresh: Error fetching Cursor Forum posts -",
                error
              );
            }

            console.log("Auto-refresh: All data fetched successfully");

            // Update the last fetch end time
            lastFetchEndTime.current = Date.now();
          } finally {
            // Always clear the fetch in progress flag when done
            fetchInProgress.current = false;
          }
        };

        // Start the refresh sequence
        refreshData();
      } else {
        console.log("Skipping auto-refresh - conditions not met");
      }
    }, REFRESH_INTERVAL); // 15 minutes

    return () => clearInterval(refreshTimer);
  }, [fetchPosts, fetchTweets, fetchCursorForumPosts, state.lastFetchTime]); // Adicionar as dependências necessárias

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      console.log("Refresh throttled. Please wait before refreshing again.");
      return;
    }

    lastRefreshTime.current = now;
    dispatch({
      type: ACTION_TYPES.SET_RENDER_KEY,
      payload: { renderKey: renderKey + 1 },
    });
    fetchPosts(true);
    fetchTweets(true);
    fetchCursorForumPosts(true); // Agora essa chamada deve funcionar
  }, [fetchPosts, fetchTweets, fetchCursorForumPosts, renderKey, dispatch]);

  // Add competitor filter state
  const [competitorFilter, setCompetitorFilter] = useState({
    category: "all",
    competitor: null,
  });

  // Define competitor keywords for search (used to filter posts)
  const competitorKeywords = {
    // AI IDEs
    cursor: ["cursor ide", "cursor editor", "cursor ai", "cursor.so"],
    codeium: ["codeium", "codeium ai", "codeium extension", "codeium plugin"],
    copilot: ["github copilot", "copilot", "github co-pilot", "copilot ai"],
    tabnine: ["tabnine", "tab nine", "tabnine ai", "tabnine autocomplete"],
    kite: ["kite autocomplete", "kite ai", "kite code"],

    // Website Builders
    lovable: ["lovable", "lovable app", "lovable.ai", "lovable website"],
    webflow: ["webflow", "webflow builder", "webflow designer"],
    wix: ["wix", "wix website", "wix builder", "wix ai"],
    squarespace: ["squarespace", "square space"],
    framer: ["framer", "framer website", "framer builder"],

    // Code Assistants
    chatgpt: ["chatgpt", "chatgpt code", "openai", "gpt-4 code"],
    claude: ["claude ai", "anthropic claude", "claude code"],
    bard: ["google bard", "bard ai", "bard code"],
    llama: ["llama code", "meta llama", "llama 2", "code llama"],
  };

  // Apply competitor filtering to posts
  const applyCompetitorFilter = (posts, filter) => {
    if (
      !posts ||
      !Array.isArray(posts) ||
      !filter ||
      filter.category === "all"
    ) {
      return posts;
    }

    // If a specific competitor is selected, filter by its keywords
    if (filter.competitor) {
      const keywords = competitorKeywords[filter.competitor] || [];

      if (keywords.length > 0) {
        return posts.filter((post) => {
          // Check if post has text content to search
          const title = post.title || post.content || "";
          const content = post.selftext || post.content || "";
          const combinedText = `${title} ${content}`.toLowerCase();

          // Check if post contains any of the competitor's keywords
          return keywords.some((keyword) =>
            combinedText.includes(keyword.toLowerCase())
          );
        });
      }
      return posts;
    }

    // Otherwise, return all posts for all competitors in the selected category
    else {
      // Get all competitors in the selected category
      const categoryCompetitors = Object.keys(competitorKeywords).filter(
        (competitorId) => {
          // This is a simplified check. In a real app, you'd maintain a mapping of categories to competitors
          if (filter.category === "ai_ides") {
            return ["cursor", "codeium", "copilot", "tabnine", "kite"].includes(
              competitorId
            );
          } else if (filter.category === "website_builders") {
            return [
              "lovable",
              "webflow",
              "wix",
              "squarespace",
              "framer",
            ].includes(competitorId);
          } else if (filter.category === "code_assistants") {
            return ["chatgpt", "claude", "bard", "llama"].includes(
              competitorId
            );
          }
          return false;
        }
      );

      // Create a combined list of all keywords for all competitors in the category
      const allKeywords = categoryCompetitors.flatMap(
        (competitorId) => competitorKeywords[competitorId] || []
      );

      if (allKeywords.length > 0) {
        return posts.filter((post) => {
          // Check if post has text content to search
          const title = post.title || post.content || "";
          const content = post.selftext || post.content || "";
          const combinedText = `${title} ${content}`.toLowerCase();

          // Check if post contains any of the category's keywords
          return allKeywords.some((keyword) =>
            combinedText.includes(keyword.toLowerCase())
          );
        });
      }
      return posts;
    }
  };

  // Add state for classification filter
  const [classificationFilter, setClassificationFilter] = useState("all");

  // Classifications for filter bar
  const classifications = {
    bug_issue: "Bug/Issue",
    frustration: "Frustration",
    kudos: "Kudos",
    demo: "Demo",
    question: "Question",
    product_feedback: "Product Feedback",
  };

  // Handle classification filter change
  const handleClassificationFilterChange = (filter) => {
    setClassificationFilter(filter);
  };

  // Apply classification filter to posts
  const applyClassificationFilter = (posts, filter) => {
    if (!filter || filter === "all") {
      return posts; // Return all posts if no filter or filter is "all"
    }

    return posts.filter((post) => {
      // Check if post has the selected classification
      if (post.primary_classification) {
        return post.primary_classification === filter;
      }
      if (post.classifications && Array.isArray(post.classifications)) {
        return post.classifications.includes(filter);
      }
      return false;
    });
  };

  // Modify postsByTypeAndFilter to include classification filtering
  const postsByTypeAndFilter = useMemo(() => {
    // First, apply completed items filter to each source
    const filteredRedditPosts = state.posts.filter(
      (post) => !completedItems.includes(post.id)
    );
    const filteredTwitterPosts = state.tweets.filter(
      (tweet) => !completedItems.includes(tweet.id)
    );
    const filteredCursorPosts = state.cursorForumPosts.filter(
      (post) => !completedItems.includes(post.id)
    );

    // Now apply competitor filtering to each source
    const competitorFilteredRedditPosts = applyCompetitorFilter(
      filteredRedditPosts,
      competitorFilter
    );
    const competitorFilteredTwitterPosts = applyCompetitorFilter(
      filteredTwitterPosts,
      competitorFilter
    );
    const competitorFilteredCursorPosts = applyCompetitorFilter(
      filteredCursorPosts,
      competitorFilter
    );

    // Then apply classification filter
    const classificationFilteredRedditPosts = applyClassificationFilter(
      competitorFilteredRedditPosts,
      classificationFilter
    );
    const classificationFilteredTwitterPosts = applyClassificationFilter(
      competitorFilteredTwitterPosts,
      classificationFilter
    );
    const classificationFilteredCursorPosts = applyClassificationFilter(
      competitorFilteredCursorPosts,
      classificationFilter
    );

    // Return an object with all filtered sources
    return {
      reddit: classificationFilteredRedditPosts,
      twitter: classificationFilteredTwitterPosts,
      cursor: classificationFilteredCursorPosts,
      all: [
        ...classificationFilteredRedditPosts,
        ...classificationFilteredTwitterPosts,
        ...classificationFilteredCursorPosts,
      ].sort(sortPostsByDate),
    };
  }, [state, completedItems, competitorFilter, classificationFilter]);

  // Create a utility function for deep comparison of objects
  const deepEqual = (obj1, obj2) => {
    // If either is null, both should be null
    if (obj1 === null || obj2 === null) return obj1 === obj2;

    // If not objects, direct comparison
    if (typeof obj1 !== "object" || typeof obj2 !== "object") {
      return obj1 === obj2;
    }

    // Compare arrays by length and each element
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      return obj1.every((item, i) => deepEqual(item, obj2[i]));
    }

    // Compare object keys
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    return keys1.every(
      (key) => keys2.includes(key) && deepEqual(obj1[key], obj2[key])
    );
  };

  // Update currentItems to use the centralized sorting function with deep memoization
  const currentItems = useMemo(() => {
    // Create a params object that represents the inputs that affect our output
    const params = {
      selectedPlatform: state.selectedPlatform,
      posts: state.posts,
      tweets: state.tweets,
      sortBy: state.sortBy,
      renderKey: state.renderKey,
    };

    // Check if critical data has changed using deep comparison
    // Only look at IDs and timestamps - not entire objects
    const postsSignature = state.posts.map((p) => ({
      id: p.id,
      time: p.created_utc,
    }));
    const tweetsSignature = state.tweets.map((t) => ({
      id: t.id,
      time: t.created_at,
    }));

    const currentSignature = {
      selectedPlatform: state.selectedPlatform,
      postsSignature,
      tweetsSignature,
      sortBy: state.sortBy,
      renderKey: state.renderKey,
    };

    const lastSignature = {
      selectedPlatform: currentItemsRef.current.lastParams.selectedPlatform,
      postsSignature: currentItemsRef.current.lastParams.posts?.map((p) => ({
        id: p.id,
        time: p.created_utc,
      })),
      tweetsSignature: currentItemsRef.current.lastParams.tweets?.map((t) => ({
        id: t.id,
        time: t.created_at,
      })),
      sortBy: currentItemsRef.current.lastParams.sortBy,
      renderKey: currentItemsRef.current.lastParams.renderKey,
    };

    const hasChanged = !deepEqual(currentSignature, lastSignature);

    // If nothing has changed, return the previous result
    if (!hasChanged && currentItemsRef.current.lastItems.length > 0) {
      debugLog(
        "📊 Using cached currentItems - no significant changes detected"
      );
      return currentItemsRef.current.lastItems;
    }

    debugLog("📊 Recalculating currentItems due to changes", {
      platform: state.selectedPlatform,
      sortBy: state.sortBy,
      postsChanged: !deepEqual(
        currentSignature.postsSignature,
        lastSignature.postsSignature
      ),
      tweetsChanged: !deepEqual(
        currentSignature.tweetsSignature,
        lastSignature.tweetsSignature
      ),
    });

    // First we determine which filtered items to display
    const filteredPosts = state.posts.filter(
      (post) => !state.completedItems.includes(post.id)
    );
    const filteredTweets = state.tweets.filter(
      (tweet) => !state.completedItems.includes(tweet.id)
    );

    // Apply competitor filtering to filtered posts
    const competitorFilteredPosts = applyCompetitorFilter(
      filteredPosts,
      competitorFilter
    );
    const competitorFilteredTweets = applyCompetitorFilter(
      filteredTweets,
      competitorFilter
    );

    // Then check if we have data to process
    const hasRedditPosts = competitorFilteredPosts.length > 0;
    const hasTwitterPosts = competitorFilteredTweets.length > 0;

    console.log("===== VERIFICANDO POSTS DE TWITTER =====");
    console.log("Estado de items:", {
      tweets: tweets.length,
      filteredTweets: filteredTweets.length,
      competitorFilteredTweets: competitorFilteredTweets.length,
      hasTwitterPosts: hasTwitterPosts,
    });

    if (!hasRedditPosts && !hasTwitterPosts) {
      debugLog("No posts to display");
      currentItemsRef.current.lastItems = [];
      currentItemsRef.current.lastParams = params;
      return [];
    }

    // First determine which items to display based on selected platform
    let items = [];

    if (state.selectedPlatform === "reddit") {
      if (!hasRedditPosts) {
        currentItemsRef.current.lastItems = [];
        currentItemsRef.current.lastParams = params;
        return [];
      }
      items = [...competitorFilteredPosts]; // Create copy to avoid modifying original
    } else if (state.selectedPlatform === "twitter") {
      if (!hasTwitterPosts) {
        currentItemsRef.current.lastItems = [];
        currentItemsRef.current.lastParams = params;
        return [];
      }
      items = [...competitorFilteredTweets]; // Create copy to avoid modifying original
    } else {
      // Combine posts from both platforms
      items = [...competitorFilteredPosts, ...competitorFilteredTweets];
    }

    // Apply sorting only if there are items
    if (items.length === 0) {
      currentItemsRef.current.lastItems = [];
      currentItemsRef.current.lastParams = params;
      return [];
    }

    try {
      // Apply the centralized sorting function to the combined items
      const orderedItems = sortAllPosts(items, state.sortBy);

      // Store the result and parameters for future comparison
      currentItemsRef.current.lastItems = orderedItems;
      currentItemsRef.current.lastParams = params;

      return orderedItems;
    } catch (error) {
      console.error("Error sorting items:", error);

      // In case of error, return unsorted items
      currentItemsRef.current.lastItems = items;
      currentItemsRef.current.lastParams = params;
      return items; // Return items without sorting in case of error
    }
  }, [
    state.selectedPlatform,
    state.posts,
    state.tweets,
    state.sortBy,
    state.renderKey,
    state.completedItems,
  ]);

  // Handle twitter search
  const handleTwitterSearch = (term) => {
    dispatch({
      type: ACTION_TYPES.SET_TWITTER_QUERY,
      payload: { query: term },
    });
    fetchTweets(true);
  };

  // Handle opening detail view
  const handleViewDetails = (item, isTwitter = false) => {
    // Determine if the post is from Cursor Forum based on source property
    const isCursorForum = item.source === "cursor_forum";

    console.log("handleViewDetails called", { item, isTwitter, isCursorForum });

    // Update isTwitterDetail and isCursorForumDetail based on the source
    if (isCursorForum) {
      dispatch({
        type: ACTION_TYPES.SET_IS_CURSOR_FORUM_DETAIL,
        payload: { isCursorForum: true },
      });
    } else if (isTwitter) {
      dispatch({
        type: ACTION_TYPES.SET_IS_TWITTER_DETAIL,
        payload: { isTwitter: true },
      });
    } else {
      // Reset both flags for Reddit posts
      dispatch({
        type: ACTION_TYPES.SET_IS_TWITTER_DETAIL,
        payload: { isTwitter: false },
      });
      dispatch({
        type: ACTION_TYPES.SET_IS_CURSOR_FORUM_DETAIL,
        payload: { isCursorForum: false },
      });
    }

    // Set the selected item and open the detail view
    dispatch({
      type: ACTION_TYPES.SET_SELECTED_ITEM,
      payload: { item },
    });
    dispatch({
      type: ACTION_TYPES.SET_IS_DETAIL_OPEN,
      payload: { isOpen: true },
    });

    console.log("Modal should be open now", { isOpen: true, item });
  };

  // Handle closing detail view
  const handleCloseDetails = () => {
    dispatch({
      type: ACTION_TYPES.SET_IS_DETAIL_OPEN,
      payload: { isOpen: false },
    });
  };

  // Handle navigation to next item
  const handleNextItem = () => {
    const currentItems = isTwitterDetail ? tweets : postsByTypeAndFilter.reddit;
    const currentIndex = currentItems.findIndex(
      (item) => item.id === selectedItem.id
    );

    if (currentIndex > -1 && currentIndex < currentItems.length - 1) {
      dispatch({
        type: ACTION_TYPES.SET_SELECTED_ITEM,
        payload: { item: currentItems[currentIndex + 1] },
      });
    }
  };

  // Handle navigation to previous item
  const handlePrevItem = () => {
    const currentItems = isTwitterDetail ? tweets : postsByTypeAndFilter.reddit;
    const currentIndex = currentItems.findIndex(
      (item) => item.id === selectedItem.id
    );

    if (currentIndex > 0) {
      dispatch({
        type: ACTION_TYPES.SET_SELECTED_ITEM,
        payload: { item: currentItems[currentIndex - 1] },
      });
    }
  };

  // Enhanced dropdown toggle function
  const toggleDropdown = (dropdown) => {
    // Para garantir que apenas um dropdown esteja aberto por vez
    if (dropdown === "subreddit") {
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN,
        payload: { showSubredditDropdown: !showSubredditDropdown },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
        payload: { showSortDropdown: false },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_TIME_DROPDOWN,
        payload: { showTimeDropdown: false },
      });
    } else if (dropdown === "sort") {
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
        payload: { showSortDropdown: !showSortDropdown },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN,
        payload: { showSubredditDropdown: false },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_TIME_DROPDOWN,
        payload: { showTimeDropdown: false },
      });
    } else if (dropdown === "time") {
      dispatch({
        type: ACTION_TYPES.SET_SHOW_TIME_DROPDOWN,
        payload: { showTimeDropdown: !showTimeDropdown },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN,
        payload: { showSubredditDropdown: false },
      });
      dispatch({
        type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
        payload: { showSortDropdown: false },
      });
    } else if (dropdown === "platform") {
      dispatch({
        type: ACTION_TYPES.SET_SHOW_PLATFORM_DROPDOWN,
        payload: { showPlatformDropdown: !showPlatformDropdown },
      });
    }
  };

  // Handle subreddit change
  const handleSubredditChange = (value) => {
    dispatch({
      type: ACTION_TYPES.SET_SELECTED_SUBREDDIT,
      payload: { selectedSubreddit: value },
    });
    dispatch({
      type: ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN,
      payload: { showSubredditDropdown: false },
    });
    console.log(`Subreddit changed to: ${value}`);
    // Additional logic could be added here to fetch posts based on the subreddit
  };

  // Update the handleSortChange function to handle the simplified sorting options
  const handleSortChange = useCallback(
    (value) => {
      console.log(`Changing sort from ${sortBy} to ${value}`);

      // Prevent unnecessary operations if the value hasn't changed
      if (sortBy === value) {
        console.log("Sort value unchanged, skipping operations");
        dispatch({
          type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
          payload: { showSortDropdown: false },
        });
        return;
      }

      // Update sortBy early to avoid UI consistency issues
      dispatch({ type: ACTION_TYPES.SET_SORT_BY, payload: { sortBy: value } });

      // Only increment render key if we're doing local sorting
      const hasEnoughDataToSortLocally =
        (selectedPlatform === "reddit" && posts.length > 0) ||
        (selectedPlatform === "twitter" && tweets.length > 0) ||
        (selectedPlatform === "all" && (posts.length > 0 || tweets.length > 0));

      if (hasEnoughDataToSortLocally) {
        dispatch({
          type: ACTION_TYPES.SET_RENDER_KEY,
          payload: { renderKey: renderKey + 1 },
        });
      }

      // Reset to first page when sort changes
      dispatch({
        type: ACTION_TYPES.SET_CURRENT_POST_INDEX,
        payload: { index: 0 },
      });
      dispatch({
        type: ACTION_TYPES.SET_VISIBLE_POSTS,
        payload: { count: DEFAULT_POST_LIMIT },
      });

      // Set appropriate time filter for each sort type
      if (value === "new") {
        // For newest posts, default to last week
        dispatch({
          type: ACTION_TYPES.SET_TIME_FILTER,
          payload: { timeFilter: "week" },
        });
        console.log("Ordering by newest first");
      } else if (value === "engagement") {
        // For popular by engagement, prioritize recent posts (last 7 days)
        dispatch({
          type: ACTION_TYPES.SET_TIME_FILTER,
          payload: { timeFilter: "week" },
        });
        console.log("Ordering by engagement (popularity)");
      } else if (value === "top") {
        // For most likes, keep current time filter or set to all time
        if (!["day", "week", "month", "year", "all"].includes(timeFilter)) {
          dispatch({
            type: ACTION_TYPES.SET_TIME_FILTER,
            payload: { timeFilter: "all" },
          });
        }
        console.log("Ordering by number of likes/upvotes");
      }

      // Debug log
      console.log(`Sort changed to: ${value}, Time filter: ${timeFilter}`);

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

      dispatch({
        type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
        payload: { showSortDropdown: false },
      });
    },
    [
      sortBy,
      fetchPosts,
      fetchTweets,
      selectedPlatform,
      timeFilter,
      searchTerm,
      posts.length,
      tweets.length,
      renderKey,
      dispatch,
    ]
  );

  const handleTimeChange = (value) => {
    dispatch({
      type: ACTION_TYPES.SET_TIME_FILTER,
      payload: { timeFilter: value },
    });
    dispatch({
      type: ACTION_TYPES.SET_SHOW_TIME_DROPDOWN,
      payload: { showTimeDropdown: false },
    });
    console.log(`Time filter changed to: ${value}`);
    // Additional logic could be added here to filter by time
  };

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on a button that toggles the dropdown
      if (event.target.closest(".filter-button")) {
        return;
      }

      // Close if clicking outside the dropdown
      if (!event.target.closest(".filter-dropdown-menu")) {
        dispatch({
          type: ACTION_TYPES.SET_SHOW_SUBREDDIT_DROPDOWN,
          payload: { showSubredditDropdown: false },
        });
        dispatch({
          type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
          payload: { showSortDropdown: false },
        });
        dispatch({
          type: ACTION_TYPES.SET_SHOW_TIME_DROPDOWN,
          payload: { showTimeDropdown: false },
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add new functions to handle footer actions
  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Handle feedback
  const handleFeedback = () => {
    // Create a simple feedback form
    const feedbackDialog = document.createElement("div");
    feedbackDialog.className = "feedback-dialog";
    feedbackDialog.innerHTML = `
      <div class="feedback-dialog-content">
        <button class="feedback-close-btn">&times;</button>
        <h2>Give us your feedback</h2>
        <p>We'd love to hear about your experience with Community Surf</p>
        <textarea placeholder="Type your feedback here..." rows="5"></textarea>
        <div class="feedback-actions">
          <button class="feedback-cancel-btn">Cancel</button>
          <button class="feedback-submit-btn">Submit Feedback</button>
        </div>
      </div>
    `;

    document.body.appendChild(feedbackDialog);

    // Use try-catch to handle possible DOM errors
    const removeFeedbackDialog = () => {
      try {
        if (feedbackDialog && feedbackDialog.parentNode) {
          feedbackDialog.parentNode.removeChild(feedbackDialog);
        }
      } catch (err) {
        console.error("Error removing feedback dialog:", err);
        // As an alternative, hide the dialog
        if (feedbackDialog) {
          feedbackDialog.style.display = "none";
        }
      }
    };

    // Add event listeners
    feedbackDialog
      .querySelector(".feedback-close-btn")
      .addEventListener("click", removeFeedbackDialog);

    feedbackDialog
      .querySelector(".feedback-cancel-btn")
      .addEventListener("click", removeFeedbackDialog);

    feedbackDialog
      .querySelector(".feedback-submit-btn")
      .addEventListener("click", () => {
        const feedbackText = feedbackDialog.querySelector("textarea").value;
        if (feedbackText.trim()) {
          alert("Thank you for your feedback! We will review it shortly.");
          console.log("Feedback submitted:", feedbackText);
        } else {
          alert("Please enter some feedback before submitting.");
        }
        removeFeedbackDialog();
      });
  };

  useEffect(() => {
    // Apply theme from local storage
    const savedTheme = localStorage.getItem("theme-preference");
    if (savedTheme) {
      document.body.classList.toggle("dark-theme", savedTheme === "dark");
    }

    // Set default sort to 'new' explicitly
    dispatch({ type: ACTION_TYPES.SET_SORT_BY, payload: { sortBy: "new" } });
    dispatch({
      type: ACTION_TYPES.SET_TIME_FILTER,
      payload: { timeFilter: "week" },
    });

    // Initial fetch for newest posts
    fetchPosts(false);
    // Also fetch initial Twitter posts and Cursor forum posts
    fetchTweets(false);
    fetchCursorForumPosts(false);

    // Set up interval to refresh data - adjust as needed
    const interval = setInterval(() => {
      // Background refresh all data sources
      fetchPosts(false);
      fetchTweets(false);
      fetchCursorForumPosts(false);
    }, 5 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".sort-dropdown")) {
        dispatch({
          type: ACTION_TYPES.SET_SHOW_SORT_DROPDOWN,
          payload: { showSortDropdown: false },
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debug log current state when tweets or posts update
  useEffect(() => {
    console.log(`[Debug] Tweets updated. Current count: ${tweets.length}`);
  }, [tweets]);

  useEffect(() => {
    console.log(`[Debug] Posts updated. Current count: ${posts.length}`);
  }, [posts]);

  // New function to handle marking items as completed
  const handleMarkCompleted = useCallback((itemId) => {
    if (!itemId) return;

    // Add item to completed list
    dispatch({ type: ACTION_TYPES.MARK_COMPLETED, payload: { itemId } });

    // Close the detail view
    dispatch({
      type: ACTION_TYPES.SET_IS_DETAIL_OPEN,
      payload: { isOpen: false },
    });
    dispatch({ type: ACTION_TYPES.SET_SELECTED_ITEM, payload: { item: null } });

    console.log(`Marked item ${itemId} as completed`);
  }, []);

  // Ensure tweets are loaded on initial render regardless of platform
  useEffect(() => {
    // Skip if we've already done the tweet fetch in this session
    if (hasTweetFetchRun.current) {
      console.log(
        "Initial tweet loading already ran once this session, skipping"
      );
      return;
    }

    // Only fetch tweets if they're empty, not already loading, and no fetch is in progress
    if (tweets.length === 0 && !twitterLoading && !fetchInProgress.current) {
      console.log("Initial tweet loading because tweets array is empty");

      // Mark that we've run this effect
      hasTweetFetchRun.current = true;

      // Set a longer timeout to ensure the main fetch effect has completed
      const timeoutId = setTimeout(async () => {
        // Check again before starting the fetch to avoid race conditions
        if (
          tweets.length === 0 &&
          !twitterLoading &&
          !fetchInProgress.current
        ) {
          try {
            // Use our existing function to handle the fetch
            await fetchTweets(true);
          } catch (error) {
            console.error("Error in initial tweet load effect:", error);
            // Error handling already done in fetchTweets
          }
        } else {
          console.log("Skipping tweet fetch - conditions changed");
        }
      }, 3000); // Use an even longer timeout (3 seconds) to avoid race conditions

      return () => clearTimeout(timeoutId);
    }
  }, [tweets.length, twitterLoading, fetchTweets]); // Add necessary dependencies

  // Combine all posts for display based on selected platform
  const allPosts = useMemo(() => {
    let combinedPosts = [];

    if (selectedPlatform === "all" || selectedPlatform === "reddit") {
      combinedPosts = [...combinedPosts, ...posts];
    }

    if (selectedPlatform === "all" || selectedPlatform === "twitter") {
      combinedPosts = [...combinedPosts, ...tweets];
    }

    if (selectedPlatform === "all" || selectedPlatform === "cursor") {
      combinedPosts = [...combinedPosts, ...cursorForumPosts];
    }

    // Apply competitor filtering
    combinedPosts = applyCompetitorFilter(combinedPosts, competitorFilter);

    // Sort the combined posts
    return sortAllPosts(combinedPosts, sortBy);
  }, [
    posts,
    tweets,
    cursorForumPosts,
    selectedPlatform,
    sortBy,
    competitorFilter,
    applyCompetitorFilter,
  ]);

  // Add visibility change event listener to avoid unnecessary processing when tab is hidden
  useEffect(() => {
    // Track if the page is visible
    const isPageVisible = () => document.visibilityState === "visible";
    let wasVisible = isPageVisible();

    // Handler for visibility changes
    const handleVisibilityChange = () => {
      const visible = isPageVisible();

      // If the page became visible and was previously hidden
      if (visible && !wasVisible) {
        debugLog("Page became visible - checking for refresh");

        // Check if we need to refresh data after becoming visible
        const timeSinceLastFetch = state.lastFetchTime
          ? Date.now() - new Date(state.lastFetchTime).getTime()
          : Infinity;

        // If it's been more than 1 minute, refresh data
        if (timeSinceLastFetch > 60 * 1000) {
          debugLog("Page visibility change triggered refresh");

          // Refresh with a slight delay to avoid immediate load
          setTimeout(() => {
            fetchPosts(true);
            fetchTweets(true);
            fetchCursorForumPosts(true);
          }, 1000);
        }
      }

      wasVisible = visible;
    };

    // Add event listener for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchPosts, fetchTweets, fetchCursorForumPosts, state.lastFetchTime]);

  // Safety effect to reset fetchInProgress if component is unmounted while fetching
  useEffect(() => {
    // Reset on mount to ensure clean state
    fetchInProgress.current = false;

    // Safety cleanup on unmount
    return () => {
      fetchInProgress.current = false;
    };
  }, []);

  // Function to handle platform selection in the navigation bar
  const handlePlatformSelection = (platform) => {
    console.log(`Selecting platform: ${platform}`);
    console.log("Current state:", {
      selectedPlatform: state.selectedPlatform,
      tweets: state.tweets.length,
      posts: state.posts.length,
      cursorForumPosts: state.cursorForumPosts.length,
    });

    if (platform === "reddit") {
      selectRedditPlatform();
    } else if (platform === "twitter") {
      selectTwitterPlatform();
      // Ensure tweets are loaded when the Twitter platform is selected
      if (tweets.length === 0) {
        console.log("Starting fetchTweets because tweets.length === 0");
        fetchTweets(true).then(() => {
          console.log("fetchTweets completed, new state:", {
            selectedPlatform: state.selectedPlatform,
            tweets: state.tweets.length,
          });
        });
      } else {
        console.log(
          "No need to call fetchTweets, we already have",
          tweets.length,
          "tweets"
        );
      }
    } else if (platform === "cursor") {
      // If there is no specific function for Cursor Forum, we can update the platform directly
      dispatch({
        type: ACTION_TYPES.SET_SELECTED_PLATFORM,
        payload: { platform: "cursor" },
      });
      // Ensure forum posts are loaded when the Cursor platform is selected
      if (cursorForumPosts.length === 0) {
        fetchCursorForumPosts(true);
      }
    } else {
      selectAllPlatforms();
    }
  };

  // Competitor categories and subcategories
  const competitorCategories = {
    all: "All Categories",
    ai_ides: "AI IDEs",
    code_assistants: "Code Assistants",
    website_builders: "Website Builders",
  };

  const competitorSubcategories = {
    ai_ides: ["cursor", "windsurf", "codeium_ide", "codestral"],
    code_assistants: ["copilot", "codeium", "tabnine", "codestral_assistant"],
    website_builders: ["wix", "webflow", "framer", "bubble"],
  };

  const competitorCategoryColors = {
    ai_ides: "#2196F3", // Blue
    code_assistants: "#4CAF50", // Green
    website_builders: "#FF9800", // Orange
  };

  // For dashboard view
  const [isDashboard, setIsDashboard] = useState(false);

  // Competitor filter handler
  const handleCompetitorCategoryChange = (category) => {
    setCompetitorFilter((prev) => ({
      ...prev,
      category: category,
      competitor: category === "all" ? null : prev.competitor,
    }));
  };

  // Competitor filter change handler (both category and specific competitor)
  const handleCompetitorFilterChange = (category, competitor = null) => {
    setCompetitorFilter({
      category: category,
      competitor: competitor,
    });
  };

  // Render function to display the main app UI
  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>
      <ModalFix />
      <div className="app-container">
        <Navbar
          selectedPlatform={activePlatform}
          onPlatformChange={handlePlatformSelection}
          searchTerm={state.searchTerm}
          onSearchChange={handleSearch}
          onSearchClear={() => {
            dispatch({
              type: ACTION_TYPES.SET_SEARCH_TERM,
              payload: { searchTerm: "" },
            });
          }}
          onSearch={handleTwitterSearch}
          sortBy={state.sortBy}
          sortOptions={SORT_OPTIONS}
          onSortChange={handleSortChange}
          darkMode={darkMode}
          onThemeToggle={toggleTheme}
          topicFilter={topicFilter}
          onTopicFilterChange={setTopicFilter}
          categoryFilter={competitorFilter.category}
          categoryOptions={competitorCategories}
          onCategoryFilterChange={handleCompetitorCategoryChange}
          categoryColors={competitorCategoryColors}
          classifications={classifications}
          activeClassificationFilter={classificationFilter}
          onClassificationFilterChange={handleClassificationFilterChange}
        />

        <main className="content-area">
          <div className="left-sidebar">
            {/* FilterBar has been moved to the Navbar */}
            {isDashboard && (
              <NestedFilterPanel
                categories={competitorCategories}
                subcategories={competitorSubcategories}
                activeCategory={competitorFilter.category}
                activeSubcategory={competitorFilter.competitor}
                onFilterChange={handleCompetitorFilterChange}
              />
            )}
          </div>

          <div className="main-content">
            {/* Display error message if any error occurred */}
            {(state.error || state.twitterError || state.cursorForumError) && (
              <ErrorMessage
                message={
                  state.error || state.twitterError || state.cursorForumError
                }
                onClose={() => dispatch({ type: ACTION_TYPES.CLEAR_ERROR })}
              />
            )}

            {/* Main content area - posts */}
            <div className="posts-grid posts-masonry">
              {state.loading ||
              state.twitterLoading ||
              state.cursorForumLoading ? (
                /* Loading skeletons */
                Array(4)
                  .fill()
                  .map((_, index) => (
                    <div key={index} className="post-card skeleton">
                      <div className="skeleton-badge"></div>
                      <div className="skeleton-title"></div>
                      <div className="skeleton-date"></div>
                      <div className="skeleton-image"></div>
                      <div className="skeleton-footer"></div>
                    </div>
                  ))
              ) : (
                /* Post content - will automatically use filtered posts from postsByTypeAndFilter */
                <>
                  {postsByTypeAndFilter.all.length === 0 ? (
                    <div className="no-results">
                      <Search size={48} className="search-icon-large" />
                      <h3 className="no-results-title">No results found</h3>
                      <p className="no-results-message">
                        Try adjusting your filters or search for different
                        terms.
                      </p>
                    </div>
                  ) : (
                    postsByTypeAndFilter.all
                      .slice(0, state.visiblePosts)
                      .map((post) => {
                        if (post.source === "twitter") {
                          return (
                            <TwitterCard
                              key={`twitter-${post.id}`}
                              tweet={post}
                              onViewDetails={(item) =>
                                handleViewDetails(item, true)
                              }
                            />
                          );
                        } else if (post.source === "cursor_forum") {
                          return (
                            <CursorForumCard
                              key={`cursor-${post.id}`}
                              post={post}
                              onViewDetails={handleViewDetails}
                            />
                          );
                        } else {
                          return (
                            <PostCard
                              key={`reddit-${post.id}`}
                              post={post}
                              onViewDetails={(item) =>
                                handleViewDetails(item, false)
                              }
                            />
                          );
                        }
                      })
                  )}
                </>
              )}
            </div>

            {/* Load more button */}
            {!state.loading &&
              !state.twitterLoading &&
              !state.cursorForumLoading &&
              postsByTypeAndFilter.all.length > state.visiblePosts && (
                <div className="load-more-container">
                  <button
                    className="load-more-button"
                    onClick={() => {
                      dispatch({
                        type: ACTION_TYPES.SET_VISIBLE_POSTS,
                        payload: {
                          count: state.visiblePosts + DEFAULT_POST_LIMIT,
                        },
                      });
                    }}
                  >
                    Load More
                  </button>
                </div>
              )}
          </div>
        </main>
      </div>

      {/* Detail view overlay */}
      {state.isDetailOpen && state.selectedItem && (
        <CardDetail
          item={state.selectedItem}
          isOpen={state.isDetailOpen}
          isTwitter={state.isTwitterDetail}
          isCursorForum={state.isCursorForumDetail}
          onClose={() => {
            dispatch({
              type: ACTION_TYPES.SET_IS_DETAIL_OPEN,
              payload: { isOpen: false },
            });
            dispatch({
              type: ACTION_TYPES.SET_SELECTED_ITEM,
              payload: { item: null },
            });
          }}
          onNext={handleNextItem}
          onPrev={handlePrevItem}
          onMarkCompleted={handleMarkCompleted}
        />
      )}
    </div>
  );
}

export default App;
