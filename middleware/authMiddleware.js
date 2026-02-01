// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];

  if (!tokenHeader) {
    return res.status(403).json({ success: false, message: "A token is required for authentication" });
  }

  try {
    // Format header biasanya: "Bearer <token>"
    const token = tokenHeader.split(" ")[1]; 
    if (!token) return res.status(403).json({ success: false, message: "Token format invalid" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kunci_rahasia_super_aman');
    req.user = decoded; // Simpan data user (admin) di request
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid Token" });
  }
};

module.exports = verifyToken;