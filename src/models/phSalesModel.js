//this model stores the sales record in the database

const mongoose = require("mongoose");

const phSalesSchema = new mongoose.Schema({
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true 
    },
    pharmacist_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Pharmacist",
        required : true 
    },
    medicine_id : {
        type :mongoose.Schema.Types.ObjectId,
        ref : "Medicine",
        required : true 
    },
    medicine_quantity : {  //no of medicine in the cart
        type : Number,
        required : true 
    },
    product_quantity : {    //no of medical product in the cart
        type : Number,
        required : true
    },
    total_price : {
        type : Number,
        required : true 
    },
    sales_date : {
        type : Date,
        required : true 
    },
},{
    timestamps : true 
});

module.exports = mongoose.model("PhSales", phSalesSchema);