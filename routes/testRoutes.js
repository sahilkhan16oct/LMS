const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const testController = require('../controllers/testController');
const verifyToken = require('../middleware/auth');

const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

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

// POST /api/admin/upload-test
router.post('/upload-test', verifyToken, upload.single('file'), testController.uploadTest);

// GET /api/admin/tests
router.get('/tests', verifyToken, testController.getAllTests);

//test delete route
router.delete('/test/:id', verifyToken, testController.deleteTest);

//excel preview route
router.get('/test/:id/preview', verifyToken, testController.previewTest);

//Excel download route
router.get('/test/:id/download',  testController.downloadTestFile);





module.exports = router;
