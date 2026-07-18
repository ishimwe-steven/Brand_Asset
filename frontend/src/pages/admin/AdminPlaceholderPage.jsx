const AdminPlaceholderPage = ({
  title,
  description,
}) => {
  return (
    <section className="admin-page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="admin-page-card">
        <h2>{title}</h2>

        <p>
          This page is ready to be connected to its backend API.
        </p>
      </div>
    </section>
  );
};

export default AdminPlaceholderPage;