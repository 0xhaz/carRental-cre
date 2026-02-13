# Admin User Setup Guide

This guide explains how to set up and use the admin panel for RegShield.

## 🔐 Admin Role Features

The admin user has access to:
- **KYC Management** - Review and approve/reject user verification documents
- **User Management** - View all registered users
- **Vehicle Management** - Monitor all listed vehicles
- **Booking Management** - Oversee all bookings
- **Platform Statistics** - View overall platform metrics

## 📋 Step 1: Create Admin User

### Option A: Using the Script (Recommended)

From the project root directory, run:

```bash
cd backend
npm run create-admin
```

This will create an admin user with these credentials:
- **Email:** `admin@regshield.com`
- **Password:** `Admin@123456`
- **Role:** `admin`

⚠️ **IMPORTANT:** Change the password immediately after first login!

### Option B: Manual MongoDB Update

If you already have a user account and want to make it admin:

1. Connect to MongoDB using MongoDB Compass or CLI
2. Find your user in the `users` collection
3. Update the user document:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  {
    $set: {
      role: "admin",
      "compliance.kycVerified": true,
      "compliance.accreditedInvestor": true
    }
  }
)
```

## 🚀 Step 2: Access Admin Panel

1. **Login** to the website with admin credentials
2. **Navigate** to `/admin` in your browser
3. You'll see the admin dashboard

### Admin Routes

- `/admin` - Dashboard with platform overview
- `/admin/kyc` - KYC verification management
- `/admin/users` - User management (coming soon)
- `/admin/vehicles` - Vehicle management (coming soon)
- `/admin/bookings` - Booking management (coming soon)

## 👤 Admin User Permissions

The admin layout (`/frontend/app/admin/layout.tsx`) automatically:
- ✅ Checks if user is authenticated
- ✅ Verifies user role is "admin"
- ✅ Redirects non-admin users to homepage
- ✅ Shows loading state during verification

Only users with `role === "admin"` can access the admin panel.

## 📄 KYC Management

### How KYC Review Works

1. **Pending Submissions** - View all users who submitted KYC documents
2. **Review Details** - Click "Review" to see:
   - User information (name, email, wallet address)
   - Personal information (full name, DOB, nationality, address)
   - Business information (for rentors)
   - Investor information (for investors)
   - Uploaded documents (Government ID, Proof of Address)
3. **Approve/Reject**:
   - **Approve** - User's `compliance.kycVerified` becomes `true`
   - **Reject** - Provide a reason, user can resubmit

### Document Storage

KYC documents are stored in two places:
- **Files**: `/backend/uploads/kyc/` (filesystem)
- **Metadata**: MongoDB `kyc` collection (filename, URL, size, etc.)

Supported formats: **JPEG, JPG, PNG, PDF** (max 10MB per file)

## 🔧 Backend API Endpoints

All admin routes require:
1. Valid JWT token (`Authorization` header)
2. User role must be `admin`

### KYC Endpoints

```
GET  /api/kyc/pending        - Get all pending KYC submissions
GET  /api/kyc/:id            - Get KYC details by ID
POST /api/kyc/:id/approve    - Approve KYC
POST /api/kyc/:id/reject     - Reject KYC (requires reason)
```

### Protected by Middleware

```javascript
import { protect, admin } from "../middleware/auth.js";

kycRouter.get("/pending", protect, admin, getPendingKYC);
kycRouter.post("/:id/approve", protect, admin, approveKYC);
```

## 🛡️ Security

- ✅ Admin routes protected by `admin` middleware
- ✅ Frontend admin layout checks user role
- ✅ JWT token required for all admin API calls
- ✅ Non-admin users redirected automatically
- ✅ Passwords hashed with bcrypt (10 salt rounds)

## 🧪 Testing Admin Access

1. **Create admin user** (run the script)
2. **Login** with admin credentials
3. **Navigate** to `/admin/kyc`
4. Create a test user and submit KYC
5. Review and approve/reject the submission

## 📊 Admin Dashboard Features

### Current Features
- Platform statistics (pending KYC, total users, vehicles, bookings)
- Quick action cards for common tasks
- System status indicators
- Recent activity feed

### Coming Soon
- User management interface
- Vehicle approval system
- Booking oversight tools
- Revenue analytics

## 🔄 Future Enhancements

- [ ] Multi-admin support with different permission levels
- [ ] Audit log for admin actions
- [ ] Email notifications for KYC approval/rejection
- [ ] Bulk KYC approval/rejection
- [ ] Document viewer integrated in modal
- [ ] Advanced search and filtering

## ⚠️ Important Notes

1. **Change Default Password**: The default admin password is `Admin@123456`. Change it immediately after first login.
2. **Secure Storage**: KYC documents contain sensitive information. Ensure the `/backend/uploads/kyc/` directory has proper permissions.
3. **Backup**: Regularly backup the MongoDB database and uploaded documents.
4. **HTTPS**: Always use HTTPS in production for admin panel access.

## 📞 Support

For issues or questions about the admin panel, contact the development team.

---

**Last Updated:** 2026-02-12
**Version:** 1.0.0
