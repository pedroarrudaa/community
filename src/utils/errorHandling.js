/**
 * Error handling utilities for the Community Surf application
 */

/**
 * Format an API error into a user-friendly message
 *
 * @param {Error|Object} error - The error to format
 * @param {string} defaultMessage - Default message to show if error can't be parsed
 * @returns {string} Formatted error message
 */
export const formatApiError = (
  error,
  defaultMessage = "An error occurred while fetching data"
) => {
  // Check if it's an axios error with a response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Handle common HTTP status codes
    if (status === 404) {
      return "The requested resource was not found";
    } else if (status === 401) {
      return "Authentication required. Please check your credentials";
    } else if (status === 403) {
      return "You don't have permission to access this resource";
    } else if (status === 429) {
      return "Too many requests. Please try again later";
    } else if (status >= 500) {
      return "Server error. Please try again later";
    }

    // Try to extract message from response data
    if (data && typeof data === "object") {
      if (data.message) return data.message;
      if (data.error)
        return typeof data.error === "string"
          ? data.error
          : "Server error occurred";
    }

    return `API error: ${status}`;
  }

  // Handle network errors
  if (error.request && !error.response) {
    return "Network error. Please check your connection";
  }

  // Handle other errors
  return error.message || defaultMessage;
};

/**
 * Log an error to the console with additional context
 *
 * @param {Error|Object} error - The error to log
 * @param {string} context - Additional context about where the error occurred
 */
export const logError = (error, context = "") => {
  // Only log full error details in development
  if (process.env.NODE_ENV === "development") {
    console.error(`Error ${context ? `in ${context}` : ""}:`, error);

    // If it's an API error, log additional details
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error(
        "Request was made but no response received:",
        error.request
      );
    }
  } else {
    // In production, log minimal error information
    console.error(
      `Error ${context ? `in ${context}` : ""}:`,
      error.message || error
    );
  }
};

/**
 * Handle an API error by formatting and logging it
 *
 * @param {Error|Object} error - The error to handle
 * @param {string} context - Additional context about where the error occurred
 * @param {string} defaultMessage - Default message to show if error can't be parsed
 * @returns {string} Formatted error message suitable for display
 */
export const handleApiError = (
  error,
  context = "",
  defaultMessage = "An error occurred"
) => {
  logError(error, context);
  return formatApiError(error, defaultMessage);
};
