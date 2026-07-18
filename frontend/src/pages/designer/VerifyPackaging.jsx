import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import api from "../../services/api";
import "./VerifyPackaging.css";

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const extractArray = (response) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(payload?.brands)
  ) {
    return payload.brands;
  }

  if (
    Array.isArray(payload?.categories)
  ) {
    return payload.categories;
  }

  if (
    Array.isArray(payload?.markets)
  ) {
    return payload.markets;
  }

  return [];
};

const extractUploadId = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  return (
    payload?.upload_id ??
    payload?.id ??
    payload?.upload?.id ??
    null
  );
};

const VerifyPackaging = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const brandIdFromUrl =
    searchParams.get("brand_id") || "";

  const [brands, setBrands] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [markets, setMarkets] =
    useState([]);

  const [form, setForm] = useState({
    brand_id: brandIdFromUrl,
    category_id: "",
    market_id: "",
    product_name: "",
    packaging: null,
  });

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [loadingData, setLoadingData] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [createdUploadId, setCreatedUploadId] =
    useState(null);

  const selectedBrand = useMemo(
    () =>
      brands.find(
        (brand) =>
          Number(brand.id) ===
          Number(form.brand_id)
      ) || null,
    [brands, form.brand_id]
  );

  const loadRequiredData =
    async () => {
      try {
        setLoadingData(true);
        setErrorMessage("");

        const [
          brandResponse,
          categoryResponse,
          marketResponse,
        ] = await Promise.all([
          api.get("/brands/available"),
          api.get("/categories"),
          api.get("/markets"),
        ]);

        const brandList =
          extractArray(
            brandResponse
          );

        const categoryList =
          extractArray(
            categoryResponse
          );

        const marketList =
          extractArray(
            marketResponse
          );

        setBrands(brandList);
        setCategories(categoryList);
        setMarkets(marketList);

        setForm((current) => ({
          ...current,

          brand_id:
            current.brand_id ||
            (brandList[0]?.id
              ? String(
                  brandList[0].id
                )
              : ""),

          category_id:
            current.category_id ||
            (categoryList[0]?.id
              ? String(
                  categoryList[0].id
                )
              : ""),

          market_id:
            current.market_id ||
            (marketList[0]?.id
              ? String(
                  marketList[0].id
                )
              : ""),
        }));
      } catch (error) {
        setErrorMessage(
          error.response?.data
            ?.message ||
            "Failed to load brands, categories or markets."
        );
      } finally {
        setLoadingData(false);
      }
    };

  useEffect(() => {
    loadRequiredData();
  }, []);

  useEffect(() => {
    return () => {
      if (
        previewUrl &&
        previewUrl.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  const handleInputChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  const handlePackagingChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type
      )
    ) {
      setErrorMessage(
        "Only JPG, PNG and WEBP packaging images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setErrorMessage(
        "Packaging image must not exceed 10 MB."
      );

      event.target.value = "";
      return;
    }

    if (
      previewUrl &&
      previewUrl.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setForm((current) => ({
      ...current,
      packaging: file,
    }));

    setPreviewUrl(
      URL.createObjectURL(file)
    );

    setErrorMessage("");
    setSuccessMessage("");
  };

  const validateForm = () => {
    if (!form.brand_id) {
      return "Select a brand.";
    }

    if (!form.category_id) {
      return "Select a product category.";
    }

    if (!form.market_id) {
      return "Select an export market.";
    }

    if (
      !form.product_name.trim()
    ) {
      return "Product name is required.";
    }

    if (!form.packaging) {
      return "Packaging image is required.";
    }

    return null;
  };

  const uploadPackaging =
    async () => {
      const data = new FormData();

      data.append(
        "brand_id",
        String(form.brand_id)
      );

      data.append(
        "category_id",
        String(form.category_id)
      );

      data.append(
        "market_id",
        String(form.market_id)
      );

      data.append(
        "product_name",
        form.product_name.trim()
      );

      /*
       * Backend Multer field name:
       * upload.single("packaging")
       */
      data.append(
        "packaging",
        form.packaging
      );

      return api.post(
        "/uploads",
        data
      );
    };

  const startVerification =
    async (uploadId) => {
      /*
       * Change this endpoint only if your
       * existing verification route uses
       * a different URL.
       */
      return api.post(
        "/verifications/start",
        {
          upload_id: uploadId,
        }
      );
    };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setCreatedUploadId(null);

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

      const uploadResponse =
        await uploadPackaging();

      const uploadId =
        extractUploadId(
          uploadResponse
        );

      if (!uploadId) {
        throw new Error(
          "Packaging was uploaded, but the upload ID was not returned."
        );
      }

      setCreatedUploadId(
        uploadId
      );

      const verificationResponse =
        await startVerification(
          uploadId
        );

      const verificationPayload =
        verificationResponse?.data
          ?.data ??
        verificationResponse?.data;

      const verificationId =
        verificationPayload
          ?.verification_id ??
        verificationPayload?.id ??
        null;

      setSuccessMessage(
        "Packaging uploaded and verification started successfully."
      );

      if (verificationId) {
        setTimeout(() => {
          navigate(
            `/dashboard/verification/${verificationId}`,
            {
              replace: true,
            }
          );
        }, 800);
      } else {
        setTimeout(() => {
          navigate(
            `/dashboard/uploads/${uploadId}`,
            {
              replace: true,
            }
          );
        }, 800);
      }
    } catch (error) {
      console.error(
        "PACKAGING VERIFICATION ERROR:",
        error
      );

      setErrorMessage(
        error.response?.data
          ?.message ||
          error.response?.data
            ?.details ||
          error.message ||
          "Failed to upload and verify packaging."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="verify-packaging-page">
        <div className="verify-loading">
          Loading verification form...
        </div>
      </div>
    );
  }

  return (
    <div className="verify-packaging-page">
      <header className="verify-page-header">
        <div>
          <p className="verify-eyebrow">
            Designer Workspace
          </p>

          <h1>
            Verify Packaging
          </h1>

          <p>
            Upload a packaging design and
            verify its brand assets and
            export-market compliance.
          </p>
        </div>

        <button
          type="button"
          className="verify-back-button"
          onClick={() =>
            navigate(
              "/dashboard/designer"
            )
          }
        >
          Back to Dashboard
        </button>
      </header>

      {errorMessage && (
        <div className="verify-alert verify-error">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="verify-alert verify-success">
          {successMessage}
        </div>
      )}

      <div className="verify-layout">
        <section className="verify-form-card">
          <div className="verify-section-heading">
            <h2>
              Packaging Details
            </h2>

            <p>
              Select the brand, product
              category and destination
              market.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
          >
            <div className="verify-form-grid">
              <div className="verify-field">
                <label htmlFor="brand_id">
                  Brand
                </label>

                <select
                  id="brand_id"
                  name="brand_id"
                  value={
                    form.brand_id
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                >
                  <option value="">
                    Select brand
                  </option>

                  {brands.map(
                    (brand) => (
                      <option
                        key={
                          brand.id
                        }
                        value={
                          brand.id
                        }
                      >
                        {
                          brand.brand_name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="verify-field">
                <label htmlFor="category_id">
                  Product category
                </label>

                <select
                  id="category_id"
                  name="category_id"
                  value={
                    form.category_id
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {category.name ||
                          category.category_name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="verify-field">
                <label htmlFor="market_id">
                  Export market
                </label>

                <select
                  id="market_id"
                  name="market_id"
                  value={
                    form.market_id
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                >
                  <option value="">
                    Select market
                  </option>

                  {markets.map(
                    (market) => (
                      <option
                        key={
                          market.id
                        }
                        value={
                          market.id
                        }
                      >
                        {market.name ||
                          market.market_name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="verify-field">
                <label htmlFor="product_name">
                  Product name
                </label>

                <input
                  id="product_name"
                  name="product_name"
                  type="text"
                  value={
                    form.product_name
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: Mugisha Pure Honey"
                  required
                />
              </div>
            </div>

            <div className="verify-upload-section">
              <label htmlFor="packaging">
                Packaging image
              </label>

              <div className="verify-upload-box">
                <input
                  id="packaging"
                  name="packaging"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={
                    handlePackagingChange
                  }
                />

                <p>
                  Upload the front-facing
                  packaging artwork or
                  product package image.
                </p>

                <small>
                  JPG, PNG or WEBP. Maximum
                  size: 10 MB.
                </small>
              </div>
            </div>

            <button
              type="submit"
              className="verify-submit-button"
              disabled={
                submitting ||
                brands.length === 0
              }
            >
              {submitting
                ? "Uploading and verifying..."
                : "Start Verification"}
            </button>
          </form>
        </section>

        <aside className="verify-preview-card">
          <div className="verify-section-heading">
            <h2>
              Submission Preview
            </h2>

            <p>
              Confirm the selected brand
              and packaging design.
            </p>
          </div>

          <div className="verify-brand-summary">
            <span>
              Selected brand
            </span>

            <strong>
              {selectedBrand
                ?.brand_name ||
                "No brand selected"}
            </strong>

            <p>
              {selectedBrand?.slogan ||
                "No slogan available"}
            </p>

            <div className="verify-colour-list">
              {Array.isArray(
                selectedBrand
                  ?.dominant_colours
              ) &&
                selectedBrand.dominant_colours.map(
                  (
                    colour,
                    index
                  ) => (
                    <div
                      key={`${colour.hex}-${index}`}
                      title={
                        colour.hex
                      }
                    >
                      <span
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

          <div className="verify-image-preview">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Packaging preview"
              />
            ) : (
              <div className="verify-placeholder">
                <strong>
                  No packaging selected
                </strong>

                <p>
                  Your packaging preview
                  will appear here.
                </p>
              </div>
            )}
          </div>

          {createdUploadId && (
            <div className="verify-upload-result">
              Upload ID:{" "}
              <strong>
                {createdUploadId}
              </strong>
            </div>
          )}
        </aside>
      </div>

      <section className="verify-checks-card">
        <h2>
          Verification checks
        </h2>

        <div className="verify-checks-grid">
          <div>
            <strong>
              Logo Detection
            </strong>
            <p>
              Confirms that the official
              brand logo exists.
            </p>
          </div>

          <div>
            <strong>
              Logo Placement
            </strong>
            <p>
              Evaluates size, position and
              safe margins.
            </p>
          </div>

          <div>
            <strong>
              Brand Colours
            </strong>
            <p>
              Compares packaging colours
              with official brand colours.
            </p>
          </div>

          <div>
            <strong>
              Packaging Rules
            </strong>
            <p>
              Checks mandatory information
              for the selected market.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerifyPackaging;
