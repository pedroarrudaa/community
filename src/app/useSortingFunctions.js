import { useCallback } from "react";

/**
 * Hook that provides sorting functions for posts and tweets
 *
 * @returns {object} Sorting functions
 */
export function useSortingFunctions() {
  /**
   * Normalize date from a post or tweet
   *
   * @param {object} item Post or tweet object
   * @returns {Date} Normalized date object
   */
  const normalizePostDate = useCallback((item) => {
    let timestamp = 0;

    // Reddit uses created_utc (seconds since epoch)
    if (item && item.created_utc !== undefined) {
      timestamp = item.created_utc * 1000; // Convert to milliseconds
    }
    // Twitter uses created_at (seconds since epoch)
    else if (item && item.created_at !== undefined) {
      timestamp = item.created_at * 1000; // Convert to milliseconds
    }
    // For any other platform or format
    else if (item && item.timestamp !== undefined) {
      timestamp = typeof item.timestamp === "number" ? item.timestamp : 0;
    }

    return new Date(timestamp);
  }, []);

  /**
   * Sort posts by date (newest first)
   *
   * @param {Array} items Items to sort
   * @returns {Array} Sorted items
   */
  const sortByNewest = useCallback((items) => {
    return [...items].sort((a, b) => {
      try {
        const dateA = normalizePostDate(a);
        const dateB = normalizePostDate(b);

        const timeA =
          dateA instanceof Date && !isNaN(dateA) ? dateA.getTime() : 0;
        const timeB =
          dateB instanceof Date && !isNaN(dateB) ? dateB.getTime() : 0;

        return timeB - timeA; // Newest first
      } catch (err) {
        console.error("Error sorting by date:", err);
        return 0; // Keep original order in case of error
      }
    });
  }, []);

  /**
   * Sort posts by likes/score (highest first)
   *
   * @param {Array} items Items to sort
   * @returns {Array} Sorted items
   */
  const sortByTop = useCallback((items) => {
    return [...items].sort((a, b) => {
      try {
        // Normalize score calculation across platforms
        const scoreA =
          a && a.score !== undefined ? a.score : a && a.likes ? a.likes : 0;
        const scoreB =
          b && b.score !== undefined ? b.score : b && b.likes ? b.likes : 0;

        // If scores are equal, use date as tiebreaker
        if (scoreB === scoreA) {
          const dateA = normalizePostDate(a);
          const dateB = normalizePostDate(b);

          const timeA =
            dateA instanceof Date && !isNaN(dateA) ? dateA.getTime() : 0;
          const timeB =
            dateB instanceof Date && !isNaN(dateB) ? dateB.getTime() : 0;

          return timeB - timeA; // Newest first as tiebreaker
        }

        return scoreB - scoreA; // Highest score first
      } catch (err) {
        console.error("Error sorting by score:", err);
        return 0; // Keep original order in case of error
      }
    });
  }, []);

  /**
   * Sort posts by engagement (custom algorithm)
   *
   * @param {Array} items Items to sort
   * @returns {Array} Sorted items
   */
  const sortByEngagement = useCallback((items) => {
    // First, organize by time buckets, then by engagement
    const now = new Date();

    // Group by time ranges: last 24h, last 3 days, last week, older
    const buckets = {
      day: [],
      threeDays: [],
      week: [],
      older: [],
    };

    [...items].forEach((item) => {
      try {
        const itemDate = normalizePostDate(item);
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
        console.error("Error categorizing post by time:", err);
        buckets.older.push(item); // Put in older bucket in case of error
      }
    });

    // Function to sort by engagement within each time range
    const sortBucketByEngagement = (items) => {
      return [...items].sort((a, b) => {
        try {
          // Calculate normalized engagement score that works for both platforms
          const engagementA =
            (a && a.score !== undefined
              ? a.score
              : a && a.likes
              ? a.likes
              : 0) +
            (a && a.num_comments !== undefined
              ? a.num_comments * 2
              : a && a.replies
              ? a.replies * 2
              : 0) +
            (a && a.retweets ? a.retweets * 1.5 : 0);

          const engagementB =
            (b && b.score !== undefined
              ? b.score
              : b && b.likes
              ? b.likes
              : 0) +
            (b && b.num_comments !== undefined
              ? b.num_comments * 2
              : b && b.replies
              ? b.replies * 2
              : 0) +
            (b && b.retweets ? b.retweets * 1.5 : 0);

          // If engagement scores are equal, use date as tiebreaker
          if (engagementB === engagementA) {
            const dateA = normalizePostDate(a);
            const dateB = normalizePostDate(b);

            const timeA =
              dateA instanceof Date && !isNaN(dateA) ? dateA.getTime() : 0;
            const timeB =
              dateB instanceof Date && !isNaN(dateB) ? dateB.getTime() : 0;

            return timeB - timeA; // Newest first as tiebreaker
          }

          return engagementB - engagementA; // Highest engagement first
        } catch (err) {
          console.error("Error sorting by engagement:", err);
          return 0; // Keep original order in case of error
        }
      });
    };

    // Sort each bucket by engagement and combine results
    return [
      ...sortBucketByEngagement(buckets.day),
      ...sortBucketByEngagement(buckets.threeDays),
      ...sortBucketByEngagement(buckets.week),
      ...sortBucketByEngagement(buckets.older),
    ];
  }, []);

  /**
   * Main function to sort posts based on provided sort type
   *
   * @param {Array} items Items to sort
   * @param {string} sortType Sort method to use ('new', 'top', 'engagement')
   * @returns {Array} Sorted items
   */
  const sortAllPosts = useCallback(
    (items, sortType) => {
      console.log(`Applying sort: ${sortType} for ${items.length} items`);

      if (!items || items.length === 0) {
        console.log("No posts to sort");
        return [];
      }

      try {
        if (sortType === "new") {
          return sortByNewest(items);
        } else if (sortType === "top") {
          return sortByTop(items);
        } else if (sortType === "engagement") {
          return sortByEngagement(items);
        }

        // Default to sorting by newest if sort type is unknown
        return sortByNewest(items);
      } catch (error) {
        console.error("Error in sortAllPosts:", error);
        return items; // Return original items in case of critical error
      }
    },
    [sortByNewest, sortByTop, sortByEngagement]
  );

  return {
    normalizePostDate,
    sortByNewest,
    sortByTop,
    sortByEngagement,
    sortAllPosts,
  };
}

export default useSortingFunctions;
