const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SessionLog = require('../models/SessionLog'); 


// Admin Register
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new admin
    const newAdmin = new Admin({
      email,
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};



// Admin Login
exports.loginAdmin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // check if admin exists
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }
  
      // validate password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // generate JWT token
      const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '10d' });

      console.log('Secret used for signing:', process.env.JWT_SECRET);


  
      res.json({ token, message: 'Admin logged in successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in admin', error: error.message });
    }
  };


  //log controller for admin 
  exports.getRecentSessionLogs = async (req, res) => {
  try {
    const logs = await SessionLog.find({})
      .sort({ loginTime: -1 })
      .limit(50)
      .select('sessionId email phone loginTime logoutTime candidate')
      .populate('candidate', 'candidateId'); // to get canId

    const formattedLogs = logs.map(log => ({
      sessionId: log.sessionId,
      email: log.email,
      phone: log.phone,
      loginTime: log.loginTime,
      logoutTime: log.logoutTime,
      canId: log.candidate?.candidateId || 'N/A'
    }));

    res.status(200).json(formattedLogs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
};