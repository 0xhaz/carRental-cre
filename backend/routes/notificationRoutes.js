import express from "express";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const notificationRouter = express.Router();

notificationRouter.get("/", protect, getUserNotifications);
notificationRouter.post("/mark-read/:notificationId", protect, markAsRead);
notificationRouter.post("/mark-all-read", protect, markAllAsRead);
notificationRouter.delete("/:notificationId", protect, deleteNotification);
notificationRouter.post("/create", protect, createNotification);

export default notificationRouter;
