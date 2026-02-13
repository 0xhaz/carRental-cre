/**
 * Signature Verification Utility
 * For production: Verify wallet signatures on the backend
 *
 * IMPORTANT: This requires 'viem' package
 * Install: npm install viem
 */

import { verifyMessage, recoverAddress } from "viem";

/**
 * Verify that a signature was created by a specific wallet address
 *
 * @param {string} walletAddress - The wallet address that supposedly signed the message
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature to verify
 * @returns {Promise<boolean>} - True if signature is valid, false otherwise
 */
export async function verifyWalletSignature(walletAddress, message, signature) {
  try {
    // Normalize address to lowercase for comparison
    const normalizedAddress = walletAddress.toLowerCase();

    // Method 1: Verify message directly
    const isValid = await verifyMessage({
      address: normalizedAddress,
      message,
      signature,
    });

    if (isValid) {
      return true;
    }

    // Method 2: Recover address from signature and compare
    // (useful if verifyMessage fails in some edge cases)
    const recoveredAddress = await recoverAddress({
      message,
      signature,
    });

    return recoveredAddress.toLowerCase() === normalizedAddress;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Verify signature with nonce format
 * This is the format used by our wallet authentication system
 *
 * @param {string} walletAddress - The wallet address
 * @param {string} nonce - The nonce that was included in the message
 * @param {string} signature - The signature
 * @returns {Promise<boolean>} - True if valid
 */
export async function verifyNonceSignature(walletAddress, nonce, signature) {
  const message = `Sign this message to authenticate with RegShield:\n\nNonce: ${nonce}`;
  return verifyWalletSignature(walletAddress, message, signature);
}

/**
 * Example usage in userController.js:
 *
 * import { verifyNonceSignature } from "../utils/verifySignature.js";
 *
 * export const verifyWalletSignature = async (req, res) => {
 *   try {
 *     const { walletAddress, signature, name, role } = req.body;
 *
 *     // ... get nonce from store ...
 *
 *     // VERIFY SIGNATURE ON BACKEND
 *     const isValid = await verifyNonceSignature(
 *       walletAddress,
 *       nonceData.nonce,
 *       signature
 *     );
 *
 *     if (!isValid) {
 *       return res.json({
 *         success: false,
 *         message: "Invalid signature"
 *       });
 *     }
 *
 *     // ... rest of authentication logic ...
 *   }
 * }
 */

export default {
  verifyWalletSignature,
  verifyNonceSignature,
};
