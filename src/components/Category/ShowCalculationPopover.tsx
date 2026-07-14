import React from "react";
import type { EffectiveCalcExplanation } from "../../utils/effectiveLevel";
import { Modal, Button } from "../ui";
import "./Category.module.scss";

export interface ShowCalculationPopoverProps {
  explanation: EffectiveCalcExplanation;
  onClose: () => void;
}

/** Focus-trapped `role="dialog"` explaining the effective-category-level
 *  arithmetic. Escape closes and restores focus to whatever had focus
 *  before the popover opened (typically the "Show calculation" button). */
export const ShowCalculationPopover: React.FC<ShowCalculationPopoverProps> = ({
  explanation,
  onClose,
}) => {
  const { rows, weightSum, weightedSum, raw, display, source } = explanation;
  const isDerived = source !== "requirements";

  return (
    <Modal open onClose={onClose} titleId="pkimm-calc-popover-title">
      <div className="pkimm-calc-popover">
        <div className="pkimm-calc-popover__header">
          <strong id="pkimm-calc-popover-title">Show calculation</strong>
          <Button
            variant="ghost"
            className="pkimm-calc-popover__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {isDerived ? (
          <p className="pkimm-calc-popover__derived">
            This category&apos;s level is not derived from requirement ratings.
          </p>
        ) : (
          <>
            <table className="pkimm-calc-popover__table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Level</th>
                  <th>Effective weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.description}</td>
                    <td>{row.level}</td>
                    <td>
                      {row.effectiveWeight}
                      {row.effectiveWeight !== row.baseWeight && (
                        <span className="pkimm-calc-popover__adj"> (adj.)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pkimm-calc-popover__formula">
              <div className="pkimm-calc-popover__formula-raw">
                {weightedSum} ÷ {weightSum} → raw {raw.toFixed(2)}
              </div>
              <div className="pkimm-calc-popover__formula-display">
                floor({raw.toFixed(2)}) = {display}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
