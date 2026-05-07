// this model stores different types of medicine and their stock availability in the app.

const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
    medicine_name : {
        type : String,
        required : true,
        trim : true 
    },
    price : {
        type : Number,
        required : true 
    },
    stock_available : {
        type : Number,
        required : true
    },
    mfg_date : {
        type : Date,
        required : true
    },
    expiry_date : {
        type : Date,
        required : true 
    },
},{
    timestamps : true 
});

module.exports = mongoose.model("Medicine", medicineSchema);