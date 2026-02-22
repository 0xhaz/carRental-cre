import cron from "node-cron";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";

/**
 * Update booking statuses based on pickup/return dates
 * - confirmed → active when current date >= pickupDate
 * - active → completed when current date >= returnDate
 */
async function updateBookingStatuses() {
  try {
    const now = new Date();
    let updatedCount = 0;

    // 1. Find confirmed bookings that should be active (pickup date has passed)
    const bookingsToActivate = await Booking.find({
      status: "confirmed",
      pickupDate: { $lte: now },
    }).populate("user", "name email");

    for (const booking of bookingsToActivate) {
      booking.status = "active";
      await booking.save();
      updatedCount++;

      // Notify renter that rental has started
      await Notification.create({
        userId: booking.user._id || booking.user,
        type: "booking_active",
        title: "Rental Started",
        message: `Your rental has started. Please remember to return the vehicle by ${booking.returnDate.toLocaleDateString()}.`,
        link: `/renter/booking/${booking._id}`,
        metadata: {
          bookingId: booking._id.toString(),
          vehicleId: booking.car?.toString(),
        },
      });

      console.log(`[BookingScheduler] Booking ${booking._id} activated`);
    }

    // 2. Find active bookings that should be completed (return date has passed)
    const bookingsToComplete = await Booking.find({
      status: "active",
      returnDate: { $lte: now },
    }).populate("user", "name email");

    for (const booking of bookingsToComplete) {
      booking.status = "completed";
      await booking.save();
      updatedCount++;

      // Notify renter that rental is completed and they can leave a review
      await Notification.create({
        userId: booking.user._id || booking.user,
        type: "booking_completed",
        title: "Rental Completed",
        message: "Your rental has been completed! Please leave a review to help other renters.",
        link: `/renter/booking/${booking._id}`,
        metadata: {
          bookingId: booking._id.toString(),
          vehicleId: booking.car?.toString(),
        },
      });

      console.log(`[BookingScheduler] Booking ${booking._id} completed`);
    }

    if (updatedCount > 0) {
      console.log(`[BookingScheduler] Updated ${updatedCount} booking(s)`);
    }
  } catch (error) {
    console.error("[BookingScheduler] Error updating booking statuses:", error);
  }
}

/**
 * Start the booking status monitoring scheduler.
 * Runs every 15 minutes to check for status updates.
 */
export function startBookingScheduler() {
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    console.log("[BookingScheduler] Running booking status check...");
    updateBookingStatuses();
  });

  // Also run once on startup (after a short delay to let DB connect)
  setTimeout(() => {
    console.log("[BookingScheduler] Running initial booking status check...");
    updateBookingStatuses();
  }, 5000);

  console.log("[BookingScheduler] Booking status scheduler started (runs every 15 minutes)");
}
