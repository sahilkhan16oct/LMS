const express = require("express");
const router = express.Router();
const CandidateTestController = require("../controllers/CandidateTestController");

const verifyToken = require("../middleware/auth");

// ✅ Randomized test for candidate
router.get("/test/:testId", verifyToken, CandidateTestController.getRandomizedTest);

//candidate test submit route 
router.post("/submit-test/:testId", verifyToken, CandidateTestController.submitTest);

//remove unlocked chapters from test wala chapter


module.exports = router;
