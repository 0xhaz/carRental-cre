/**
 * KYC Routes
 * Routes for KYC document submission and review
 */

import express from "express";
import {
  submitKYC,
  getKYCStatus,
  getPendingKYC,
  getKYCById,
  approveKYC,
  rejectKYC,
  updateBlockchainStatus,
  getInvestorUsers,
  requestUpgrade,
  approveUpgrade,
  rejectUpgrade,
  notifyUpgradeWalletCreated,
  downgradeInvestor,
} from "../controllers/kycController.js";
import { protect, admin } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";

const kycRouter = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
let storage;
if (process.env.VERCEL) {
  storage = multer.memoryStorage();
} else {
  const uploadsDir = path.join(__dirname, "../uploads/kyc");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `kyc-${req.user._id}-${uniqueSuffix}${ext}`);
    },
  });
}

// File filter - only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, JPG, PNG) and PDF files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: fileFilter,
});

// Public routes (require authentication but not admin)
kycRouter.post(
  "/submit",
  protect,
  upload.fields([
    { name: "primaryDocument", maxCount: 1 },
    { name: "proofOfAddress", maxCount: 1 },
  ]),
  submitKYC
);

kycRouter.get("/status", protect, getKYCStatus);
kycRouter.post(
  "/request-upgrade",
  protect,
  upload.fields([{ name: "additionalDocuments", maxCount: 5 }]),
  requestUpgrade
);

// Admin routes (require admin privileges)
kycRouter.get("/investors", protect, admin, getInvestorUsers);
kycRouter.get("/pending", protect, admin, getPendingKYC);
kycRouter.get("/:id", protect, admin, getKYCById);
kycRouter.post("/:id/approve", protect, admin, approveKYC);
kycRouter.post("/:id/reject", protect, admin, rejectKYC);
kycRouter.post("/:id/approve-upgrade", protect, admin, approveUpgrade);
kycRouter.post("/:id/reject-upgrade", protect, admin, rejectUpgrade);
kycRouter.post("/:id/notify-upgrade-wallet", protect, admin, notifyUpgradeWalletCreated);
kycRouter.post("/:id/downgrade", protect, admin, downgradeInvestor);
kycRouter.post("/:id/blockchain", protect, admin, updateBlockchainStatus);

export default kycRouter;
