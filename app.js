//setup for middleware and routes 

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

//load env variables 
dotenv.config();

//connects to database
connectDB();
const cors = require("cors");
const app = express();

//middleware
app.use(cors());
app.use(express.json());

//user routes
const userRoute = require("./src/routes/userRoute");
app.use("/user", userRoute);

//admin route
const adminRoute = require("./src/routes/adminRoute");
app.use("/admin", adminRoute);

const doctorRoutes = require("./src/routes/doctorRoute");
app.use("/doctor", doctorRoutes);

const appointmentRoutes = require("./src/routes/appointRoute");
app.use("/appointment", appointmentRoutes);

const patientRoutes = require("./src/routes/patientRoute");
app.use("/patient", patientRoutes);

const pharmacistRoutes = require("./src/routes/pharmacistRoute");
app.use("/pharmacist", pharmacistRoutes);

const chatbotRoutes = require("./src/routes/chatbotRoute");
app.use("/api/chatbot", chatbotRoutes);
const medicineRequestRoutes = require("./src/routes/medicineRequestRoute");
app.use("/med-req", medicineRequestRoutes);

const medicineRoutes = require("./src/routes/medicineRoute");
app.use("/medicine", medicineRoutes);

const medicineRecordRoutes = require("./src/routes/medicalRecordRoute");
app.use("/med-rec", medicineRecordRoutes);

const cartRoutes = require("./src/routes/cartRoute");
app.use("/cart", cartRoutes);

const phsalesRoutes = require("./src/routes/phSalesRoute");
app.use("/sale", phsalesRoutes);

const prescriptionRoutes = require("./src/routes/prescriptionRoute");
app.use("/prescription", prescriptionRoutes);

const paymentRoutes = require("./src/routes/paymentRoute");
app.use("/api/payment", paymentRoutes);

//basic test route
app.get("/", (req, res) => {
    res.send("Api is running...");
});

//global error handler
app.use((err, req, res, next) => {
    res.status(500).json({
        message: err.message
    });
});

module.exports = app;

