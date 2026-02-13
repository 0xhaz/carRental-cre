import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from header
    let token = req.headers.authorization;

    if (!token) {
      return res.json({ success: false, message: "Not authorized, no token" });
    }

    // Remove "Bearer " prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    // Verify token (use verify, not decode!)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.json({ success: false, message: "Invalid token" });
    }

    // Get user from token (decoded is the userId string)
    req.user = await User.findById(decoded).select("-password");

    if (!req.user) {
      return res.json({ success: false, message: "User not found" });
    }

    next();
  } catch (error) {
    console.log("Auth middleware error:", error.message);
    res.json({ success: false, message: "Not authorized, invalid token" });
  }
};

/**
 * Admin middleware
 * Checks if user has admin role
 * Must be used after protect middleware
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
};
