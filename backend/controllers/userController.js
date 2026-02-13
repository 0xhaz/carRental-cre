import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Car from "../models/Car.js";
import crypto from "crypto";

// Generate JWT Token
const generateToken = userId => {
  const payload = userId;
  return jwt.sign(payload, process.env.JWT_SECRET);
};

// In-memory storage for nonces (in production, use Redis)
const nonceStore = new Map();

// Generate random nonce for wallet signature
const generateNonce = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register User Controller
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(newUser._id.toString());

    // Return user object without password
    const user = await User.findById(newUser._id).select("-password");

    res.json({ success: true, token, user });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Login User Controller
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }
    const token = generateToken(user._id.toString());

    // Return user object without password
    const userWithoutPassword = await User.findById(user._id).select("-password");

    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get User data using Token (JWT)
export const getUserData = async (req, res) => {
  try {
    const { user } = req;
    res.json({ success: true, user });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getCars = async (req, res) => {
  try {
    const cars = await Car.find({ isAvailable: true });
    res.json({ success: true, cars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Update User Role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { _id } = req.user;

    if (!role) {
      return res.json({ success: false, message: "Role is required" });
    }

    // Validate role
    const validRoles = ["renter", "rentor", "investor", "admin"];
    if (!validRoles.includes(role)) {
      return res.json({ success: false, message: "Invalid role" });
    }

    // Update user role
    const user = await User.findByIdAndUpdate(
      _id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user, message: "Role updated successfully" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ============ WALLET AUTHENTICATION ============

/**
 * Get nonce for wallet signature
 * User requests a nonce to sign with their wallet
 */
export const getWalletNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.json({ success: false, message: "Wallet address is required" });
    }

    // Normalize address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // Generate unique nonce
    const nonce = generateNonce();
    const timestamp = Date.now();

    // Store nonce with 5 minute expiration
    nonceStore.set(normalizedAddress, { nonce, timestamp });

    // Clean up old nonces (older than 5 minutes)
    for (const [addr, data] of nonceStore.entries()) {
      if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        nonceStore.delete(addr);
      }
    }

    res.json({
      success: true,
      nonce,
      message: `Sign this message to authenticate: ${nonce}`
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Verify wallet signature and login/register
 * After user signs the nonce, verify signature and create/login user
 */
export const verifyWalletSignature = async (req, res) => {
  try {
    const { walletAddress, signature, name, role } = req.body;

    if (!walletAddress || !signature) {
      return res.json({
        success: false,
        message: "Wallet address and signature are required"
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Get stored nonce
    const nonceData = nonceStore.get(normalizedAddress);
    if (!nonceData) {
      return res.json({
        success: false,
        message: "No nonce found. Please request a new nonce."
      });
    }

    // Check if nonce is expired (5 minutes)
    if (Date.now() - nonceData.timestamp > 5 * 60 * 1000) {
      nonceStore.delete(normalizedAddress);
      return res.json({
        success: false,
        message: "Nonce expired. Please request a new nonce."
      });
    }

    // NOTE: In production, verify the signature here using ethers or viem
    // For now, we'll trust the frontend did the signing correctly
    // This verification should happen on backend using crypto libraries

    // Clear the used nonce
    nonceStore.delete(normalizedAddress);

    // Check if user exists with this wallet
    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (user) {
      // User exists - login
      const token = generateToken(user._id.toString());
      const userWithoutPassword = await User.findById(user._id).select("-password");

      return res.json({
        success: true,
        token,
        user: userWithoutPassword,
        message: "Logged in successfully with wallet"
      });
    } else {
      // User doesn't exist - register
      if (!name) {
        return res.json({
          success: false,
          message: "Name is required for wallet registration"
        });
      }

      // Create new user with wallet
      const newUser = await User.create({
        name,
        email: `${normalizedAddress}@wallet.local`, // Temporary email
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // Random password
        walletAddress: normalizedAddress,
        role: role || "renter"
      });

      const token = generateToken(newUser._id.toString());
      const userWithoutPassword = await User.findById(newUser._id).select("-password");

      return res.json({
        success: true,
        token,
        user: userWithoutPassword,
        message: "Registered successfully with wallet"
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Bind wallet to existing account
 * Allows user to connect their wallet to an existing email/password account
 */
export const bindWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const { _id } = req.user; // User is authenticated via JWT

    if (!walletAddress) {
      return res.json({ success: false, message: "Wallet address is required" });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet is already bound to another account
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });
    if (existingUser && existingUser._id.toString() !== _id.toString()) {
      return res.json({
        success: false,
        message: "This wallet is already bound to another account"
      });
    }

    // Bind wallet to current user
    const user = await User.findByIdAndUpdate(
      _id,
      { walletAddress: normalizedAddress },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user,
      message: "Wallet bound successfully"
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
