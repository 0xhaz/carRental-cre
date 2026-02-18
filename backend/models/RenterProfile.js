/**
 * Renter Profile Model
 * Stores renter personal information and driver's license details
 */

import mongoose from "mongoose";

const renterProfileSchema = new mongoose.Schema(
  {
    // User reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Personal Information
    personalInfo: {
      fullName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
    },

    // Address
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "USA",
      },
    },

    // Driver's License
    driverLicense: {
      number: {
        type: String,
        required: true,
      },
      expiryDate: {
        type: Date,
        required: true,
      },
      issuingState: {
        type: String,
        required: true,
      },
      frontImage: {
        filename: String,
        url: String,
        uploadedAt: Date,
      },
      backImage: {
        filename: String,
        url: String,
        uploadedAt: Date,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Insurance
    insurance: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Age verification (must be 21+)
    age: {
      type: Number,
    },
    meetsAgeRequirement: {
      type: Boolean,
      default: false,
    },

    // Booking History Summary
    totalBookings: {
      type: Number,
      default: 0,
    },
    completedBookings: {
      type: Number,
      default: 0,
    },
    cancelledBookings: {
      type: Number,
      default: 0,
    },

    // Payment Preferences
    preferredPaymentMethod: {
      type: String,
      enum: ["offline", "bank_transfer", "crypto"],
    },

    // Saved Bank Details (optional, encrypted in production)
    savedBankDetails: {
      bankName: String,
      accountNumber: String, // Should be encrypted
      accountName: String,
    },

    // Saved Crypto Wallet (optional)
    savedWalletAddress: String,
  },
  {
    timestamps: true,
  }
);

// Calculate age from date of birth
renterProfileSchema.pre("save", function () {
  if (this.personalInfo.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.age = age;
    this.meetsAgeRequirement = age >= 21;
  }
});

// Check if license is expired
renterProfileSchema.methods.isLicenseExpired = function () {
  if (!this.driverLicense.expiryDate) return true;
  return new Date() > new Date(this.driverLicense.expiryDate);
};

// Static method to get profile by user ID
renterProfileSchema.statics.getByUser = function (userId) {
  return this.findOne({ user: userId }).populate("user", "name email");
};

const RenterProfile = mongoose.model("RenterProfile", renterProfileSchema);

export default RenterProfile;
