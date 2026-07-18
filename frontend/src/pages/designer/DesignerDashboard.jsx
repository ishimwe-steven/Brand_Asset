import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { getAvailableBrands } from "../../services/brand.service";

import "./DesignerDashboard.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const getLogoUrl = (logoPath) => {
  if (!logoPath) return "";

  if (
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://")
  ) {
    return logoPath;
  }

  return `${API_BASE_URL}/${logoPath.replace(/^\/+/, "")}`;
};

const parseDominantColours = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(
        "Failed to parse dominant colours:",
        error
      );

      return [];
    }
  }

  return [];
};

const extractBrands = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.brands)) {
    return response.brands;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.brands)) {
    return response.data.brands;
  }

  return [];
};

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedBrand = useMemo(() => {
    return (
      brands.find(
        (brand) =>
          Number(brand.id) === Number(selectedBrandId)
      ) || null
    );
  }, [brands, selectedBrandId]);

  const selectedBrandColours = useMemo(() => {
    return parseDominantColours(
      selectedBrand?.dominant_colours
    );
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getAvailableBrands();
      const availableBrands = extractBrands(response);

      setBrands(availableBrands);

      if (availableBrands.length > 0) {
        setSelectedBrandId(
          String(availableBrands[0].id)
        );
      } else {
        setSelectedBrandId("");
      }
    } catch (error) {
      console.error("Failed to load brands:", error);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to load company brands."
      );

      setBrands([]);
      setSelectedBrandId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const startPackagingVerification = () => {
    if (!selectedBrandId) {
      setErrorMessage(
        "Select a brand before uploading packaging."
      );

      return;
    }

    navigate(
  `/dashboard/designer/verify-packaging?brand_id=${selectedBrandId}`
);
  };

  const openReports = () => {
    navigate("/dashboard/reports");
  };

  return (
    <div className="designer-dashboard">
      <header className="designer-welcome">
        <div>
          <p className="designer-eyebrow">
            Designer Workspace
          </p>

          <h1>
            Welcome, {user?.name || "Designer"}
          </h1>

          <p>
            Select a company brand, upload packaging,
            run verification and review correction
            recommendations.
          </p>
        </div>

        <button
          type="button"
          className="designer-report-button"
          onClick={openReports}
        >
          View Reports
        </button>
      </header>

      {errorMessage && (
        <div className="designer-error">
          {errorMessage}
        </div>
      )}

      <section className="designer-summary-grid">
        <article className="designer-summary-card">
          <span>Available Brands</span>

          <strong>{brands.length}</strong>

          <small>
            Active brands registered by your SME
          </small>
        </article>

        <article className="designer-summary-card">
          <span>Primary Task</span>

          <strong>Verify</strong>

          <small>
            Upload and verify packaging designs
          </small>
        </article>

        <article className="designer-summary-card">
          <span>Account Status</span>

          <strong className="active-text">
            Active
          </strong>

          <small>
            You are permitted to submit packaging
          </small>
        </article>
      </section>

      <section className="designer-workspace-card">
        <div className="designer-section-heading">
          <div>
            <h2>Start Packaging Verification</h2>

            <p>
              Choose the brand whose official assets
              will be used during verification.
            </p>
          </div>

          <button
            type="button"
            onClick={loadBrands}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Brands"}
          </button>
        </div>

        {loading ? (
          <div className="designer-empty-state">
            Loading company brands...
          </div>
        ) : brands.length === 0 ? (
          <div className="designer-empty-state">
            <h3>No active brand is available</h3>

            <p>
              Ask the SME account owner to create or
              activate a brand.
            </p>
          </div>
        ) : (
          <>
            <div className="designer-brand-selector">
              <label htmlFor="designer_brand">
                Select brand
              </label>

              <select
                id="designer_brand"
                value={selectedBrandId}
                onChange={(event) => {
                  setSelectedBrandId(event.target.value);
                  setErrorMessage("");
                }}
              >
                {brands.map((brand) => (
                  <option
                    key={brand.id}
                    value={brand.id}
                  >
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBrand && (
              <div className="selected-brand-card">
                <div className="selected-brand-logo">
                  {selectedBrand.official_logo_path ? (
                    <img
                      src={getLogoUrl(
                        selectedBrand.official_logo_path
                      )}
                      alt={`${selectedBrand.brand_name} logo`}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <span>No Logo</span>
                  )}
                </div>

                <div className="selected-brand-content">
                  <span className="selected-label">
                    Selected brand
                  </span>

                  <h3>{selectedBrand.brand_name}</h3>

                  <p>
                    {selectedBrand.slogan ||
                      "No slogan registered"}
                  </p>

                  {selectedBrandColours.length > 0 && (
                    <div className="designer-colour-list">
                      {selectedBrandColours.map(
                        (colour, index) => {
                          const hex =
                            typeof colour === "string"
                              ? colour
                              : colour.hex;

                          const percentage =
                            typeof colour === "object"
                              ? colour.percentage
                              : null;

                          if (!hex) {
                            return null;
                          }

                          return (
                            <div
                              key={`${hex}-${index}`}
                              className="designer-colour-item"
                              title={
                                percentage !== null &&
                                percentage !== undefined
                                  ? `${hex} — ${percentage}%`
                                  : hex
                              }
                            >
                              <span
                                style={{
                                  backgroundColor: hex,
                                }}
                              />

                              <small>{hex}</small>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                <div className="selected-brand-action">
                  <button
                    type="button"
                    onClick={startPackagingVerification}
                  >
                    Upload Packaging
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="designer-process-card">
        <h2>Verification Process</h2>

        <div className="designer-process-grid">
          <div>
            <strong>1</strong>

            <h3>Select Brand</h3>

            <p>
              Choose the approved company brand.
            </p>
          </div>

          <div>
            <strong>2</strong>

            <h3>Upload Packaging</h3>

            <p>
              Submit the packaging image or design.
            </p>
          </div>

          <div>
            <strong>3</strong>

            <h3>Run Verification</h3>

            <p>
              Verify brand assets and export rules.
            </p>
          </div>

          <div>
            <strong>4</strong>

            <h3>Review Report</h3>

            <p>
              View issues, scores and corrections.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignerDashboard;
