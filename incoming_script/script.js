// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5050;

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- MongoDB Atlas Connection -----------------
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://nebuladestroyer:nebuladestroyer@cluster0.xa2gu2k.mongodb.net/prash?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log(" Connected to MongoDB Atlas"))
.catch((err) => console.error(" MongoDB Connection Error:", err));

// ----------------- Schema & Model -----------------
const ShiftSchema = new mongoose.Schema({
    employee_id: String,
    name: String,
    shift_start: String,
    shift_end: String,
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
    monday: [ShiftSchema],
    tuesday: [ShiftSchema],
    wednesday: [ShiftSchema],
    thursday: [ShiftSchema],
    friday: [ShiftSchema],
    saturday: [ShiftSchema],
    sunday: [ShiftSchema],
}, { timestamps: true });

// Use the exact collection name 'mycoll' from MongoDB
const Schedule = mongoose.model("Schedule", ScheduleSchema, "mycoll");

// ----------------- Routes -----------------

// Root route
app.get("/", (req, res) => {
    res.send("API is running...");
});

// Get all schedules
app.get("/api/schedules", async (req, res) => {
    try {
        const schedules = await Schedule.find();
        res.json(schedules);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ----------------- Start Server -----------------
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});