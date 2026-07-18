import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";

import {
  createRegulationSet,
  deleteRegulationSet,
  getRegulationSets,
  updateRegulationSetStatus,
} from "../../services/regulationSet.service";

import { getMarkets } from "../../services/market.service";
import { getCategories } from "../../services/category.service";

import "./RegulationSets.css";

const initialForm = {
  market_id: "",
  category_id: "",
  title: "",
  version: "",
  authority: "",
  effective_date: "",
  description: "",
  document: null,
};

const RegulationSets = () => {
  const [regulationSets, setRegulationSets] =
    useState([]);

  const [markets, setMarkets] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // ======================================
  // LOAD PAGE DATA
  // ======================================
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        regulationResponse,
        marketsResponse,
        categoriesResponse,
      ] = await Promise.all([
        getRegulationSets(),
        getMarkets(),
        getCategories(),
      ]);

      const regulationData =
        regulationResponse?.data ||
        regulationResponse ||
        [];

      const marketData =
        marketsResponse?.data ||
        marketsResponse ||
        [];

      const categoryData =
        categoriesResponse?.data ||
        categoriesResponse ||
        [];

      setRegulationSets(
        Array.isArray(regulationData)
          ? regulationData
          : regulationData.regulation_sets || []
      );

      setMarkets(
        Array.isArray(marketData)
          ? marketData
          : marketData.markets || []
      );

      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : categoryData.categories || []
      );
    } catch (err) {
      console.error(
        "Failed to load regulation sets:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load regulation sets."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ======================================
  // FORM CHANGE
  // ======================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setForm((previous) => ({
        ...previous,
        document: null,
      }));

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Only PDF, DOC and DOCX documents are allowed."
      );

      e.target.value = "";
      return;
    }

    setError("");

    setForm((previous) => ({
      ...previous,
      document: file,
    }));
  };

  // ======================================
  // CREATE REGULATION SET
  // ======================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.document) {
      setError(
        "Please select an official regulation document."
      );

      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("market_id", form.market_id);
      formData.append(
        "category_id",
        form.category_id
      );
      formData.append("title", form.title);
      formData.append("version", form.version);
      formData.append(
        "authority",
        form.authority
      );
      formData.append(
        "effective_date",
        form.effective_date
      );
      formData.append(
        "description",
        form.description
      );
      formData.append("document", form.document);

      const response =
        await createRegulationSet(formData);

      setSuccess(
        response?.message ||
          "Regulation document uploaded successfully. AI extraction has started."
      );

      setForm(initialForm);
      setShowForm(false);

      const fileInput =
        document.getElementById(
          "regulation-document"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadData();
    } catch (err) {
      console.error(
        "Failed to create regulation set:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          "Failed to upload regulation document."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRegulationSets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return regulationSets;
    return regulationSets.filter((item) => [item.title, item.authority, item.market_name, item.market?.name, item.category_name, item.category?.name, item.version, item.status].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [regulationSets, search]);

  // ======================================
  // UPDATE STATUS
  // ======================================
  const handleStatusChange = async (
    id,
    currentStatus
  ) => {
    const newStatus =
      currentStatus === "active"
        ? "inactive"
        : "active";

    try {
      setError("");
      setSuccess("");

      const response =
        await updateRegulationSetStatus(
          id,
          newStatus
        );

      setSuccess(
        response?.message ||
          `Regulation set changed to ${newStatus}.`
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update regulation status."
      );
    }
  };

  // ======================================
  // DELETE
  // ======================================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this regulation set?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response =
        await deleteRegulationSet(id);

      setSuccess(
        response?.message ||
          "Regulation set deleted successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete regulation set."
      );
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "processing":
        return "AI Processing";

      case "active":
        return "Active";

      case "inactive":
        return "Inactive";

      case "processing_failed":
        return "Processing Failed";

      default:
        return status || "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="regulation-loading">
        Loading regulation sets...
      </div>
    );
  }

  return (
    <section className="regulation-sets-page">
      <div className="regulation-page-heading">
        <div>
          <h1>Regulation Sets</h1>

          <p>
            Upload official regulation documents for
            specific destination markets and product
            categories.
          </p>
        </div>
      </div>

      {error && (
        <div className="regulation-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="regulation-message success">
          {success}
        </div>
      )}

      {showForm && <AdminModal title="Upload Regulation Document" onClose={() => setShowForm(false)}><div className="regulation-form-card regulation-modal-card">
        <div className="regulation-card-heading">
          <h2>Upload Regulation Document</h2>

          <p>
            AI will automatically extract the
            requirements and make them available for
            packaging verification.
          </p>
        </div>

        <form
          className="regulation-form"
          onSubmit={handleSubmit}
        >
          <div className="regulation-form-grid">
            <div className="regulation-form-group">
              <label htmlFor="market_id">
                Destination Market
              </label>

              <select
                id="market_id"
                name="market_id"
                value={form.market_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select market
                </option>

                {markets.map((market) => (
                  <option
                    key={market.id}
                    value={market.id}
                  >
                    {market.market_name ||
                      market.name ||
                      market.country_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="regulation-form-group">
              <label htmlFor="category_id">
                Product Category
              </label>

              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select category
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.category_name ||
                      category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="regulation-form-group">
              <label htmlFor="title">
                Regulation Title
              </label>

              <input
                id="title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Rwanda Coffee Packaging Rules"
                required
              />
            </div>

            <div className="regulation-form-group">
              <label htmlFor="version">
                Version
              </label>

              <input
                id="version"
                type="text"
                name="version"
                value={form.version}
                onChange={handleChange}
                placeholder="Example: 2026.1"
              />
            </div>

            <div className="regulation-form-group">
              <label htmlFor="authority">
                Source / Authority
              </label>

              <input
                id="authority"
                type="text"
                name="authority"
                value={form.authority}
                onChange={handleChange}
                placeholder="Example: Rwanda Standards Board"
                required
              />
            </div>

            <div className="regulation-form-group">
              <label htmlFor="effective_date">
                Effective Date
              </label>

              <input
                id="effective_date"
                type="date"
                name="effective_date"
                value={form.effective_date}
                onChange={handleChange}
              />
            </div>

            <div className="regulation-form-group regulation-full-width">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="4"
                placeholder="Write a short description of this regulation document."
              />
            </div>

            <div className="regulation-form-group regulation-full-width">
              <label htmlFor="regulation-document">
                Official Regulation Document
              </label>

              <input
                id="regulation-document"
                type="file"
                name="document"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                required
              />

              <small>
                Accepted formats: PDF, DOC and DOCX.
              </small>
            </div>
          </div>

          <button
            type="submit"
            className="regulation-submit-button"
            disabled={submitting}
          >
            {submitting
              ? "Uploading and processing..."
              : "Upload Regulation Document"}
          </button>
        </form>
      </div></AdminModal>}

      <div className="regulation-list-card">
        <div className="admin-table-toolbar">
          <div className="regulation-card-heading">
            <h2>Uploaded Regulation Sets</h2>
            <p>Regulation requirements are used according to destination market and product category.</p>
          </div>
          <div className="admin-toolbar-actions">
            <label className="admin-search"><span>Search regulation sets</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, market or category" /></label>
            <button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Upload Regulation</button>
          </div>
        </div>

        {filteredRegulationSets.length === 0 ? (
          <div className="regulation-empty-state">
            {search ? "No regulation sets match your search." : "No regulation sets have been uploaded yet."}
          </div>
        ) : (
          <div className="regulation-table-wrapper">
            <table className="regulation-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Market</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Requirements</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRegulationSets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.authority}
                      </span>
                    </td>

                    <td>
                      {item.market_name ||
                        item.market?.name ||
                        "—"}
                    </td>

                    <td>
                      {item.category_name ||
                        item.category?.name ||
                        "—"}
                    </td>

                    <td>
                      {item.version || "—"}
                    </td>

                    <td>
                      {item.requirements_count ??
                        item.extracted_requirements_count ??
                        0}
                    </td>

                    <td>
                      <span
                        className={`regulation-status ${
                          item.status || "unknown"
                        }`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    <td>
                      <div className="regulation-actions">
                        {[
                          "active",
                          "inactive",
                        ].includes(item.status) && (
                          <button
                            type="button"
                            className="regulation-status-button"
                            onClick={() =>
                              handleStatusChange(
                                item.id,
                                item.status
                              )
                            }
                          >
                            {item.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        )}

                        <button
                          type="button"
                          className="regulation-delete-button"
                          onClick={() =>
                            handleDelete(item.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegulationSets;
