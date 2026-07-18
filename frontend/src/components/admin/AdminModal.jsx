const AdminModal = ({ title, children, onClose }) => (
  <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section
      className="admin-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="admin-modal-header">
        <h2>{title}</h2>
        <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close form">×</button>
      </div>
      {children}
    </section>
  </div>
);

export default AdminModal;
