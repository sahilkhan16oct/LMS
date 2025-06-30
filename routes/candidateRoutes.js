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


//candidate logout time fetch route
router.patch("/logout", verifyToken, candidateController.logoutCandidate);

//training fetch for log session 
router.post("/session/training", verifyToken, candidateController.addTrainingLog);


//ask ai limit route foe candidate
// routes/candidateRoutes.js
router.post("/ask-ai", verifyToken, candidateController.askAiWithLimit);


//route for app(not for web)
router.get('/assigned-training/:trainingId', verifyToken, candidateController.getAssignedTrainingById);


//chapter details for chapter card in app
router.get(
  '/training/:trainingId/chapter/:chapterId',
  verifyToken,
  candidateController.getCandidateChapterDetails
);

module.exports = router;
