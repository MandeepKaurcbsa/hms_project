const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // DROP THE STALE 'user_id_1' BACKGROUND INDEX
        try {
            await mongoose.connection.db.collection("users").dropIndex("user_id_1");
            console.log(" Old plugin index 'user_id_1' successfully dropped from database!");
        } catch (indexError) {
            // This prevents the application from crashing if the index is already deleted
            console.log(" Index 'user_id_1' already dropped or not found.");
        }

    } catch (error) {
        console.log("DB Error", error);
        process.exit(1);     // Stops app if db fails 
    }
};

module.exports = connectDB;
