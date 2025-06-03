const express = require("express");
const router = express.Router();
const CandidateTestController = require("../controllers/CandidateTestController");
const verifyToken = require("../middleware/auth");

router.post("/:testId/submit", verifyToken, CandidateTestController.submitTest);

module.exports = router;
