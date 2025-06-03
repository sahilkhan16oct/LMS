const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const verifyToken = require("../middleware/auth");
const CandidateTestController = require("../controllers/CandidateTestController");


//acndidate login route
router.post("/login", candidateController.loginCandidate);

//candidate assigned-Training routes
router.get("/assigned-trainings", verifyToken, candidateController.getAssignedTrainings);


// get candidate profile
router.get("/profile", verifyToken, candidateController.getCandidateProfile);


// ✅ Randomized test for candidate
router.get("/:testId", verifyToken, CandidateTestController.getRandomizedTest);





module.exports = router;
