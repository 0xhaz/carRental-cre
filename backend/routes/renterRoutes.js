/**
 * Renter Routes
 * Routes for renter profile management and booking operations
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.js";
import {
  createOrUpdateProfile,
  getProfile,
  submitBooking,
  getBookings,
  getBookingById,
  cancelBooking,
} from "../controllers/renterController.js";

const renterRouter = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = "./uploads/licenses";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for driver's license uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const fieldName = file.fieldname; // licenseFront or licenseBack
    cb(null, `${req.user._id}-${fieldName}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and PDF files are allowed for license uploads"));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Profile routes
renterRouter.post(
  "/profile",
  protect,
  upload.fields([
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
  ]),
  createOrUpdateProfile
);

renterRouter.get("/profile", protect, getProfile);

// Booking routes
renterRouter.post("/booking", protect, submitBooking);
renterRouter.get("/bookings", protect, getBookings);
renterRouter.get("/booking/:id", protect, getBookingById);
renterRouter.put("/booking/:id/cancel", protect, cancelBooking);

export default renterRouter;
