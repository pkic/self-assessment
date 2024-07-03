import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import "./ShareModal.module.scss";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000); // Reset the icon back after 2 seconds
  };

  return (
    <div className="pkimm-modal-overlay">
      <div className="pkimm-modal-content">
        <button className="pkimm-modal-close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <h2>Share Progress</h2>
        <p>Copy the URL below to share your progress:</p>
        <div className="pkimm-url-container">
          <input type="text" value={url} readOnly />
          <button onClick={handleCopy} className="pkimm-copy-button">
            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
