const Cart = require("../models/cartModel");
const Medicine = require("../models/medicineModel");

const CART_WARNINGS = require("../utils/constants/cartWarnings");

async function validateCart(user_id) {

    const cart = await Cart.findOne({ user_id });

    if (!cart) {

        return {

            success: false,
            message: "Cart not found."

        };

    }

    const selectedItems = cart.items.filter(item => item.is_selected);

    if (selectedItems.length === 0) {

        return {

            success: true,

            can_checkout: false,

            issues_count: 1,

            validated_items: 0,

            grand_total: 0,

            issues: [

                {

                    code: "NO_ITEMS_SELECTED",

                    severity: "warning",

                    message: "Please select at least one medicine."

                }

            ]

        };

    }

    const medicineIds = selectedItems.map(item => item.medicine_id);

    const medicines = await Medicine.find({

        _id: { $in: medicineIds }

    });

    const medicineMap = new Map();

    medicines.forEach(medicine => {

        medicineMap.set(medicine._id.toString(), medicine);

    });

    const issues = [];

    let grandTotal = 0;

    for (const item of selectedItems) {

        const medicine = medicineMap.get(item.medicine_id.toString());

        if (!medicine) {

            issues.push({

                medicine_id: item.medicine_id,

                code: CART_WARNINGS.MEDICINE_REMOVED,

                severity: "error",

                message: "Medicine no longer exists."

            });

            continue;

        }

        if (medicine.status !== "active") {

            issues.push({

                medicine_id: medicine._id,

                code: CART_WARNINGS.INACTIVE_MEDICINE,

                severity: "error",

                message: "Medicine is currently unavailable."

            });

        }

        if (medicine.stock_available === 0) {

            issues.push({

                medicine_id: medicine._id,

                code: CART_WARNINGS.OUT_OF_STOCK,

                severity: "error",

                message: "Medicine is out of stock."

            });

        }

        if (item.quantity > medicine.stock_available) {

            issues.push({

                medicine_id: medicine._id,

                code: CART_WARNINGS.INSUFFICIENT_STOCK,

                severity: "warning",

                message: `Only ${medicine.stock_available} unit(s) available.`

            });

        }

        if (item.price_at_added !== medicine.price) {

            issues.push({

                medicine_id: medicine._id,

                code: CART_WARNINGS.PRICE_CHANGED,

                severity: "info",

                old_price: item.price_at_added,

                new_price: medicine.price,

                message: `Price updated from ₹${item.price_at_added} to ₹${medicine.price}.`

            });

        }

        /*
        ===========================================
        Prescription Validation
        (Future Implementation)
        ===========================================

        if (medicine.requires_prescription) {

            Validate uploaded prescription.

        }

        */

        grandTotal += medicine.price * item.quantity;

    }

    return {

        success: true,

        can_checkout: issues.length === 0,

        issues_count: issues.length,

        validated_items: selectedItems.length,

        grand_total: grandTotal,

        issues

    };

}

module.exports = validateCart;