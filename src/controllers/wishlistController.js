const Wishlist = require("../models/wishlistModel");
const Medicine = require("../models/medicineModel");

// Get logged-in user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;

        const wishlist = await Wishlist.findOne({ user_id });

        if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
            return res.status(200).json({
                success: true,
                total_items: 0,
                medicine_ids: [],
                wishlist: []
            });
        }

        const medicineIds = wishlist.items.map(item => item.medicine_id);

        const medicines = await Medicine.find({
            _id: { $in: medicineIds }
        });

        const medicineMap = new Map();
        medicines.forEach(med => {
            medicineMap.set(med._id.toString(), med);
        });

        const formattedItems = [];
        const validMedicineIds = [];

        wishlist.items.forEach(item => {
            const med = medicineMap.get(item.medicine_id.toString());
            if (med) {
                validMedicineIds.push(item.medicine_id);
                formattedItems.push({
                    medicine_id: item.medicine_id,
                    added_at: item.added_at,
                    medicine: {
                        _id: med._id,
                        medicine_name: med.medicine_name,
                        generic_name: med.generic_name,
                        category: med.category,
                        manufacturer: med.manufacturer,
                        strength: med.strength,
                        unit: med.unit,
                        price: med.price,
                        stock_available: med.stock_available,
                        description: med.description,
                        medicine_image: med.medicine_image,
                        requires_prescription: med.requires_prescription,
                        status: med.status
                    }
                });
            }
        });

        return res.status(200).json({
            success: true,
            total_items: formattedItems.length,
            medicine_ids: validMedicineIds,
            wishlist: formattedItems
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist.",
            error: error.message
        });
    }
};

// Toggle medicine in wishlist (Add if absent, Remove if present)
exports.toggleWishlistItem = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { medicine_id } = req.body;

        if (!medicine_id) {
            return res.status(400).json({
                success: false,
                message: "Medicine ID is required."
            });
        }

        const medicine = await Medicine.findById(medicine_id);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        let wishlist = await Wishlist.findOne({ user_id });

        if (!wishlist) {
            wishlist = new Wishlist({
                user_id,
                items: []
            });
        }

        const existingIndex = wishlist.items.findIndex(
            item => item.medicine_id.toString() === medicine_id.toString()
        );

        let in_wishlist = false;
        let message = "";

        if (existingIndex > -1) {
            // Remove
            wishlist.items.splice(existingIndex, 1);
            in_wishlist = false;
            message = "Medicine removed from wishlist.";
        } else {
            // Add
            wishlist.items.push({
                medicine_id,
                added_at: new Date()
            });
            in_wishlist = true;
            message = "Medicine added to wishlist.";
        }

        await wishlist.save();

        return res.status(200).json({
            success: true,
            message,
            in_wishlist,
            total_items: wishlist.items.length,
            medicine_id
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update wishlist.",
            error: error.message
        });
    }
};

// Add medicine to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { medicine_id } = req.body;

        if (!medicine_id) {
            return res.status(400).json({
                success: false,
                message: "Medicine ID is required."
            });
        }

        const medicine = await Medicine.findById(medicine_id);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        let wishlist = await Wishlist.findOne({ user_id });

        if (!wishlist) {
            wishlist = new Wishlist({
                user_id,
                items: []
            });
        }

        const exists = wishlist.items.some(
            item => item.medicine_id.toString() === medicine_id.toString()
        );

        if (!exists) {
            wishlist.items.push({
                medicine_id,
                added_at: new Date()
            });
            await wishlist.save();
        }

        return res.status(200).json({
            success: true,
            message: "Medicine added to wishlist successfully.",
            total_items: wishlist.items.length,
            medicine_id
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to add medicine to wishlist.",
            error: error.message
        });
    }
};

// Remove medicine from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { medicine_id } = req.params;

        const wishlist = await Wishlist.findOne({ user_id });

        if (!wishlist) {
            return res.status(200).json({
                success: true,
                message: "Wishlist is empty.",
                total_items: 0
            });
        }

        wishlist.items = wishlist.items.filter(
            item => item.medicine_id.toString() !== medicine_id.toString()
        );

        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: "Medicine removed from wishlist.",
            total_items: wishlist.items.length,
            medicine_id
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to remove medicine from wishlist.",
            error: error.message
        });
    }
};

// Clear entire wishlist
exports.clearWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;

        const wishlist = await Wishlist.findOne({ user_id });

        if (wishlist) {
            wishlist.items = [];
            await wishlist.save();
        }

        return res.status(200).json({
            success: true,
            message: "Wishlist cleared successfully.",
            total_items: 0
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to clear wishlist.",
            error: error.message
        });
    }
};
