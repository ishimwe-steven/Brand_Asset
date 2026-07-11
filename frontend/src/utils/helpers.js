// ==========================================
// API URL
// ==========================================

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";


// ==========================================
// Build uploaded file URL
// Example:
// /uploads/image.png
// ->
// http://localhost:5000/uploads/image.png
// ==========================================

export const backendFileUrl = (filePath) => {
  if (!filePath) return "";

  if (filePath.startsWith("http")) {
    return filePath;
  }

  return `${BACKEND_URL}${filePath}`;
};


// ==========================================
// Format Date
// ==========================================

export const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};


// ==========================================
// Format Date & Time
// ==========================================

export const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-GB");
};


// ==========================================
// Compliance Badge Color
// ==========================================

export const getComplianceColor = (score) => {
  if (score >= 80) return "#16a34a"; // green
  if (score >= 50) return "#f59e0b"; // orange
  return "#dc2626"; // red
};


// ==========================================
// Export Status Label
// ==========================================

export const getExportStatus = (status) => {
  switch (status) {
    case "ready":
      return "Export Ready";

    case "needs_correction":
      return "Needs Correction";

    case "not_ready":
      return "Not Ready";

    default:
      return status;
  }
};


// ==========================================
// Confidence Formatter
// ==========================================

export const formatConfidence = (value) => {
  if (!value) return "0%";

  return `${Number(value).toFixed(2)}%`;
};