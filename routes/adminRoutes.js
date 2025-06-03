const express = require('express');
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/auth');  // ✅ yeh line add kari

const router = express.Router();

// Admin register route
router.post('/register', adminController.registerAdmin);

// Admin login
router.post('/login', adminController.loginAdmin);

// ✅ protected route
router.get('/protected', verifyToken, (req, res) => {
    res.json({ message: 'Access granted to protected route', admin: req.admin });
});

module.exports = router;
