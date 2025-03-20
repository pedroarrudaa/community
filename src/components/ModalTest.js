import React, { useState } from "react";
import CardDetail from "./CardDetail";

const ModalTest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  const openModal = () => {
    console.log("Opening modal...");
    setIsOpen(true);
  };

  const closeModal = () => {
    console.log("Closing modal...");
    setIsOpen(false);
  };

  // Sample post for testing CardDetail
  const samplePost = {
    id: "test-123",
    title: "Test Post for Modal",
    author: "testuser",
    content: "This is a test post content to verify modal functionality.",
    created_at: new Date().toISOString(),
    source: "cursor_forum",
    classifications: ["bug_report", "feature_suggestion"],
    primary_classification: "bug_report",
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Modal Test</h2>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={openModal}
          style={{
            padding: "10px 20px",
            background: "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Open Test Modal
        </button>

        <button
          onClick={() => setIsCardDetailOpen(true)}
          style={{
            padding: "10px 20px",
            background: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test CardDetail Modal
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
              color: "#333",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Test Modal Content</h3>
            <p>
              This is a test modal to verify that modals can appear correctly.
            </p>
            <button
              onClick={closeModal}
              style={{
                padding: "8px 16px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Close Modal
            </button>
          </div>
        </div>
      )}

      {/* Test CardDetail Component */}
      {isCardDetailOpen && (
        <CardDetail
          item={samplePost}
          isOpen={isCardDetailOpen}
          isCursorForum={true}
          onClose={() => setIsCardDetailOpen(false)}
        />
      )}
    </div>
  );
};

export default ModalTest;
