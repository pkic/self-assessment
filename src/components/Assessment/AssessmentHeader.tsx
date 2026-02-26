import React, { useState, useRef, useEffect } from 'react';
import { useAssessmentTarget } from '../../contexts/AssessmentTargetContext';
import "./Assessment.module.scss";

export const AssessmentHeader: React.FC = () => {
  const { target, setTarget, availableExtensions, enabledExtensions, getCurrentTargetName } = useAssessmentTarget();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const name = getCurrentTargetName();
  const isExtension = target.kind === 'extension';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enabledExts = availableExtensions.filter(ext => enabledExtensions.includes(ext.extension.id));

  return (
    <div className="pkimm-target-dropdown-container" ref={dropdownRef}>
      <div 
        className={`pkimm-target-badge ${isExtension ? 'extension' : ''} interactive`}
        onClick={() => setIsOpen(!isOpen)}
        title="Quick switch assessment target"
      >
        <span className="target-dot"></span>
        <span className="assessing-label">Assessing: </span>{name}
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="pkimm-target-dropdown-menu">
          <div 
            className={`dropdown-item ${target.kind === 'original' ? 'active' : ''}`}
            onClick={() => {
              setTarget({ kind: 'original' });
              setIsOpen(false);
            }}
          >
            Original PKI Maturity Model
          </div>
          {enabledExts.map((ext) => (
            <div 
              key={ext.extension.id}
              className={`dropdown-item ${target.kind === 'extension' && target.id === ext.extension.id ? 'active' : ''}`}
              onClick={() => {
                setTarget({ kind: 'extension', id: ext.extension.id });
                setIsOpen(false);
              }}
            >
              {ext.extension.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
