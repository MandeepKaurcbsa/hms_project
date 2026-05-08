//setup for middleware and routes 

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

//load env variables 
dotenv.config();

//connects to database
connectDB();

const app = express();
 
//middleware
app.use(express.json());

//user routes
const userRoute = require("./src/routes/userRoute");
app.use("/user", userRoute);

//admin route
const adminRoute = require("./src/routes/adminRoute");
app.use("/admin", adminRoute);

//basic test route
app.get("/", (req, res) => {
    res.send("Api is running...");
});

//global error handler
app.use((err, req, res, next) => {
    res.status(500).json({
        message : err.message
    });
});

module.exports = app;

