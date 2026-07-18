import "./Brands.css";
import { useEffect, useMemo, useState } from "react";
import {
  changeBrandStatus,
  createBrand,
  getMyBrands,
  updateBrand,
} from "../../services/brand.service";
import AdminModal from "../../components/admin/AdminModal";

const initialForm = {
  brand_name: "",
  slogan: "",
  trademark: "",
  official_logo: null,
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

function getResponseData(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function getLogoUrl(logoPath) {
  if (!logoPath) {
    return "";
  }

  if (
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://")
  ) {
    return logoPath;
  }

  return `${API_BASE_URL}/${logoPath.replace(/^\/+/, "")}`;
}

function getAssetProfileScore(brand) {
  const assets = [
    Boolean(brand.brand_name),
    Boolean(brand.official_logo_path),
    Boolean(brand.slogan),
    Boolean(brand.trademark),
    Array.isArray(brand.dominant_colours) && brand.dominant_colours.length > 0,
    Boolean(brand.logo_metadata?.width && brand.logo_metadata?.height),
  ];

  return Math.round((assets.filter(Boolean).length / assets.length) * 100);
}

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingBrand, setEditingBrand] =
    useState(null);

  const [logoPreview, setLogoPreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const activeBrandsCount = useMemo(
    () =>
      brands.filter(
        (brand) => brand.status === "active"
      ).length,
    [brands]
  );

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((brand) => [brand.brand_name, brand.slogan, brand.trademark, brand.status].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [brands, search]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getMyBrands();

      setBrands(
        getResponseData(response)
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to load brands."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    return () => {
      if (
        logoPreview &&
        logoPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          logoPreview
        );
      }
    };
  }, [logoPreview]);

  const handleInputChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleLogoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setErrorMessage(
        "Only JPG, PNG and WEBP logos are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setErrorMessage(
        "Logo must not exceed 10 MB."
      );

      event.target.value = "";
      return;
    }

    if (
      logoPreview &&
      logoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        logoPreview
      );
    }

    setForm((current) => ({
      ...current,
      official_logo: file,
    }));

    setLogoPreview(
      URL.createObjectURL(file)
    );

    setErrorMessage("");
  };

  const resetForm = () => {
    if (
      logoPreview &&
      logoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        logoPreview
      );
    }

    setForm(initialForm);
    setEditingBrand(null);
    setLogoPreview("");
  };

  const validateForm = () => {
    if (!form.brand_name.trim()) {
      return "Brand name is required.";
    }

    if (
      !editingBrand &&
      !form.official_logo
    ) {
      return "Official logo is required.";
    }

    return null;
  };

  const buildFormData = () => {
    const data = new FormData();

    data.append(
      "brand_name",
      form.brand_name.trim()
    );

    data.append(
      "slogan",
      form.slogan.trim()
    );

    data.append(
      "trademark",
      form.trademark.trim()
    );

    if (form.official_logo) {
      data.append(
        "official_logo",
        form.official_logo
      );
    }

    return data;
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(
        validationError
      );
      return;
    }

    try {
      setSubmitting(true);

      const data =
        buildFormData();

      if (editingBrand) {
        await updateBrand(
          editingBrand.id,
          data
        );

        setMessage(
          "Brand updated successfully."
        );
      } else {
        await createBrand(data);

        setMessage(
          "Brand created successfully."
        );
      }

      resetForm();
      setShowForm(false);
      await loadBrands();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.response?.data?.details ||
          "Failed to save brand."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (
    brand
  ) => {
    setEditingBrand(brand);

    setForm({
      brand_name:
        brand.brand_name || "",
      slogan:
        brand.slogan || "",
      trademark:
        brand.trademark || "",
      official_logo: null,
    });

    setLogoPreview(
      getLogoUrl(
        brand.official_logo_path
      )
    );

    setMessage("");
    setErrorMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleStatusChange =
    async (brand) => {
      try {
        setMessage("");
        setErrorMessage("");

        const newStatus =
          brand.status === "active"
            ? "inactive"
            : "active";

        await changeBrandStatus(
          brand.id,
          newStatus
        );

        setMessage(
          newStatus === "active"
            ? "Brand activated successfully."
            : "Brand deactivated successfully."
        );

        await loadBrands();
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message ||
            "Failed to change brand status."
        );
      }
    };

  return (
    <div className="brands-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Brand Management
          </p>

          <h1>My Brands</h1>

          <p>
            Add and manage the official
            brand assets used to verify
            product packaging.
          </p>
        </div>

        <div className="brand-stats">
          <div className="brand-stat">
            <span>Total Brands</span>
            <strong>
              {brands.length}
            </strong>
          </div>

          <div className="brand-stat">
            <span>Active Brands</span>
            <strong>
              {activeBrandsCount}
            </strong>
          </div>
        </div>
      </div>

      {message && (
        <div className="alert success-alert">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="alert error-alert">
          {errorMessage}
        </div>
      )}

      {showForm && <AdminModal title={editingBrand ? "Update Brand Asset Profile" : "Create Official Brand Asset Profile"} onClose={() => { resetForm(); setShowForm(false); }}><section className="brand-form-card brand-modal-card">
        <div className="section-heading">
          <div>
            <h2>
              {editingBrand
                ? "Update Brand Asset Profile"
                : "Create Official Brand Asset Profile"}
            </h2>

            <p>
              Register the approved assets designers must follow. The system extracts official colours and logo-quality metadata automatically.
            </p>
          </div>

          {editingBrand && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              Cancel Editing
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="brand-form"
        >
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="brand_name">
                Brand name
              </label>

              <input
                id="brand_name"
                name="brand_name"
                type="text"
                value={form.brand_name}
                onChange={
                  handleInputChange
                }
                placeholder="Example: Mugisha Honey"
              />
            </div>

            <div className="form-field">
              <label htmlFor="slogan">
                Slogan
              </label>

              <input
                id="slogan"
                name="slogan"
                type="text"
                value={form.slogan}
                onChange={
                  handleInputChange
                }
                placeholder="Example: Pure Natural Honey"
              />
            </div>

            <div className="form-field">
              <label htmlFor="trademark">
                Trademark
              </label>

              <input
                id="trademark"
                name="trademark"
                type="text"
                value={form.trademark}
                onChange={
                  handleInputChange
                }
                placeholder="Example: Mugisha™"
              />
            </div>

          </div>

          <div className="logo-upload-area">
            <div className="form-field">
              <label htmlFor="official_logo">
                Official logo
              </label>

              <input
                id="official_logo"
                name="official_logo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={
                  handleLogoChange
                }
              />

              <small>
                {editingBrand
                  ? "Leave empty to keep the current official logo."
                  : "Upload the approved official logo for this brand."}
              </small>
            </div>

            {logoPreview && (
              <div className="logo-preview">
                <img
                  src={logoPreview}
                  alt="Official logo preview"
                />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : editingBrand
                ? "Update Brand"
                : "Create Brand"}
            </button>
          </div>
        </form>
      </section></AdminModal>}

      <section className="brands-list-section">
        <div className="section-heading brand-list-toolbar">
          <div>
            <h2>Official Brand Asset Profiles</h2>
            <p>
              Official brand profiles
              belonging to your company.
            </p>
          </div>
          <div className="admin-toolbar-actions"><label className="admin-search"><span>Search brands</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, slogan or status" /></label><button className="admin-add-button" type="button" onClick={() => { resetForm(); setShowForm(true); }}>+ Add Brand</button></div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading brands...
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="empty-state">
            {search ? "No brands match your search." : "No brand has been created yet."}
          </div>
        ) : (
          <div className="brand-card-grid">
            {filteredBrands.map((brand) => (
              <article
                key={brand.id}
                className="brand-card"
              >
                <div className="brand-card-top">
                  <div className="brand-logo-box">
                    {brand.official_logo_path ? (
                      <img
                        src={getLogoUrl(
                          brand.official_logo_path
                        )}
                        alt={
                          brand.brand_name
                        }
                      />
                    ) : (
                      <span>No Logo</span>
                    )}
                  </div>

                  <span
                    className={`status-badge ${brand.status}`}
                  >
                    {brand.status}
                  </span>
                </div>

                <div className="brand-card-body">
                  <div className="asset-score-row">
                    <span>Asset profile readiness</span>
                    <strong>{getAssetProfileScore(brand)}%</strong>
                  </div>
                  <div className="asset-score-track">
                    <span style={{ width: `${getAssetProfileScore(brand)}%` }} />
                  </div>
                  <h3>
                    {brand.brand_name}
                  </h3>

                  <p>
                    {brand.slogan ||
                      "No slogan provided"}
                  </p>

                  {brand.trademark && (
                    <span className="trademark-text">
                      {brand.trademark}
                    </span>
                  )}

                  <div className="colour-section">
                    <span>
                      Brand colours
                    </span>

                    <div className="colour-list">
                      {Array.isArray(
                        brand.dominant_colours
                      ) &&
                        brand.dominant_colours.map(
                          (
                            colour,
                            index
                          ) => (
                            <div
                              className="colour-item"
                              key={`${colour.hex}-${index}`}
                              title={`${colour.hex} - ${colour.percentage}%`}
                            >
                              <span
                                className="colour-dot"
                                style={{
                                  backgroundColor:
                                    colour.hex,
                                }}
                              />

                              <small>
                                {colour.hex}
                              </small>
                            </div>
                          )
                        )}
                    </div>
                  </div>

                  <div className="brand-details">
                    <span>
                      Primary:{" "}
                      {brand.primary_colour ||
                        "Not available"}
                    </span>
                  </div>

                  <div className="asset-tags" aria-label="Registered brand assets">
                    <span className={brand.official_logo_path ? "ready" : "missing"}>Logo</span>
                    <span className={brand.slogan ? "ready" : "missing"}>Slogan</span>
                    <span className={brand.trademark ? "ready" : "missing"}>Trademark</span>
                    <span className={brand.dominant_colours?.length ? "ready" : "missing"}>Colours</span>
                  </div>
                </div>

                <div className="brand-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      startEditing(
                        brand
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={
                      brand.status ===
                      "active"
                        ? "danger-button"
                        : "primary-button"
                    }
                    onClick={() =>
                      handleStatusChange(
                        brand
                      )
                    }
                  >
                    {brand.status ===
                    "active"
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
