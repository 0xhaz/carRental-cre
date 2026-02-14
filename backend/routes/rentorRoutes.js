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
} from "../controllers/rentorController.js";
import upload from "../middleware/multer.js";

const rentorRouter = express.Router();

// API endpoints for rentor can be defined here
rentorRouter.post("/change-role", protect, changeRoleToRentor);
rentorRouter.post("/add-car", protect, addCar);
rentorRouter.post("/update-car/:carId", protect, updateCar);
rentorRouter.get("/cars", protect, getRentorCars);
rentorRouter.get("/vehicle/:vehicleId", protect, getVehicleById);
rentorRouter.post("/toggle-car", protect, toggleCarAvailability);
rentorRouter.post("/delete-car", protect, deleteCar);
rentorRouter.get("/dashboard", protect, getDashboardData);
rentorRouter.post(
  "/update-image",
  upload.single("image"),
  protect,
  updateUserImage,
);

export default rentorRouter;
