import express from "express";
import { protect } from "../middleware/auth.js";
import {
  addCar,
  changeRoleToRentor,
  deleteCar,
  getDashboardData,
  getRentorCars,
  getVehicleById,
  toggleCarAvailability,
  updateCar,
  updateUserImage,
  setVehicleNftId,
  setVehicleTokens,
  getVehiclesPendingRegistration,
  completeTokenRegistration,
  syncVehicleTokenAddresses,
  uploadMilestoneDocuments,
  getMilestoneDocuments,
  getVehicleByNftId,
} from "../controllers/rentorController.js";
import upload from "../middleware/multer.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Milestone document upload config
const milestonesDir = path.join(__dirname, "../uploads/milestones");
if (!fs.existsSync(milestonesDir)) {
  fs.mkdirSync(milestonesDir, { recursive: true });
}

const milestoneStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, milestonesDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `milestone-${req.params.vehicleId}-${uniqueSuffix}${ext}`);
  },
});

const milestoneFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
  }
};

const milestoneUpload = multer({
  storage: milestoneStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: milestoneFileFilter,
});

const rentorRouter = express.Router();

// API endpoints for rentor can be defined here
rentorRouter.post("/change-role", protect, changeRoleToRentor);
rentorRouter.post("/add-car", protect, upload.none(), addCar);
rentorRouter.post("/update-car/:carId", protect, upload.none(), updateCar);
rentorRouter.get("/cars", protect, getRentorCars);
rentorRouter.get("/vehicle/:vehicleId", protect, getVehicleById);
rentorRouter.post("/toggle-car", protect, toggleCarAvailability);
rentorRouter.post("/delete-car", protect, deleteCar);
rentorRouter.post("/vehicle/:vehicleId/set-nft-id", protect, setVehicleNftId);
rentorRouter.post("/vehicle/:vehicleId/set-tokens", protect, setVehicleTokens);
rentorRouter.get("/vehicles-pending-registration", protect, getVehiclesPendingRegistration);
rentorRouter.post("/vehicle/:vehicleId/complete-registration", protect, completeTokenRegistration);
rentorRouter.post("/vehicle/:vehicleId/sync-token-addresses", protect, syncVehicleTokenAddresses);
rentorRouter.get("/dashboard", protect, getDashboardData);
rentorRouter.post(
  "/update-image",
  upload.single("image"),
  protect,
  updateUserImage,
);

// Milestone document routes
rentorRouter.post(
  "/vehicle/:vehicleId/milestone-documents",
  protect,
  milestoneUpload.any(),
  uploadMilestoneDocuments,
);
rentorRouter.get("/vehicle/:vehicleId/milestone-documents", protect, getMilestoneDocuments);
rentorRouter.get("/vehicle-by-nft/:nftId", protect, getVehicleByNftId);

export default rentorRouter;
