const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const verifyToken = require('../middleware/auth');


//certificate download with name route 
router.get(
  '/download-certificate/:trainingId/:chapterId',
  verifyToken,
  certificateController.generatePersonalizedCertificate
);


module.exports = router;
