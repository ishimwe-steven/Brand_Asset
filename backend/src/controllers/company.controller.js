const Company = require("../models/company.model");
const User = require("../models/user.model");
const { success, error } = require("../utils/response");

const getExporter = async (req, res) => {
  if (req.user?.role !== "exporter") {
    error(res, "This action is only available to SME exporters", 403);
    return null;
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    error(res, "User account was not found", 404);
    return null;
  }
  return user;
};

const ensureCompany = async (user) => {
  let company = await Company.getByOwnerUserId(user.id);
  if (!company && user.company_name) {
    const id = await Company.create({
      owner_user_id: user.id,
      company_name: user.company_name,
      email: user.email,
      phone: user.phone,
    });
    company = await Company.getById(id);
  }
  return company;
};

exports.getMyCompany = async (req, res) => {
  try {
    const user = await getExporter(req, res);
    if (!user) return;
    const company = await ensureCompany(user);
    return success(res, "Company profile fetched successfully", { company });
  } catch (err) {
    console.error("GET COMPANY ERROR:", err.message);
    return error(res, "Failed to fetch company profile", 500);
  }
};

exports.updateMyCompany = async (req, res) => {
  try {
    const user = await getExporter(req, res);
    if (!user) return;

    const companyName = String(req.body.company_name || "").trim();
    if (!companyName) return error(res, "Company name is required", 400);

    let company = await ensureCompany(user);
    if (!company) {
      const id = await Company.create({
        owner_user_id: user.id,
        company_name: companyName,
        registration_number: req.body.registration_number,
        email: req.body.email || user.email,
        phone: req.body.phone || user.phone,
        address: req.body.address,
      });
      company = await Company.getById(id);
    } else {
      await Company.updateByOwnerUserId(user.id, {
        company_name: companyName,
        registration_number: req.body.registration_number,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
      });
      company = await Company.getByOwnerUserId(user.id);
    }

    return success(res, "Company profile updated successfully", { company });
  } catch (err) {
    console.error("UPDATE COMPANY ERROR:", err.message);
    return error(res, "Failed to update company profile", 500);
  }
};
