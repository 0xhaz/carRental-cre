import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import rentorRouter from "./routes/rentorRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import investmentRouter from "./routes/investmentRoutes.js";

// Initialize Express app
const app = express();

// Connect to Database
await connectDB();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));
app.use("/api/user", userRouter);
app.use("/api/rentor", rentorRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/investments", investmentRouter);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
