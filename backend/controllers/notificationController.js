import Notification from "../models/Notification.js";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 notifications

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   POST /api/notifications/mark-read/:notificationId
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   POST /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:notificationId
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await notification.deleteOne();

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create notification (internal use)
// @route   POST /api/notifications/create
// @access  Private (Admin/System)
export const createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, link, metadata } = req.body;

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      metadata,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
