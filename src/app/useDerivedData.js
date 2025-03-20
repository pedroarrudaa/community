import { useMemo } from "react";

/**
 * Hook that provides derived data from application state
 *
 * @param {object} appState Current application state
 * @param {Array} posts List of Reddit posts
 * @param {Array} tweets List of Twitter posts
 * @param {string} searchTerm Current search term
 * @param {string} selectedPlatform Selected platform (all, reddit, twitter)
 * @param {Array} completedItems IDs of items marked as completed
 * @param {string} sortBy Current sort method
 * @returns {object} Derived data including filtered posts
 */
export function useDerivedData(
  appState,
  posts,
  tweets,
  searchTerm,
  selectedPlatform,
  completedItems,
  sortBy
) {
  // Filter out completed items from posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => !completedItems.includes(post.id));
  }, [posts, completedItems]);

  // Filter out completed items from tweets
  const filteredTweets = useMemo(() => {
    return tweets.filter((tweet) => !completedItems.includes(tweet.id));
  }, [tweets, completedItems]);

  // Apply search filter to posts if search term exists
  const filteredPostsWithSearch = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return filteredPosts;
    }

    const lowercaseSearchTerm = searchTerm.toLowerCase();

    return filteredPosts.filter((post) => {
      const title = post.title ? post.title.toLowerCase() : "";
      const content = post.content ? post.content.toLowerCase() : "";
      const subreddit = post.subreddit ? post.subreddit.toLowerCase() : "";

      return (
        title.includes(lowercaseSearchTerm) ||
        content.includes(lowercaseSearchTerm) ||
        subreddit.includes(lowercaseSearchTerm)
      );
    });
  }, [filteredPosts, searchTerm]);

  // Apply search filter to tweets if search term exists
  const filteredTweetsWithSearch = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return filteredTweets;
    }

    const lowercaseSearchTerm = searchTerm.toLowerCase();

    return filteredTweets.filter((tweet) => {
      const content = tweet.content ? tweet.content.toLowerCase() : "";
      const author = tweet.author ? tweet.author.toLowerCase() : "";

      return (
        content.includes(lowercaseSearchTerm) ||
        author.includes(lowercaseSearchTerm)
      );
    });
  }, [filteredTweets, searchTerm]);

  // Get displayable items based on platform selection
  const displayItems = useMemo(() => {
    if (selectedPlatform === "reddit") {
      return filteredPostsWithSearch;
    } else if (selectedPlatform === "twitter") {
      return filteredTweetsWithSearch;
    } else {
      // For 'all' platform, combine and sort
      return [...filteredPostsWithSearch, ...filteredTweetsWithSearch];
    }
  }, [selectedPlatform, filteredPostsWithSearch, filteredTweetsWithSearch]);

  return {
    filteredPosts,
    filteredTweets,
    filteredPostsWithSearch,
    filteredTweetsWithSearch,
    displayItems,
  };
}

export default useDerivedData;
