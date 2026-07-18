const express = require("express");
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const { getUsers, createUser, updateUser, changeUserStatus, resetUserPassword } = require("../controllers/user.controller");

const router = express.Router();
router.use(auth, admin);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/status", changeUserStatus);
router.post("/:id/reset-password", resetUserPassword);

module.exports = router;
