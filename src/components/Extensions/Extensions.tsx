import React from "react";
import { ExtensionData } from "../../types/types";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import "./Extensions.module.scss";

interface ExtensionsProps {
  extensions: ExtensionData[];
  enabledExtensions: string[];
  onToggleExtension: (extensionId: string) => void;
}

export const Extensions: React.FC<ExtensionsProps> = ({
  extensions,
  enabledExtensions,
  onToggleExtension,
}) => {
  const { target, setTarget } = useAssessmentTarget();

  const handleToggle = (extId: string) => {
    const isEnabled = enabledExtensions.includes(extId);
    if (isEnabled) {
      // Disabling extension: ensure it's not selected as context
      if (target.kind === "extension" && target.id === extId) {
        setTarget({ kind: "original" });
      }
      onToggleExtension(extId);
    } else {
      // Enabling extension: enable and immediately put into context
      onToggleExtension(extId);
      setTarget({ kind: "extension", id: extId });
    }
  };

  return (
    <div className="pkimm-extensions-tab">
      <h2>Extensions</h2>
      <p className="description">
        Select which extensions are enabled. Enabled extensions can be selected
        in the header context switcher.
      </p>
      <div className="extensions-list">
        {extensions.map((ext) => {
          const id = ext.extension.id;
          const isEnabled = enabledExtensions.includes(id);
          return (
            <div
              key={id}
              className={`extension-row ${isEnabled ? "enabled" : ""}`}
            >
              <div className="extension-info">
                <div className="extension-name-row">
                  <h3>{ext.extension.name}</h3>
                  {ext.extension.version && (
                    <span className="extension-version">
                      v{ext.extension.version}
                    </span>
                  )}
                </div>
                <p className="extension-desc">{ext.extension.description}</p>
                {ext.extension.documentation && (
                  <div className="extension-documentation">
                    <a
                      href={ext.extension.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="documentation-link"
                    >
                      Documentation
                    </a>
                  </div>
                )}
              </div>
              <div className="extension-actions">
                <label
                  className="pkimm-toggle-switch"
                  aria-label={`Toggle ${ext.extension.name}`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(id)}
                  />
                  <span className="pkimm-slider"></span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
