const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const candidateQueryController = require('../controllers/candidateQueryController');

// ✅ Use memory storage for in-RAM file
const upload = multer({ storage: multer.memoryStorage() });

router.post('/send-query', verifyToken, upload.single('attachment'), candidateQueryController.sendQueryToAdmin);

module.exports = router;
