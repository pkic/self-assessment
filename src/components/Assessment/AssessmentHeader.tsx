import React, { useState, useRef, useEffect } from "react";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import "./Assessment.module.scss";

export const AssessmentHeader: React.FC = () => {
  const {
    target,
    setTarget,
    availableExtensions,
    enabledExtensions,
    getCurrentTargetName,
  } = useAssessmentTarget();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const name = getCurrentTargetName();
  const isExtension = target.kind === "extension";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const enabledExts = availableExtensions.filter((ext) =>
    enabledExtensions.includes(ext.extension.id),
  );

  return (
    <div className="pkimm-target-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`pkimm-target-badge ${isExtension ? "extension" : ""} interactive`}
        onClick={() => setIsOpen(!isOpen)}
        title="Quick switch assessment target"
      >
        <span className="target-dot"></span>
        <span className="assessing-label">Assessing: </span>
        {name}
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="pkimm-target-dropdown-menu">
          <button
            type="button"
            className={`dropdown-item ${target.kind === "original" ? "active" : ""}`}
            onClick={() => {
              setTarget({ kind: "original" });
              setIsOpen(false);
            }}
          >
            Original PKI Maturity Model
          </button>
          {enabledExts.map((ext) => (
            <button
              type="button"
              key={ext.extension.id}
              className={`dropdown-item ${target.kind === "extension" && target.id === ext.extension.id ? "active" : ""}`}
              onClick={() => {
                setTarget({ kind: "extension", id: ext.extension.id });
                setIsOpen(false);
              }}
            >
              {ext.extension.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
