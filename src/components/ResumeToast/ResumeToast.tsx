import React, { useEffect } from "react";
import "./ResumeToast.module.scss";

interface Props {
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

// Transient, dismissible notice shown after restoring lastPosition on load.
// Auto-dismisses after autoDismissMs (default 6s) but the user can also
// close it early — either way onDismiss just clears the parent's state.
export const ResumeToast: React.FC<Props> = ({
  message,
  onDismiss,
  autoDismissMs = 6000,
}) => {
  useEffect(() => {
    const handle = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(handle);
    // Deliberately keyed on autoDismissMs only: onDismiss is recreated every
    // render, and this project's eslint config does not enforce
    // react-hooks/exhaustive-deps.
  }, [autoDismissMs]);

  return (
    <div className="pkimm-resume-toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button
        type="button"
        className="pkimm-resume-toast__dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
};
