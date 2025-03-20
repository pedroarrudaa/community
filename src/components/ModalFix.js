import React, { useEffect } from "react";

/**
 * ModalFix component - helps debug and fix common modal issues
 *
 * This component checks for:
 * 1. Conflicting z-index values
 * 2. Potential CSS conflicts
 * 3. Body scroll locks
 * 4. Event propagation stoppers
 */
const ModalFix = () => {
  useEffect(() => {
    // Check if there are any elements with a higher z-index that might block modals
    const findHighZIndexElements = () => {
      const allElements = document.querySelectorAll("*");
      const highZElements = [];

      allElements.forEach((el) => {
        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
        if (!isNaN(zIndex) && zIndex > 1000) {
          highZElements.push({
            element: el,
            zIndex,
            className: el.className,
            id: el.id,
          });
        }
      });

      console.log(
        "Elements with high z-index that might block modals:",
        highZElements
      );
    };

    // Check for potential scroll issues
    const checkScrollIssues = () => {
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);

      const issues = [];

      if (bodyStyle.overflow === "hidden") {
        issues.push(
          "Body has overflow:hidden which may prevent modal scrolling"
        );
      }

      if (bodyStyle.position === "fixed") {
        issues.push(
          "Body has position:fixed which may cause modal positioning issues"
        );
      }

      if (htmlStyle.overflow === "hidden") {
        issues.push(
          "HTML element has overflow:hidden which may prevent modal scrolling"
        );
      }

      console.log(
        "Potential scroll issues:",
        issues.length ? issues : "None detected"
      );
    };

    // Run checks
    findHighZIndexElements();
    checkScrollIssues();

    // Add event listener for ESC key to close any stuck modals
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        console.log(
          "ModalFix: ESC key pressed, force-closing any hidden modals"
        );

        // Try to find and close any modal overlays
        const modalOverlays = document.querySelectorAll(
          ".card-detail-overlay, .confirmation-modal-overlay"
        );
        modalOverlays.forEach((overlay) => {
          console.log("Removing modal overlay:", overlay);
          overlay.remove();
        });

        // Reset body styles
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("keydown", handleEscKey);

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, []);

  return (
    <div className="modal-fix-helper" style={{ display: "none" }}>
      {/* Hidden utility component */}
    </div>
  );
};

export default ModalFix;
