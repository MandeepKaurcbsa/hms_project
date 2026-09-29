const Medicine = require("../models/medicineModel");
const MedicineRequest = require("../models/medicineRequestModel");
const Pharmacist = require("../models/pharmacistModel");

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

        // Check if pharmacist already submitted the same pending request
        const existingRequest = await MedicineRequest.findOne({
            medicine_name: medicine_name.trim(),
            strength: strength.trim(),
            requested_by,
            status: "Pending"
        });

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                message: "You have already submitted a pending stock request for this medicine."
            });
        }

        // Upload base64 image to Cloudinary if provided
        let imageUrl = medicine_image || '';
        if (imageUrl && imageUrl.startsWith('data:')) {
            if (imageUrl.startsWith('data:application/octet-stream')) {
                imageUrl = imageUrl.replace('data:application/octet-stream', 'data:image/jpeg');
            }
            try {
                const cloudinary = require("../config/cloudinary");
                const result = await cloudinary.uploader.upload(imageUrl, {
                    folder: 'medipulse/medicine_requests'
                });
                imageUrl = result.secure_url;
            } catch (e) {
                console.error("Cloudinary upload error in createMedicineRequest:", e.message);
            }
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
            medicine_image: imageUrl,
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
        .populate("requested_by", "first_name last_name pharmacy_name email phone")
        .select("-__v")
        .lean()
        .sort({ createdAt: -1 });

        const phIds = [...new Set(pendingRequests.map(r => r.requested_by).filter(id => id && typeof id === 'string'))];
        if (phIds.length > 0) {
            const pharmacists = await Pharmacist.find({ _id: { $in: phIds } }).select("first_name last_name pharmacy_name email phone").lean();
            const phMap = {};
            pharmacists.forEach(p => { phMap[p._id] = p; });
            pendingRequests.forEach(reqObj => {
                if (!reqObj.requested_by || typeof reqObj.requested_by === 'string') {
                    if (phMap[reqObj.requested_by]) {
                        reqObj.requested_by = phMap[reqObj.requested_by];
                    }
                }
            });
        }

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

        // Check whether medicine already exists in inventory
        let medicineObj;
        const escapedName = medicineRequest.medicine_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingMedicine = await Medicine.findOne({
            medicine_name: { $regex: new RegExp('^' + escapedName.replace(/\s+/g, '\\s*') + '$', 'i') }
        });

        if (existingMedicine) {
            existingMedicine.stock_available = (existingMedicine.stock_available || 0) + (medicineRequest.stock_available || 0);
            if (medicineRequest.price) existingMedicine.price = medicineRequest.price;
            if (medicineRequest.medicine_image) existingMedicine.medicine_image = medicineRequest.medicine_image;
            await existingMedicine.save();
            medicineObj = existingMedicine;
        } else {
            // Create new medicine
            medicineObj = await Medicine.create({
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
        }

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
                medicine: medicineObj
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
            .populate("requested_by", "first_name last_name pharmacy_name email phone")
            .select("-__v")
            .lean()
            .sort({ createdAt: -1 });

        const phIds = [...new Set(medicineRequests.map(r => r.requested_by).filter(id => id && typeof id === 'string'))];
        if (phIds.length > 0) {
            const pharmacists = await Pharmacist.find({ _id: { $in: phIds } }).select("first_name last_name pharmacy_name email phone").lean();
            const phMap = {};
            pharmacists.forEach(p => { phMap[p._id] = p; });
            medicineRequests.forEach(reqObj => {
                if (!reqObj.requested_by || typeof reqObj.requested_by === 'string') {
                    if (phMap[reqObj.requested_by]) {
                        reqObj.requested_by = phMap[reqObj.requested_by];
                    }
                }
            });
        }

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

exports.cancelMedicineRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellation_reason } = req.body;
        const pharmacistId = req.user.id;

        const medicineRequest = await MedicineRequest.findById(id);

        if (!medicineRequest) {
            return res.status(404).json({
                success: false,
                message: "Medicine request not found."
            });
        }

        if (medicineRequest.requested_by !== pharmacistId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only cancel your own stock requests."
            });
        }

        if (medicineRequest.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel request with status "${medicineRequest.status}". Only pending requests can be cancelled.`
            });
        }

        medicineRequest.status = "Cancelled";
        medicineRequest.cancellation_reason = cancellation_reason || "Cancelled by pharmacist";
        medicineRequest.cancelled_at = new Date();

        await medicineRequest.save();

        return res.status(200).json({
            success: true,
            message: "Medicine request cancelled successfully.",
            data: medicineRequest
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to cancel medicine request.",
            error: error.message
        });
    }
};

exports.updateMedicineRequest = async (req, res) => {
    try {
        const { id } = req.params;
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
            expiry_date,
            status
        } = req.body;

        const medicineRequest = await MedicineRequest.findById(id);

        if (!medicineRequest) {
            return res.status(404).json({
                success: false,
                message: "Medicine request not found."
            });
        }

        // Permission check: Pharmacist can update their own pending requests, Admin can update any
        if (req.user.role === "pharmacist") {
            if (medicineRequest.requested_by !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only update your own stock requests."
                });
            }
            if (medicineRequest.status !== "Pending") {
                return res.status(400).json({
                    success: false,
                    message: `Cannot update request with status "${medicineRequest.status}". Only pending requests can be updated.`
                });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        // Validate dates if updated
        const checkMfg = mfg_date || medicineRequest.mfg_date;
        const checkExp = expiry_date || medicineRequest.expiry_date;
        if (checkMfg && checkExp && new Date(checkExp) <= new Date(checkMfg)) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be later than manufacturing date."
            });
        }

        if (medicine_name !== undefined) medicineRequest.medicine_name = medicine_name.trim();
        if (generic_name !== undefined) medicineRequest.generic_name = generic_name ? generic_name.trim() : "";
        if (category !== undefined) medicineRequest.category = category;
        if (manufacturer !== undefined) medicineRequest.manufacturer = manufacturer.trim();
        if (strength !== undefined) medicineRequest.strength = strength.trim();
        if (unit !== undefined) medicineRequest.unit = unit;
        if (price !== undefined) medicineRequest.price = Number(price);
        if (stock_available !== undefined) medicineRequest.stock_available = Number(stock_available);
        if (description !== undefined) medicineRequest.description = description;
        if (medicine_image !== undefined) {
            let reqImg = medicine_image;
            if (reqImg && reqImg.startsWith('data:')) {
                if (reqImg.startsWith('data:application/octet-stream')) {
                    reqImg = reqImg.replace('data:application/octet-stream', 'data:image/jpeg');
                }
                try {
                    const cloudinary = require("../config/cloudinary");
                    const result = await cloudinary.uploader.upload(reqImg, {
                        folder: 'medipulse/medicine_requests'
                    });
                    reqImg = result.secure_url;
                } catch (e) {
                    console.error("Cloudinary upload error in updateMedicineRequest:", e.message);
                }
            }
            medicineRequest.medicine_image = reqImg;
        }
        if (requires_prescription !== undefined) medicineRequest.requires_prescription = Boolean(requires_prescription);
        if (mfg_date !== undefined) medicineRequest.mfg_date = mfg_date;
        if (expiry_date !== undefined) medicineRequest.expiry_date = expiry_date;

        if (req.user.role === "admin" && status !== undefined) {
            medicineRequest.status = status;
        }

        await medicineRequest.save();

        // If the request is Approved (or matching medicine exists in inventory), sync updates to the Medicine inventory item as well
        const escapedReqName = medicineRequest.medicine_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const medicineObj = await Medicine.findOne({
            medicine_name: { $regex: new RegExp('^' + escapedReqName.replace(/\s+/g, '\\s*') + '$', 'i') }
        });
            if (medicineObj) {
                if (medicine_name !== undefined) medicineObj.medicine_name = medicine_name.trim();
                if (generic_name !== undefined) medicineObj.generic_name = generic_name ? generic_name.trim() : "";
                if (category !== undefined) medicineObj.category = category;
                if (manufacturer !== undefined) medicineObj.manufacturer = manufacturer.trim();
                if (strength !== undefined) medicineObj.strength = strength.trim();
                if (unit !== undefined) medicineObj.unit = unit;
                if (price !== undefined) medicineObj.price = Number(price);
                if (stock_available !== undefined) medicineObj.stock_available = Number(stock_available);
                if (description !== undefined) medicineObj.description = description;
                if (medicine_image !== undefined) medicineObj.medicine_image = medicineRequest.medicine_image;
                if (requires_prescription !== undefined) medicineObj.requires_prescription = Boolean(requires_prescription);
                if (mfg_date !== undefined) medicineObj.mfg_date = mfg_date;
                if (expiry_date !== undefined) medicineObj.expiry_date = expiry_date;
                await medicineObj.save();
            }

        return res.status(200).json({
            success: true,
            message: "Medicine request updated successfully.",
            data: medicineRequest
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update medicine request.",
            error: error.message
        });
    }
};