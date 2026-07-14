import React from "react";
import { Modal } from "../../ui";
import "./ReportGeneratingModal.module.scss";

export interface ReportGeneratingModalProps {
  /** Whether the modal is visible. Renders `null` when `false`. */
  open: boolean;
}

/** Non-dismissable, focus-trapped `role="dialog"` shown while a PDF report is
 *  being generated. Unlike `ImportCollisionModal`, there is no cancelable
 *  action here — `pdf().toBlob()` can't be aborted — so there is no close
 *  button and Escape is a no-op. */
export const ReportGeneratingModal: React.FC<ReportGeneratingModalProps> = ({
  open,
}) => (
  <Modal
    open={open}
    dismissable={false}
    titleId="pkimm-report-generating-status"
  >
    <div className="pkimm-report-generating">
      <div className="pkimm-report-generating__spinner" aria-hidden="true" />
      <p id="pkimm-report-generating-status" aria-live="polite">
        Generating report…
      </p>
    </div>
  </Modal>
);
