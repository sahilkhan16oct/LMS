const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const verifyToken = require("../middleware/auth");



//acndidate login route
router.post("/login", candidateController.loginCandidate);

//candidate assigned-Training routes
router.get("/assigned-trainings", verifyToken, candidateController.getAssignedTrainings);


// get candidate profile
router.get("/profile", verifyToken, candidateController.getCandidateProfile);



//chapter name fetching route
router.get("/chapter-name/:chapterId", verifyToken, candidateController.getChapterNameById);


module.exports = router;
