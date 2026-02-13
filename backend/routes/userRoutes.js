import express from "express";
import {
  getCars,
  getUserData,
  loginUser,
  registerUser,
  updateUserRole,
  getWalletNonce,
  verifyWalletSignature,
  bindWallet,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const userRouter = express.Router();

// Traditional auth
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/data", protect, getUserData);
userRouter.get("/cars", getCars);
userRouter.post("/update-role", protect, updateUserRole);

// Wallet authentication
userRouter.post("/wallet/nonce", getWalletNonce);
userRouter.post("/wallet/verify", verifyWalletSignature);
userRouter.post("/wallet/bind", protect, bindWallet);

export default userRouter;
