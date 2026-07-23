import api from "./api";

export const getReports = async () => {
  const response = await api.get("/reports");
  return response.data;
};

export const getReport = async (id) => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

export const generateReport = async (resultId) => {
  const response = await api.post("/reports/generate", {
    result_id: resultId,
  });

  return response.data;
};

export const downloadReport = async (resultId) => {
  const response = await api.get(
    `/reports/download/${resultId}`,
    {
      responseType: "blob",
    }
  );

  const contentType =
    response.headers?.["content-type"] || "";

  if (!contentType.includes("application/pdf")) {
    const errorText = await response.data.text();

    throw new Error(
      errorText || "The server did not return a valid PDF file."
    );
  }

  const pdfBlob = new Blob(
    [response.data],
    {
      type: "application/pdf",
    }
  );

  const downloadUrl =
    window.URL.createObjectURL(pdfBlob);

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `compliance-report-${resultId}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(downloadUrl);

  return {
    success: true,
    filename:
      `compliance-report-${resultId}.pdf`,
  };
};