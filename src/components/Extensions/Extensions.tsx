import React, { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faTrash,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import { ExtensionData } from "../../types/types";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";
import { Toggle, Button, IconButton, Banner } from "../ui";
import { useHelp } from "../Help/HelpProvider";
import "./Extensions.module.scss";

interface ExtensionsProps {
  extensions: ExtensionData[];
  enabledExtensions: string[];
  incompatibleExtensionIds?: Set<string>;
  onToggleExtension: (extensionId: string) => void;
  onUploadExtension: (file: File) => void;
  onRemoveExtension: (id: string) => void;
  uploadError?: string;
}

export const Extensions: React.FC<ExtensionsProps> = ({
  extensions,
  enabledExtensions,
  incompatibleExtensionIds,
  onToggleExtension,
  onUploadExtension,
  onRemoveExtension,
  uploadError,
}) => {
  const { target, setTarget } = useAssessmentTarget();
  const { openHelp } = useHelp();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRemove = (id: string) => {
    if (!window.confirm(`Remove the "${id}" extension from this browser?`)) {
      return;
    }
    // Only drop the active-target selection once removal is confirmed, so a
    // cancelled prompt leaves the current extension view untouched.
    if (target.kind === "extension" && target.id === id) {
      setTarget({ kind: "original" });
    }
    onRemoveExtension(id);
  };

  return (
    <div className="pkimm-extensions-tab">
      <h2>Extensions</h2>
      <p className="pkimm-extensions-tab__intro">
        Assess your PKI through an added lens. Extensions are uploaded here and
        stored only in this browser.
      </p>
      <p className="description">
        Select which extensions are enabled. Enabled extensions can be selected
        in the header context switcher.
      </p>
      <div className="pkimm-extensions-tab__upload-row">
        <Button
          variant="secondary"
          leftIcon={<FontAwesomeIcon icon={faUpload} aria-hidden="true" />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload extension
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadExtension(file);
              e.target.value = "";
            }
          }}
        />
        <IconButton
          label="Help with extensions"
          size="sm"
          variant="ghost"
          onClick={() => openHelp(undefined)}
        >
          <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
        </IconButton>
      </div>
      {uploadError && (
        <Banner
          tone="danger"
          title={uploadError}
          className="pkimm-extensions-tab__error"
        />
      )}
      {extensions.length === 0 && (
        <p className="pkimm-extensions-tab__empty">
          No extensions yet. Upload a <code>.yaml</code> extension to add one.
        </p>
      )}
      <div className="extensions-list">
        {extensions.map((ext) => {
          const id = ext.extension.id;
          const isEnabled = enabledExtensions.includes(id);
          const isIncompatible = incompatibleExtensionIds?.has(id) ?? false;
          return (
            <div
              key={id}
              className={`extension-row ${isEnabled ? "enabled" : ""} ${
                isIncompatible ? "incompatible" : ""
              }`}
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
                {isIncompatible && (
                  <span
                    className="extension-incompatible-tag"
                    title="Not compatible with the loaded PKIMM model version"
                  >
                    incompatible
                  </span>
                )}
                <span
                  title={
                    isIncompatible
                      ? "Not compatible with the loaded PKIMM model version"
                      : undefined
                  }
                >
                  <Toggle
                    checked={isEnabled}
                    disabled={isIncompatible}
                    label={ext.extension.name}
                    onChange={() => handleToggle(id)}
                  />
                </span>
                <IconButton
                  label={`Remove ${ext.extension.name}`}
                  variant="danger"
                  onClick={() => handleRemove(id)}
                >
                  <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
