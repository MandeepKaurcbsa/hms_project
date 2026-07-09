const Medicine = require("../models/medicineModel");
const MedicineRequest = require("../models/medicineRequestModel");

exports.createMedicineRequest = async (req, res) => {
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

        // Get logged-in pharmacist ID
        const requested_by = req.user.id;

        // Check required fields
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

        // Validate dates
        if (new Date(expiry_date) <= new Date(mfg_date)) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be later than manufacturing date."
            });
        }

        // Check if medicine already exists in Medicine collection
        const existingMedicine = await Medicine.findOne({
            medicine_name: medicine_name.trim()
        });

        if (existingMedicine) {
            return res.status(409).json({
                success: false,
                message: "Medicine already exists in the system."
            });
        }

        // Check if pharmacist already submitted the same pending request
        const existingRequest = await MedicineRequest.findOne({
            medicine_name: medicine_name.trim(),
            requested_by,
            status: "Pending"
        });

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                message: "You have already submitted this medicine for approval."
            });
        }

        // Create request
        const medicineRequest = await MedicineRequest.create({
            medicine_name: medicine_name.trim(),
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
            expiry_date,
            requested_by
        });

        return res.status(201).json({
            success: true,
            message: "Medicine request submitted successfully.",
            data: medicineRequest
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to submit medicine request.",
            error: error.message
        });

    }
};

exports.getMyMedicineRequests = async (req, res) => {
    try {

        // Logged-in pharmacist ID
        const pharmacistId = req.user.id;

        // Fetch all requests submitted by the pharmacist
        const medicineRequests = await MedicineRequest.find({
            requested_by: pharmacistId
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: medicineRequests.length,
            data: medicineRequests
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medicine requests.",
            error: error.message
        });

    }
};

exports.getSingleMedicineRequest = async (req, res) => {
    try {

        const { id } = req.params;

        // Find request by ID
        const medicineRequest = await MedicineRequest.findById(id);

        if (!medicineRequest) {
            return res.status(404).json({
                success: false,
                message: "Medicine request not found."
            });
        }

        // Admin can view any request
        if (req.user.role === "admin") {
            return res.status(200).json({
                success: true,
                data: medicineRequest
            });
        }

        // Pharmacist can view only their own request
        if (
            req.user.role === "pharmacist" &&
            medicineRequest.requested_by === req.user.id
        ) {
            return res.status(200).json({
                success: true,
                data: medicineRequest
            });
        }

        // Other roles or unauthorized pharmacists
        return res.status(403).json({
            success: false,
            message: "Access denied."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medicine request.",
            error: error.message
        });

    }
};

exports.getPendingMedicineRequests = async (req, res) => {
    try {

        const pendingRequests = await MedicineRequest.find({
            status: "Pending"
        })
        .select("-__v")
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: pendingRequests.length,
            data: pendingRequests
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending medicine requests.",
            error: error.message
        });

    }
};

exports.approveMedicineRequest = async (req, res) => {
    try {

        const { id } = req.params;

        // Find medicine request
        const medicineRequest = await MedicineRequest.findById(id);

        if (!medicineRequest) {
            return res.status(404).json({
                success: false,
                message: "Medicine request not found."
            });
        }

        // Request should be pending
        if (medicineRequest.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Medicine request has already been ${medicineRequest.status.toLowerCase()}.`
            });
        }

        // Check whether medicine already exists
        const existingMedicine = await Medicine.findOne({
            medicine_name: medicineRequest.medicine_name,
            strength: medicineRequest.strength
        });

        if (existingMedicine) {
            return res.status(409).json({
                success: false,
                message: "Medicine already exists in the system."
            });
        }

        // Create medicine
        const newMedicine = await Medicine.create({
            medicine_name: medicineRequest.medicine_name,
            generic_name: medicineRequest.generic_name,
            category: medicineRequest.category,
            manufacturer: medicineRequest.manufacturer,
            strength: medicineRequest.strength,
            unit: medicineRequest.unit,
            price: medicineRequest.price,
            stock_available: medicineRequest.stock_available,
            description: medicineRequest.description,
            medicine_image: medicineRequest.medicine_image,
            requires_prescription: medicineRequest.requires_prescription,
            mfg_date: medicineRequest.mfg_date,
            expiry_date: medicineRequest.expiry_date
        });

        // Update request status
        medicineRequest.status = "Approved";
        medicineRequest.approved_by = req.user.id;
        medicineRequest.reviewed_at = new Date();

        await medicineRequest.save();

        return res.status(200).json({
            success: true,
            message: "Medicine request approved successfully.",
            data: {
                request: medicineRequest,
                medicine: newMedicine
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to approve medicine request.",
            error: error.message
        });

    }
};

exports.rejectMedicineRequest = async (req, res) => {
    try {

        const { id } = req.params;
        const { rejection_reason } = req.body;

        // Find medicine request
        const medicineRequest = await MedicineRequest.findById(id);

        if (!medicineRequest) {
            return res.status(404).json({
                success: false,
                message: "Medicine request not found."
            });
        }

        // Request should be pending
        if (medicineRequest.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Medicine request has already been ${medicineRequest.status.toLowerCase()}.`
            });
        }

        // Update request
        medicineRequest.status = "Rejected";
        medicineRequest.rejection_reason = rejection_reason || "";
        medicineRequest.approved_by = req.user.id;
        medicineRequest.reviewed_at = new Date();

        await medicineRequest.save();

        return res.status(200).json({
            success: true,
            message: "Medicine request rejected successfully.",
            data: medicineRequest
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to reject medicine request.",
            error: error.message
        });

    }
};

exports.getAllMedicineRequests = async (req, res) => {
    try {

        const { status } = req.query;

        let filter = {};

        if (status) {
            filter.status = status;
        }

        const medicineRequests = await MedicineRequest.find(filter)
            .select("-__v")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: medicineRequests.length,
            data: medicineRequests
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medicine requests.",
            error: error.message
        });

    }
};