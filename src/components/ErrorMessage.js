import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import "./ErrorMessage.css";

/**
 * ErrorMessage component for displaying API errors with retry and dismiss options
 *
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {function} props.retry - Function to retry the action that caused the error
 * @param {function} props.clear - Function to clear the error
 */
const ErrorMessage = ({ message, retry, clear }) => {
  return (
    <div className="error-message-container">
      <div className="error-message">
        <div className="error-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="error-content">
          <p>{message}</p>
          <div className="error-actions">
            {retry && (
              <button className="retry-button" onClick={retry}>
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
            {clear && (
              <button className="dismiss-button" onClick={clear}>
                <X size={16} />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
