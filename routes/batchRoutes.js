const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const candidateController = require("../controllers/candidateController");
const auth = require('../middleware/auth'); // use if protected
const verifyToken = require('../middleware/auth');
const path = require("path");
const multer = require("multer");
const fs = require("fs");



// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/candidates";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const unique = `${name}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

//add new batch route
router.post('/batch', verifyToken, batchController.addBatch);

//get list of all the batches
router.get('/batches', verifyToken, batchController.getBatches);

//delete batch by id 
router.delete('/batch/:id', verifyToken, batchController.deleteBatch);

// ✅ Route: Upload Excel and Save Candidates in DB
router.post(
  "/batch/:id/upload-candidates",
  verifyToken,
  upload.single("file"),
  candidateController.uploadCandidatesExcel
);


//get list of uploaded excel files for a batch by batch id
router.get('/batch/:batchId/uploaded-files', verifyToken,    batchController.getUploadedFilesForBatch);

//get candidates of any excel file by file id
router.get(
  "/candidates/:batchId/by-file/:fileId",
  verifyToken,
  candidateController.getCandidatesByFileId
);

//delete an excel file
router.delete("/batch/:batchId/file/:fileId", verifyToken, batchController.deleteUploadedFile);

//search for any candidate in any batch
router.get('/candidates/search/:batchId',verifyToken, candidateController.searchCandidatesInBatch);

//route for downloading single excel of all candidates of any batch
router.get(
  '/batch/:batchId/merged-candidates',
  verifyToken,
  batchController.downloadMergedCandidatesExcel
);

// ✅ Update candidate by ID
router.put(
  "/batch/candidate/update/:candidateId",
  verifyToken,
  candidateController.updateCandidate
);

// ✅ Delete candidate by ID
router.delete(
  "/batch/candidate/delete/:candidateId",
  verifyToken,
  candidateController.deleteCandidate
);



//training assign for batch
router.post(
  "/batch/assign-training",
  verifyToken,
  batchController.assignTrainingToBatch
);

//remove training route
router.post(
  "/batch/remove-training",
  verifyToken,
  batchController.removeTrainingFromBatch
);


//get assign training for a batch.
router.get('/batch/:batchId/assigned-training',
  verifyToken,
   batchController.getAssignedTrainingForBatch);


//remove a candidate from any batch and unassign training.
router.put("/:batchId/remove-candidate/:candidateId",
  verifyToken,
  batchController.removeCandidateFromBatch
);

module.exports = router;
