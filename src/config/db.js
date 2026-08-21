const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("MongoDB Connected (Atlas)");

        // DROP THE STALE 'user_id_1' BACKGROUND INDEX
        try {
            await mongoose.connection.db.collection("users").dropIndex("user_id_1");
            console.log(" Old plugin index 'user_id_1' successfully dropped from database!");
        } catch (indexError) {
            console.log(" Index 'user_id_1' already dropped or not found.");
        }

    } catch (error) {
        console.log("DB Atlas Error:", error.message);
        try {
            console.log("Attempting local MongoDB connection...");
            await mongoose.connect("mongodb://127.0.0.1:27017/Medipulse", { serverSelectionTimeoutMS: 5000 });
            console.log("MongoDB Connected (Local Fallback)");
        } catch (localError) {
            console.log("Local DB Error:", localError.message);
        }
    }
};

module.exports = connectDB;
