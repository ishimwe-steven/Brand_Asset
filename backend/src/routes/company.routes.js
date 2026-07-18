const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { getMyCompany, updateMyCompany } = require("../controllers/company.controller");

router.get("/mine", auth, getMyCompany);
router.put("/mine", auth, updateMyCompany);

module.exports = router;
