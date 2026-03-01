const axios = require("axios");
const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // If AUTH_SERVICE_URL is configured, try remote verification with timeout
    if (process.env.AUTH_SERVICE_URL) {
      try {
        const response = await axios.get(
          `${process.env.AUTH_SERVICE_URL}/api/auth/verify`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 2000,
          },
        );
        req.user = response.data.user;
        return next();
      } catch (err) {
        // Log error for diagnosis but don't expose details to client
        console.error("Auth service verify call failed:", err.message || err);
        // fall through to local verification if possible
      }
    }

    // Fallback: verify locally if JWT_SECRET is available
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (err) {
        console.error("Local JWT verify failed:", err.message || err);
        return res.status(401).json({ error: "Invalid or expired token" });
      }
    }

    // No method to verify token
    return res.status(401).json({ error: "Invalid or expired token" });
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
