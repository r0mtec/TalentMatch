import { useEffect } from "react";
import { Button } from "./Button.jsx";

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Закрыть">×</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, text, confirmText = "Удалить", cancelText = "Отмена", loading = false, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-text">{text}</p>
      <div className="modal-actions">
        <Button variant="secondary" disabled={loading} onClick={onCancel}>{cancelText}</Button>
        <Button variant="danger" icon="bi-trash3" disabled={loading} onClick={onConfirm}>{loading ? "Удаляем..." : confirmText}</Button>
      </div>
    </Modal>
  );
}
