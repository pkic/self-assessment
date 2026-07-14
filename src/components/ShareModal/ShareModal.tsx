import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../ui";
import "./ShareModal.module.scss";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

// QR codes encode up to ~2.9 KB at the densest version. Compact URLs from
// this widget are well under that, but a host that chains many extensions
// could push past — render text-only fallback instead of failing.
const QR_URL_LIMIT = 2900;

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const qrSupported = url.length <= QR_URL_LIMIT;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      titleId="pkimm-share-modal-title"
      className="pkimm-share-modal"
    >
      <button
        type="button"
        className="pkimm-share-modal__close"
        onClick={onClose}
        aria-label="Close share dialog"
      >
        <FontAwesomeIcon icon={faTimes} aria-hidden="true" />
      </button>
      <h2 id="pkimm-share-modal-title">Share assessment</h2>
      <p>
        Copy the URL or scan the QR code to open this assessment on another
        device.
      </p>
      <p className="pkimm-share-modal__note">
        Notes and evidence are not included in links — download the YAML
        assessment file for the complete assessment.
      </p>
      <div className="pkimm-share-modal__body">
        {qrSupported ? (
          <div
            className="pkimm-share-modal__qr"
            role="img"
            aria-label="QR code linking to this assessment"
          >
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              marginSize={2}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            <span className="pkimm-share-modal__qr-caption">Scan to open</span>
          </div>
        ) : (
          <div className="pkimm-share-modal__qr-fallback">
            <p>
              URL is too long to encode as a QR code — copy and paste it
              instead.
            </p>
          </div>
        )}
        <div className="pkimm-share-modal__link">
          <label
            htmlFor="pkimm-share-modal-url"
            className="pkimm-share-modal__link-label"
          >
            Assessment URL
          </label>
          <div className="pkimm-url-container">
            <input
              id="pkimm-share-modal-url"
              type="text"
              value={url}
              readOnly
            />
            <button
              onClick={handleCopy}
              className="pkimm-copy-button"
              title={isCopied ? "Copied" : "Copy URL"}
              aria-label={isCopied ? "Copied" : "Copy URL"}
            >
              <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
