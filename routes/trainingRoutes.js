const express = require('express');
const router = express.Router({ strict: false }); 
const trainingController = require('../controllers/trainingController');
const verifyToken = require('../middleware/auth'); 
const multer = require('multer');
const path = require('path');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config(); // ensure your env variables are loaded

const s3 = new S3Client({
region: process.env.S3_REGION, // add this
credentials: {
accessKeyId: process.env.S3_ACCESS_KEY,
secretAccessKey: process.env.S3_SECRET_KEY
}
});

const upload = multer({
storage: multerS3({
s3: s3,
bucket: process.env.S3_BUCKET_NAME,
// acl: 'public-read',
contentType: multerS3.AUTO_CONTENT_TYPE,
metadata: function (req, file, cb) {
cb(null, { fieldName: file.fieldname });
},
key: function (req, file, cb) {
const filename = Date.now().toString() + '_' + file.originalname;
cb(null, filename);
}
})
});


// ✅ multer config
// Multer storage setup (same as you've written earlier)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     if (file.mimetype.startsWith('video/')) {
//       cb(null, path.resolve(__dirname, '../uploads/videos')); // Adjust path as needed
//     } else if (file.mimetype === 'application/pdf') {
//       cb(null, path.resolve(__dirname, '../uploads/pdfs'));
//     } else {
//       cb(new Error('Unsupported file type'), null);
//     }
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });
// const upload = multer({ storage: storage });



// POST /api/admin/Add-Training
router.post('/Add-Training', verifyToken, upload.single('video'), trainingController.addTraining);

// GET /api/admin/trainings - fetch all trainings
router.get('/trainings', verifyToken, trainingController.getAllTrainings);

// DELETE /api/admin/training/:id - delete training by ID
router.delete('/training/:id', verifyToken, trainingController.deleteTraining);


// PUT /api/admin/training/:id - update a training by ID
router.put('/training/:id', verifyToken, upload.single('video'), trainingController.updateTraining);




  
  // ✅ Add new chapter route
  router.post('/training/:id/chapter', verifyToken, upload.single('pdf'), trainingController.addChapter);

  // GET /api/admin/training/:id/chapters
router.get('/training/:id/chapters', verifyToken, trainingController.getChapters);

// Update text fields for a chapter by chap Id
router.put('/training/:trainingId/chapter/:chapterId/update', trainingController.updateChapter);

// Replace PDF by chapter Id
router.put('/training/:trainingId/chapter/:chapterId/replace-pdf', upload.single('pdf'), trainingController.replaceChapterPdf);


// ✅ Delete chapter route
router.delete('/training/:trainingId/chapter/:chapterId', verifyToken, trainingController.deleteChapter);


// ✅ Add index to a chapter route
router.post(
  '/training/:trainingId/chapter/:chapterId/index', verifyToken,
  trainingController.addIndex
);

//edit index route
router.put(
  '/training/:trainingId/chapter/:chapterId/index/:indexId',
  verifyToken,
  trainingController.updateIndex
);

//index delete route
router.delete(
  '/training/:trainingId/chapter/:chapterId/index/:indexId',
  verifyToken,
  trainingController.deleteIndex
);



// Get indexes-list for a chapter
router.get(
  '/training/:trainingId/chapter/:chapterId/index-list',
  verifyToken,
  trainingController.getIndexes
);


//sub-index nesting route
router.post(
  '/training/:trainingId/chapter/:chapterId/add-subindex',
  verifyToken,
  trainingController.addAnySubIndex
);

//edit sub-index route
router.put(
  '/training/:trainingId/chapter/:chapterId/subindex/:subIndexId',
  verifyToken,
  trainingController.updateSubIndex
);


//delete sub-index controller
router.delete(
  '/training/:trainingId/chapter/:chapterId/subindex/:subIndexId',
  verifyToken,
  trainingController.deleteSubIndex
);


//link test to a chapter
router.put(
  '/training/:trainingId/chapter/:chapterId/link-test',
  verifyToken,
  trainingController.linkTestToChapter
);


// Unlink test from a chapter
router.put(
  '/training/:trainingId/chapter/:chapterId/unlink-test',
  verifyToken,
 trainingController.unlinkTestFromChapter
);


//chapters unlock route
router.put(
  '/training/:trainingId/chapter/:chapterId/set-unlocks',
  verifyToken,
  trainingController.setUnlocksForChapter
);


//unlock chapter remove route
router.put(
  '/training/:trainingId/chapter/:chapterId/remove-unlocks',
  verifyToken,
  trainingController.removeUnlocksFromChapter
);


//get list of unlock chapters set for any chapter
router.get(
  '/training/:trainingId/chapter/:chapterId/unlocks',
  verifyToken,
  trainingController.getUnlockChaptersOfChapter
);


//reverse dependency and unlock array push route
router.put(
  '/training/:trainingId/chapter/:chapterId/dependent-on',
  verifyToken,
  trainingController.setReverseDependencies
);


module.exports = router;
