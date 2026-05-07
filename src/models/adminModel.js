//admin model

const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    fullname : {
        type : String,
        required : true,
        trim : true 
    },
    email : {
        type : String,
        required : true,
        trim : true,
        unique : true,
        lowercase : true 
    },
    password : {
        type : String,
        required : true
    },
    phone : {
        type : Number,
        required : true 
    },
},{
    timestamps : true
});

module.exports = mongoose.model("Admin", adminSchema);