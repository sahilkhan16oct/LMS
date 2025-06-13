const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Smart Role Assignment
    if (decoded.role === 'admin') {
      req.admin = decoded;
    } else if (decoded.role === 'candidate') {
      req.candidate = decoded;
    }

    req.user = {
      _id: decoded.sub || decoded.id,   // 👈 Flask uses `sub`, keep fallback for `id`
      ...decoded
    };

    next();
  } catch (error) {
    console.error('JWT VERIFY ERROR:', error);
    res.status(400).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;





// const jwt = require('jsonwebtoken');

// const verifyToken = (req, res, next) => {
  
//   let token = req.header('Authorization');

//   if (!token) {
//     return res.status(401).json({ message: 'Access denied. No token provided.' });
//   }

//   if (token.startsWith('Bearer ')) {
//     token = token.slice(7, token.length);
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 🔁 Smart Role Assignment
//     if (decoded.role === 'admin') {
//       req.admin = decoded;
//     } else if (decoded.role === 'candidate') {
//       req.candidate = decoded;
//     }

//     req.user = { _id: decoded.id, ...decoded };
//  // ✅ optional: generic access to id + role
//     next();
//   } catch (error) {
//     console.error('JWT VERIFY ERROR:', error);
//     res.status(400).json({ message: 'Invalid token' });
//   }
// };

// module.exports = verifyToken;
