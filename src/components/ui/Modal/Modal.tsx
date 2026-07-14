import React, { useEffect, useRef } from "react";
import "./Modal.module.scss";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  dismissable?: boolean;
  title?: string;
  titleId?: string;
  describedById?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  placement?: "center" | "right";
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  dismissable = true,
  title,
  titleId,
  describedById,
  children,
  initialFocusRef,
  placement = "center",
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (initialFocusRef?.current ?? focusable?.[0] ?? dialog)?.focus();

    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (dismissable !== false) onClose?.();
      return;
    }
    if (e.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`pkimm-modal-overlay${
        placement === "right" ? " pkimm-modal-overlay--right" : ""
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissable !== false) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`pkimm-modal${placement === "right" ? " pkimm-modal--right" : ""}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {title != null && (
          <h2 id={titleId} className="pkimm-modal__title">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
