import React from "react";
import { ExtensionData } from "../../types/types";
import "./Extensions.module.scss";

interface ExtensionsProps {
  extensions: ExtensionData[];
  enabledExtensions: string[];
  onToggle: (extensionId: string) => void;
}

export const Extensions: React.FC<ExtensionsProps> = ({
  extensions,
  enabledExtensions,
  onToggle,
}) => {
  return (
    <div className="pkimm-extensions">
      <h3>PKI MM Extensions</h3>
      <p>Enable or disable extensions to include them in your assessment.</p>
      <div className="pkimm-extensions-list">
        {extensions.map((ext) => (
          <div key={ext.extension.id} className="pkimm-extension-item">
            <div className="pkimm-extension-info">
              <h4>{ext.extension.name} <span className="version">v{ext.extension.version}</span></h4>
              <p>{ext.extension.description}</p>
            </div>
            <div className="pkimm-extension-toggle">
              <label className="pkimm-toggle-switch">
                <input
                  type="checkbox"
                  checked={enabledExtensions.includes(ext.extension.id)}
                  onChange={() => onToggle(ext.extension.id)}
                />
                <span className="pkimm-slider"></span>
              </label>
              <span>{enabledExtensions.includes(ext.extension.id) ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        ))}
        {extensions.length === 0 && <p>No extensions loaded.</p>}
      </div>
    </div>
  );
};
