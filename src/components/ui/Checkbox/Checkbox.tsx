import React, { useEffect, useImperativeHandle, useRef } from "react";
import "./Checkbox.module.scss";

interface CheckboxBase {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
}
export type CheckboxProps = CheckboxBase &
  (
    | { label: string; labelledBy?: never }
    | { label?: never; labelledBy: string }
  );

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, indeterminate, onChange, disabled, label, labelledBy }, ref) => {
    const inner = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inner.current as HTMLInputElement, []);
    useEffect(() => {
      if (inner.current) inner.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return (
      <input
        ref={inner}
        type="checkbox"
        className="pkimm-checkbox"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";
