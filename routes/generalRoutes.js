// 📁 backend-api/routes/generalRoutes.js  (✅ Recommended file to keep this route)

const express = require("express");
const router = express.Router();
const NoticeController = require("../controllers/NoticeController");

// ❗ PUBLIC route — no token required
router.get("/notice", NoticeController.getPublicNotice);

module.exports = router;
