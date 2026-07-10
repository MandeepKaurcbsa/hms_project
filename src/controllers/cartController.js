const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Medicine = require("../models/medicineModel");
const CART_WARNINGS = require("../utils/constants/cartWarnings");
const CART_STATUS = require("../utils/constants/cartStatus"); 
const validateCart = require("../services/cartValidationService");
const PhSales = require("../models/phSalesModel");

/// Add medicine to cart
exports.addMedicineToCart = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { medicine_id, quantity } = req.body;

        // Validate input
        if (!medicine_id || !quantity) {

            return res.status(400).json({
                success: false,
                message: "Medicine ID and quantity are required."
            });

        }

        if (quantity <= 0) {

            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0."
            });

        }

        // Check medicine exists
        const medicine = await Medicine.findById(medicine_id);

        if (!medicine) {

            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });

        }

        // Check medicine status
        if (medicine.status !== "active") {

            return res.status(400).json({
                success: false,
                message: "This medicine is currently unavailable."
            });

        }

        // Check stock
        if (quantity > medicine.stock_available) {

            return res.status(400).json({
                success: false,
                message: `Only ${medicine.stock_available} units are available.`
            });

        }

        /*
        =====================================================
        Prescription Validation (Future Implementation)

        if (medicine.requires_prescription) {

            // Check if user has uploaded a valid prescription.

            // If not, return error.

        }
        =====================================================
        */

        // Find user's cart
        let cart = await Cart.findOne({ user_id });

        // Create cart if it doesn't exist
        if (!cart) {

            cart = new Cart({

                user_id,

                items: []

            });

        }

        // Check if medicine already exists in cart
        const existingMedicine = cart.items.find(

            item => item.medicine_id.toString() === medicine_id.toString()

        );

        // Medicine already exists
        if (existingMedicine) {

            const newQuantity = existingMedicine.quantity + quantity;

            if (newQuantity > medicine.stock_available) {

                return res.status(400).json({

                    success: false,

                    message: `Only ${medicine.stock_available} units are available.`

                });

            }

            // Increase quantity only
            existingMedicine.quantity = newQuantity;

            // DO NOT update price_at_added
            // existingMedicine.price_at_added = medicine.price;

        }

        // Medicine not present in cart
        else {

            cart.items.push({

                medicine_id,

                quantity,

                price_at_added: medicine.price,

                is_selected: true,

                added_at: new Date()

            });

        }

        await cart.save();

        return res.status(200).json({

            success: true,

            message: "Medicine added to cart successfully.",

            medicine_id,

    quantity: existingMedicine
        ? existingMedicine.quantity
        : quantity


        });

    }

    catch (error) { 

        return res.status(500).json({

            success: false,

            message: "Failed to add medicine to cart.",

            error: error.message

        });

    }

};


// Get logged-in user's cart
exports.getMyCart = async (req, res) => {

    try {

        const user_id = req.user.id;

        // Find user's cart
        const cart = await Cart.findOne({ user_id });

        if (!cart) {

    return res.status(200).json({
        success: true,
        total_items: 0,
        total_quantity: 0,
        grand_total: 0,
        can_checkout: false,
        issues_count: 0,
        cart_status: CART_STATUS.HEALTHY,
        cart_warning: null,
        cart: []
    });

}

        // Get all medicine ids
        const medicineIds = cart.items.map(item => item.medicine_id);

        // Fetch all medicines in one query
        const medicines = await Medicine.find({
            _id: { $in: medicineIds }
        });

        // Create lookup map
        const medicineMap = new Map();

        medicines.forEach(medicine => {
            medicineMap.set(medicine._id.toString(), medicine);
        });

        let totalQuantity = 0;
        let grandTotal = 0;

        // Determines whether checkout button should be enabled
        let canCheckout = true;
        let issuesCount = 0;
        let cartWarning = null;
        let cartStatus = CART_STATUS.HEALTHY;
        const cartItems = [];

        for (const item of cart.items) {

            const medicine = medicineMap.get(item.medicine_id.toString());

            // Medicine deleted
            if (!medicine) {

               canCheckout = false;
               issuesCount++;

                cartItems.push({

                    medicine_id: item.medicine_id,

                    quantity: item.quantity,

                    is_available: false,

                    is_deleted: false,

                    is_out_of_stock: false,

                    can_checkout: false,

                    subtotal: 0,

                    warning : {

    code: CART_WARNINGS.MEDICINE_REMOVED,

     severity: "error",

    message: "Medicine no longer exists."

}

                });

                continue;

            }

            let warning = null;

            let itemCanCheckout = true;

            // Medicine inactive
            if (medicine.status !== "active") {

                warning = {

    code: CART_WARNINGS.INACTIVE_MEDICINE,

     severity: "error",

    message: "Medicine is currently unavailable."

};

                itemCanCheckout = false;

                canCheckout = false;
                issuesCount++;


            }

            // Out of stock
            else if (medicine.stock_available === 0) {

                warning = {

    code: CART_WARNINGS.OUT_OF_STOCK,

     severity: "error",

    message: "Medicine is out of stock."

};
                itemCanCheckout = false;

                canCheckout = false;
                issuesCount++;


            }

            // Quantity exceeds stock
            else if (item.quantity > medicine.stock_available) {

                warning = {

    code: CART_WARNINGS.INSUFFICIENT_STOCK,

     severity: "warning",

    message: `Only ${medicine.stock_available} unit(s) available.`

};
                itemCanCheckout = false;

                canCheckout = false;
                issuesCount++;
                 

            }
// TODO:
// Check whether the user has uploaded
// a valid prescription for this medicine.
// This validation will be added after
// the Prescription module is implemented.

if (!warning && medicine.requires_prescription) {

    warning = {

        code: CART_WARNINGS.PRESCRIPTION_REQUIRED,

         severity: "warning",

        message: "Upload a valid prescription."

    };

    itemCanCheckout = false;
    canCheckout = false;
    issuesCount++;

}

            const subtotal = medicine.price * item.quantity;

            totalQuantity += item.quantity;

if(itemCanCheckout){

    grandTotal += subtotal;

}
            cartItems.push({

                medicine_id: medicine._id,

                medicine_name: medicine.medicine_name,

                generic_name: medicine.generic_name,

                category: medicine.category,

                manufacturer: medicine.manufacturer,

                strength: medicine.strength,

                unit: medicine.unit,

                medicine_image: medicine.medicine_image,

                status : medicine.status,

                stock_available: medicine.stock_available,

                quantity: item.quantity,

                price: medicine.price,

                subtotal,

                requires_prescription: medicine.requires_prescription,

                added_at: item.added_at,

                is_selected: item.is_selected,

                is_available: medicine.status === "active" &&
                              medicine.stock_available > 0,

                is_out_of_stock: medicine.stock_available === 0,

                can_checkout: itemCanCheckout,

                warning : warning 

            });

        }

        if (issuesCount > 0) {

    cartStatus = CART_STATUS.ATTENTION_REQUIRED;

    cartWarning = {

        code: CART_WARNINGS.CART_HAS_ISSUES,

         severity: "warning",

        message: `${issuesCount} item(s) in your cart require attention before checkout.`

    };

}
        return res.status(200).json({

    success: true,

    total_items: cartItems.length,

    total_quantity: totalQuantity,

    grand_total: grandTotal,

    can_checkout: canCheckout,

    issues_count: issuesCount,

    cart_status: cartStatus,

    cart_warning: cartWarning,

    cart: cartItems

});

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch cart.",

            error: error.message

        });

    }

};

// Increase medicine quantity
exports.increaseQuantity = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { medicine_id } = req.params;

        // Find user's cart
        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({

                success: false,
                message: "Cart not found."

            });

        }

        // Find medicine inside cart
        const cartItem = cart.items.find(
            item => item.medicine_id.toString() === medicine_id
        );

        if (!cartItem) {

            return res.status(404).json({

                success: false,
                message: "Medicine not found in cart."

            });

        }

        // Check medicine exists
        const medicine = await Medicine.findById(medicine_id);

        if (!medicine) {

            return res.status(404).json({

                success: false,

                warning: {

                    code: CART_WARNINGS.MEDICINE_REMOVED,
                    severity: "error",
                    message: "Medicine no longer exists."

                }

            });

        }

        // Medicine inactive
        if (medicine.status !== "active") {

            return res.status(400).json({

                success: false,

                warning: {

                    code: CART_WARNINGS.INACTIVE_MEDICINE,
                    severity: "error",
                    message: "Medicine is currently unavailable."

                }

            });

        }

        // Out of stock
        if (medicine.stock_available === 0) {

            return res.status(400).json({

                success: false,

                warning: {

                    code: CART_WARNINGS.OUT_OF_STOCK,
                    severity: "error",
                    message: "Medicine is out of stock."

                }

            });

        }

        // Quantity exceeds stock
        if (cartItem.quantity >= medicine.stock_available) {

            return res.status(400).json({

                success: false,

                warning: {

                    code: CART_WARNINGS.INSUFFICIENT_STOCK,
                    severity: "warning",
                    message: `Only ${medicine.stock_available} unit(s) available.`

                }

            });

        }

        // Increase quantity
        cartItem.quantity += 1;

        await cart.save();

        return res.status(200).json({

            success: true,
            message: "Medicine quantity increased successfully.",

            medicine_id: medicine._id,
            quantity: cartItem.quantity,
            price: medicine.price,
            subtotal: cartItem.quantity * medicine.price

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to increase quantity.",
            error: error.message

        });

    }

};

// Decrease medicine quantity
exports.decreaseQuantity = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { medicine_id } = req.params;

        // Find user's cart
        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({
                success: false,
                message: "Cart not found."
            });

        }

        // Find medicine in cart
        const cartItemIndex = cart.items.findIndex(
            item => item.medicine_id.toString() === medicine_id
        );

        if (cartItemIndex === -1) {

            return res.status(404).json({
                success: false,
                message: "Medicine not found in cart."
            });

        }

        const cartItem = cart.items[cartItemIndex];

        // If quantity is 1, remove the medicine
        if (cartItem.quantity === 1) {

            cart.items.splice(cartItemIndex, 1);

            await cart.save();

            return res.status(200).json({

                success: true,
                message: "Medicine removed from cart.",
                medicine_id

            });

        }

        const Medicine = require("../models/medicineModel");

const medicine = await Medicine.findById(medicine_id);

if (!medicine) {

    return res.status(404).json({
        success: false,
        message: "Medicine no longer exists."
    });

}

        // Otherwise decrease quantity
        cartItem.quantity -= 1;

        await cart.save();

        return res.status(200).json({

            success: true,
            message: "Medicine quantity decreased successfully.",

            medicine_id,
            quantity: cartItem.quantity,
subtotal: cartItem.quantity * medicine.price
        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to decrease quantity.",
            error: error.message

        });

    }

};

// Remove medicine from cart
exports.removeMedicineFromCart = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { medicine_id } = req.params;

        // Find user's cart
        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({
                success: false,
                message: "Cart not found."
            });

        }

        // Find medicine index
        const cartItemIndex = cart.items.findIndex(
            item => item.medicine_id.toString() === medicine_id
        );

        if (cartItemIndex === -1) {

            return res.status(404).json({
                success: false,
                message: "Medicine not found in cart."
            });

        }

        // Remove medicine
        cart.items.splice(cartItemIndex, 1);

        await cart.save();

        return res.status(200).json({

            success: true,
            message: "Medicine removed from cart successfully."

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to remove medicine from cart.",
            error: error.message

        });

    }

};

// Clear entire cart
exports.clearCart = async (req, res) => {

    try {

        const user_id = req.user.id;

        // Find user's cart
        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({

                success: false,
                message: "Cart not found."

            });

        }

        // Clear all items
        cart.items = [];

        await cart.save();

        return res.status(200).json({

            success: true,
            message: "Cart cleared successfully."

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to clear cart.",
            error: error.message

        });

    }

};

// Select / Unselect a cart item
exports.toggleCartItemSelection = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { medicine_id } = req.params;

        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({

                success: false,
                message: "Cart not found."

            });

        }

        const cartItem = cart.items.find(
            item => item.medicine_id.toString() === medicine_id
        );

        if (!cartItem) {

            return res.status(404).json({

                success: false,
                message: "Medicine not found in cart."

            });

        }

        // Toggle selection
        cartItem.is_selected = !cartItem.is_selected;

        await cart.save();

        return res.status(200).json({

            success: true,
            message: cartItem.is_selected
                ? "Medicine selected successfully."
                : "Medicine unselected successfully.",

            medicine_id,

            is_selected: cartItem.is_selected

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to update cart item selection.",
            error: error.message

        });

    }

};

// Select / Unselect all cart items
exports.toggleAllCartItems = async (req, res) => {

    try {

        const user_id = req.user.id;
        const { is_selected } = req.body;

        if (typeof is_selected !== "boolean") {

            return res.status(400).json({

                success: false,
                message: "is_selected must be either true or false."

            });

        }

        const cart = await Cart.findOne({ user_id });

        if (!cart) {

            return res.status(404).json({

                success: false,
                message: "Cart not found."

            });

        }

        if (cart.items.length === 0) {

            return res.status(400).json({

                success: false,
                message: "Your cart is empty."

            });

        }

        // Update selection status of every item
        cart.items.forEach(item => {

            item.is_selected = is_selected;

        });

        await cart.save();

        return res.status(200).json({

            success: true,

            message: is_selected
                ? "All cart items selected successfully."
                : "All cart items unselected successfully.",

            total_items: cart.items.length,

            is_selected

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to update cart items.",
            error: error.message

        });

    }

};

exports.validateCart = async (req, res) => {

    try {

        const user_id = req.user.id;

        const result = await validateCart(user_id);

        if (!result.success) {

            return res.status(404).json(result);

        }

        return res.status(200).json(result);

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to validate cart.",

            error: error.message

        });

    }

};


// Checkout selected medicines
exports.checkoutCart = async (req, res) => {

    try {

        const session = await mongoose.startSession();

session.startTransaction();

        const user_id = req.user.id;

        // Validate cart first
        const validationResult = await validateCart(user_id);

        if (!validationResult.success) {

            return res.status(404).json(validationResult);

        }

        if (!validationResult.can_checkout) {

            return res.status(400).json(validationResult);

        }

        // Get user's cart
const cart = await Cart.findOne({ user_id }).session(session);
        const selectedItems = cart.items.filter(item => item.is_selected);

        const saleItems = [];

        let totalQuantity = 0;
        let totalPrice = 0;

        // Process every selected medicine
        for (const item of selectedItems) {

            const medicine = await Medicine.findById(item.medicine_id);

            const subtotal = medicine.price * item.quantity;

            // Reduce stock
            await Medicine.findOneAndUpdate(
    {
        _id: item.medicine_id,
        stock_available: { $gte: item.quantity }
    },
    {
        $inc: {
            stock_available: -item.quantity
        }
    },
    {
        new: true,
        session
    }
);

            saleItems.push({

                medicine_id: medicine._id,

                medicine_name: medicine.medicine_name,

                quantity: item.quantity,

                price: medicine.price,

                subtotal

            });

            totalQuantity += item.quantity;

            totalPrice += subtotal;

        }

        /*
        ===========================================
        Pharmacist Assignment

        For now, pharmacist_id is hardcoded.

        Later:
        - Auto assign pharmacist
        - Logged-in pharmacist
        - Branch wise pharmacist

        ===========================================
        */

        const sale = await PhSales.create(

            [{ user_id,

            pharmacist_id: "PHR001",

            items: saleItems,

            total_items: saleItems.length,

            total_quantity: totalQuantity,

            total_price: totalPrice,

            sold_at: new Date()

        }],
    {session}
);

        // Remove purchased medicines from cart
        cart.items = cart.items.filter(item => !item.is_selected);

await cart.save({ session });

await session.commitTransaction();

session.endSession();

        return res.status(200).json({

            success: true,

            message: "Checkout completed successfully.",

            sale

        });

    }

    catch (error) {

        await session.abortTransaction();

session.endSession();

        return res.status(500).json({

            success: false,

            message: "Checkout failed.",

            error: error.message

        });

    }

};

