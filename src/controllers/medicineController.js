const Medicine = require("../models/medicineModel");

exports.createMedicine = async (req, res) => {
    try {

        const {
            medicine_name,
            generic_name,
            category,
            manufacturer,
            strength,
            unit,
            price,
            stock_available,
            description,
            medicine_image,
            requires_prescription,
            mfg_date,
            expiry_date
        } = req.body;

        // Required field validation
        if (
            !medicine_name ||
            !category ||
            !manufacturer ||
            !strength ||
            !unit ||
            price === undefined ||
            stock_available === undefined ||
            !mfg_date ||
            !expiry_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields."
            });
        }

        // Date validation
        if (new Date(expiry_date) <= new Date(mfg_date)) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be later than manufacturing date."
            });
        }

        // Duplicate medicine check
        const existingMedicine = await Medicine.findOne({
            medicine_name: medicine_name.trim(),
            strength: strength.trim(),
            manufacturer: manufacturer.trim()
        });

        if (existingMedicine) {
            return res.status(409).json({
                success: false,
                message: "Medicine already exists."
            });
        }

        // Create medicine
        const medicine = await Medicine.create({
            medicine_name: medicine_name.trim(),
            generic_name,
            category,
            manufacturer: manufacturer.trim(),
            strength: strength.trim(),
            unit,
            price,
            stock_available,
            description,
            medicine_image,
            requires_prescription,
            mfg_date,
            expiry_date
        });

        return res.status(201).json({
            success: true,
            message: "Medicine created successfully.",
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to create medicine.",
            error: error.message
        });

    }
};

exports.getAllMedicines = async (req, res) => {
    try {

        // Fetch all active medicines
        const medicines = await Medicine.find({
            status: "active"
        })
        .select("-__v")
        .sort({ medicine_name: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medicines.",
            error: error.message
        });

    }
};

exports.getSingleMedicine = async (req, res) => {
    try {

        const { id } = req.params;

        // Find active medicine by ID
        const medicine = await Medicine.findOne({
            _id: id,
            status: "active"
        }).select("-__v");

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medicine.",
            error: error.message
        });

    }
};

exports.searchMedicines = async (req, res) => {
    try {

        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: "Search keyword is required."
            });
        }

        const medicines = await Medicine.find({
            status: "active",
            $or: [
                {
                    medicine_name: {
                        $regex: keyword,
                        $options: "i"
                    }
                },
                {
                    generic_name: {
                        $regex: keyword,
                        $options: "i"
                    }
                },
                {
                    manufacturer: {
                        $regex: keyword,
                        $options: "i"
                    }
                }
            ]
        })
        .select("-__v")
        .sort({ medicine_name: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to search medicines.",
            error: error.message
        });

    }
};

exports.filterMedicines = async (req, res) => {
    try {

        const {
            category,
            manufacturer,
            requires_prescription,
            min_price,
            max_price
        } = req.query;

        // Base filter
        const filter = {
            status: "active"
        };

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Manufacturer filter
        if (manufacturer) {
            filter.manufacturer = {
                $regex: manufacturer,
                $options: "i"
            };
        }

        // Prescription filter
        if (requires_prescription !== undefined) {
            filter.requires_prescription = requires_prescription === "true";
        }

        // Price filter
        if (min_price || max_price) {
            filter.price = {};

            if (min_price) {
                filter.price.$gte = Number(min_price);
            }

            if (max_price) {
                filter.price.$lte = Number(max_price);
            }
        }

        const medicines = await Medicine.find(filter)
            .select("-__v")
            .sort({ medicine_name: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to filter medicines.",
            error: error.message
        });

    }
};

exports.updateMedicine = async (req, res) => {
    try {

        const { id } = req.params;

        const medicine = await Medicine.findById(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        const {
            medicine_name,
            generic_name,
            category,
            manufacturer,
            strength,
            unit,
            price,
            description,
            medicine_image,
            requires_prescription,
            mfg_date,
            expiry_date
        } = req.body;

        // Validate dates if both are provided
        const manufacturingDate = mfg_date || medicine.mfg_date;
        const expiryDate = expiry_date || medicine.expiry_date;

        if (new Date(expiryDate) <= new Date(manufacturingDate)) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be later than manufacturing date."
            });
        }

        // Duplicate check
        const duplicateMedicine = await Medicine.findOne({
            _id: { $ne: id },
            medicine_name: medicine_name || medicine.medicine_name,
            manufacturer: manufacturer || medicine.manufacturer,
            strength: strength || medicine.strength
        });

        if (duplicateMedicine) {
            return res.status(409).json({
                success: false,
                message: "Another medicine with the same name, manufacturer and strength already exists."
            });
        }

        // Update fields
        if (medicine_name) medicine.medicine_name = medicine_name.trim();
        if (generic_name !== undefined) medicine.generic_name = generic_name;
        if (category) medicine.category = category;
        if (manufacturer) medicine.manufacturer = manufacturer.trim();
        if (strength) medicine.strength = strength.trim();
        if (unit) medicine.unit = unit;
        if (price !== undefined) medicine.price = price;
        if (description !== undefined) medicine.description = description;
        if (medicine_image !== undefined) medicine.medicine_image = medicine_image;
        if (requires_prescription !== undefined) medicine.requires_prescription = requires_prescription;
        if (mfg_date) medicine.mfg_date = mfg_date;
        if (expiry_date) medicine.expiry_date = expiry_date;

        await medicine.save();

        return res.status(200).json({
            success: true,
            message: "Medicine updated successfully.",
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to update medicine.",
            error: error.message
        });

    }
};

exports.updateMedicineStock = async (req, res) => {
    try {

        const { id } = req.params;
        const { stock_available } = req.body;

        // Validate stock value
        if (stock_available === undefined || isNaN(stock_available)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid stock quantity."
            });
        }

        if (stock_available < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock cannot be negative."
            });
        }

        // Find medicine
        const medicine = await Medicine.findById(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        // Update stock
        medicine.stock_available = Number(stock_available);

        await medicine.save();

        return res.status(200).json({
            success: true,
            message: "Medicine stock updated successfully.",
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to update medicine stock.",
            error: error.message
        });

    }
};

exports.getLowStockMedicines = async (req, res) => {
    try {

        const medicines = await Medicine.find({
            status: "active",
            stock_available: { $gt: 0, $lte: 10 }
        })
        .select("-__v")
        .sort({ stock_available: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch low stock medicines.",
            error: error.message
        });

    }
};

exports.getOutOfStockMedicines = async (req, res) => {
    try {

        const medicines = await Medicine.find({
            status: "active",
            stock_available: 0
        })
        .select("-__v")
        .sort({ medicine_name: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch out of stock medicines.",
            error: error.message
        });

    }
};

exports.getExpiringMedicines = async (req, res) => {
    try {

        const today = new Date();

        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        const medicines = await Medicine.find({
            status: "active",
            expiry_date: {
                $gte: today,
                $lte: next30Days
            }
        })
        .select("-__v")
        .sort({ expiry_date: 1 });

        return res.status(200).json({
            success: true,
            count: medicines.length,
            data: medicines
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch expiring medicines.",
            error: error.message
        });

    }
};

exports.deactivateMedicine = async (req, res) => {
    try {

        const { id } = req.params;

        const medicine = await Medicine.findById(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        if (medicine.status === "inactive") {
            return res.status(400).json({
                success: false,
                message: "Medicine is already inactive."
            });
        }

        medicine.status = "inactive";

        await medicine.save();

        return res.status(200).json({
            success: true,
            message: "Medicine deactivated successfully.",
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate medicine.",
            error: error.message
        });

    }
};

exports.activateMedicine = async (req, res) => {
    try {

        const { id } = req.params;

        // Find medicine
        const medicine = await Medicine.findById(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found."
            });
        }

        // Check if already active
        if (medicine.status === "active") {
            return res.status(400).json({
                success: false,
                message: "Medicine is already active."
            });
        }

        // Activate medicine
        medicine.status = "active";

        await medicine.save();

        return res.status(200).json({
            success: true,
            message: "Medicine activated successfully.",
            data: medicine
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to activate medicine.",
            error: error.message
        });

    }
};