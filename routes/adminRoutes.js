const express = require('express');
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/auth');  // ✅ yeh line add kari

const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // temp directory


// Admin register route
router.post('/register', adminController.registerAdmin);

// Admin login
router.post('/login', adminController.loginAdmin);

// ✅ protected route
router.get('/protected', verifyToken, (req, res) => {
    res.json({ message: 'Access granted to protected route', admin: req.admin });
});


//log route for admin
router.get('/logs/recent',
     verifyToken,
     adminController.getRecentSessionLogs);

//download log route
router.get('/logs/download',
  verifyToken,
  adminController.downloadAllSessionLogs
);


//log update by admin for multiple candidates 
router.post(
  '/logs/upload',
  verifyToken,
  upload.single('file'),
  adminController.uploadSessionAndTrainingLog
);


module.exports = router;
