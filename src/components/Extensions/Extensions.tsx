import React from "react";
import { ExtensionData } from "../../types/types";
import { useAssessmentTarget } from "../../contexts/AssessmentTargetContext";

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
      if (target.kind === 'extension' && target.id === extId) {
        setTarget({ kind: 'original' });
      }
      onToggleExtension(extId);
    } else {
      // Enabling extension: enable and immediately put into context
      onToggleExtension(extId);
      setTarget({ kind: 'extension', id: extId });
    }
  };

  return (
    <div className="pkimm-extensions-tab" style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
      <h2>Extensions</h2>
      <p>Select which extensions are enabled. Enabled extensions can be selected in the header context switcher.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {extensions.map((ext) => {
          const id = ext.extension.id;
          const isEnabled = enabledExtensions.includes(id);
          return (
            <div key={id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{ext.extension.name}</h3>
                <label className="pkimm-toggle-switch">
                  <input type="checkbox" checked={isEnabled} onChange={() => handleToggle(id)} />
                  <span className="pkimm-slider"></span>
                </label>
              </div>
              {ext.extension.version && (
                <p style={{ margin: '0.25rem 0', color: '#666' }}>Version: {ext.extension.version}</p>
              )}
              <p style={{ marginTop: '0.5rem' }}>{ext.extension.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
