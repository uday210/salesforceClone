"use client";
import { Icon } from "@/lib/icons";

export default function Modal({
  title, children, onClose, footer, wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 900 } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon ml-auto" onClick={onClose} aria-label="Close">
            <Icon name="X" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
