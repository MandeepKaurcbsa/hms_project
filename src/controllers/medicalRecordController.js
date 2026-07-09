const MedicalRecord = require("../models/medicalRecordModel");
const Appointment = require("../models/appointModel");
const Patient = require("../models/patientModel");

// --------------------------------------doctor side ------------------------------------------

exports.createMedicalRecord = async (req, res) => {
    try {

        const doctor_id = req.user.id;

        const {
            patient_id,
            appointment_id,
            diagnosis,
            symptoms,
            prescription,
            medicines_prescribed,
            test_result,
            doctor_notes,
            follow_up_date,
            visit_date
        } = req.body;

        // Required field validation
        if (
            !patient_id ||
            !appointment_id ||
            !diagnosis ||
            !symptoms ||
            !visit_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields."
            });
        }

        // Check appointment exists
        const appointment = await Appointment.findById(appointment_id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        // Verify doctor
        if (appointment.doctor_id !== doctor_id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to create a medical record for this appointment."
            });
        }

        // Verify patient
        if (appointment.patient_id !== patient_id) {
            return res.status(400).json({
                success: false,
                message: "Patient does not belong to this appointment."
            });
        }

        // Appointment must be completed
        if (appointment.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Medical record can only be created after the appointment is completed."
            });
        }

        // Check duplicate record
        const existingRecord = await MedicalRecord.findOne({
            appointment_id
        });

        if (existingRecord) {
            return res.status(409).json({
                success: false,
                message: "Medical record already exists for this appointment."
            });
        }

        // Create record
        const medicalRecord = await MedicalRecord.create({
            patient_id,
            doctor_id,
            appointment_id,
            diagnosis,
            symptoms,
            prescription,
            medicines_prescribed,
            test_result,
            doctor_notes,
            follow_up_date,
            visit_date
        });

        // Update appointment
        appointment.prescription_added = true;
        await appointment.save();

        return res.status(201).json({
            success: true,
            message: "Medical record created successfully.",
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to create medical record.",
            error: error.message
        });

    }
};

exports.getMyMedicalRecords = async (req, res) => {
    try {

        const doctor_id = req.user.id;

        const medicalRecords = await MedicalRecord.find({
            doctor_id
        })
        .populate("patient_id", "first_name last_name gender")
        .populate("appointment_id", "appointment_date appointment_time")
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: medicalRecords.length,
            data: medicalRecords
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical records.",
            error: error.message
        });

    }
};

exports.getSingleMedicalRecord = async (req, res) => {
    try {

        const { id } = req.params;
        const doctor_id = req.user.id;

        // Find medical record
        const medicalRecord = await MedicalRecord.findById(id)
            .populate("patient_id", "first_name last_name gender date_of_birth")
            .populate("appointment_id")
            .populate("medicines_prescribed.medicine_id", "medicine_name strength category");

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found."
            });
        }

        // Check ownership
        if (medicalRecord.doctor_id !== doctor_id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this medical record."
            });
        }

        return res.status(200).json({
            success: true,
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical record.",
            error: error.message
        });

    }
};

exports.updateMedicalRecord = async (req, res) => {
    try {

        const { id } = req.params;
        const doctor_id = req.user.id;

        const {
            diagnosis,
            symptoms,
            prescription,
            medicines_prescribed,
            test_result,
            doctor_notes,
            follow_up_date,
            visit_date
        } = req.body;

        // Find medical record
        const medicalRecord = await MedicalRecord.findById(id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found."
            });
        }

        // Authorization
        if (medicalRecord.doctor_id !== doctor_id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this medical record."
            });
        }

        // Validate follow-up date
        if (
            follow_up_date &&
            visit_date &&
            new Date(follow_up_date) < new Date(visit_date)
        ) {
            return res.status(400).json({
                success: false,
                message: "Follow-up date cannot be before visit date."
            });
        }

        // Update only provided fields
        if (diagnosis !== undefined)
            medicalRecord.diagnosis = diagnosis;

        if (symptoms !== undefined)
            medicalRecord.symptoms = symptoms;

        if (prescription !== undefined)
            medicalRecord.prescription = prescription;

        if (medicines_prescribed !== undefined)
            medicalRecord.medicines_prescribed = medicines_prescribed;

        if (test_result !== undefined)
            medicalRecord.test_result = test_result;

        if (doctor_notes !== undefined)
            medicalRecord.doctor_notes = doctor_notes;

        if (follow_up_date !== undefined)
            medicalRecord.follow_up_date = follow_up_date;

        if (visit_date !== undefined)
            medicalRecord.visit_date = visit_date;

        await medicalRecord.save();

        return res.status(200).json({
            success: true,
            message: "Medical record updated successfully.",
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to update medical record.",
            error: error.message
        });

    }
};

// --------------------patient side ----------------------------------------------------------

exports.getMyMedicalRecords = async (req, res) => {
    try {

        const user_id = req.user.id;
        const { patient_id } = req.query;

        // Find all patients belonging to the logged-in user
        const patients = await Patient.find({ user_id });

        if (patients.length === 0) {
            return res.status(200).json({
                success: true,
                count : 0,
                data : []
            });
        }

        // Get all patient IDs
        const patientIds = patients.map(patient => patient._id);

        let filter = {};

        // If patient_id is passed, verify ownership
        if (patient_id) {

            if (!patientIds.includes(patient_id)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to view this patient's medical records."
                });
            }

            filter.patient_id = patient_id;

        } else {

            // Fetch records of all patients belonging to the user
            filter.patient_id = { $in: patientIds };

        }

        // Fetch medical records
        const medicalRecords = await MedicalRecord.find(filter)
            .populate("doctor_id", "first_name last_name specialization")
            .populate("appointment_id", "appointment_date appointment_time consult_mode")
            .sort({ visit_date: -1 });

        return res.status(200).json({
            success: true,
            count: medicalRecords.length,
            data: medicalRecords
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical records.",
            error: error.message
        });

    }
};

exports.getSingleMyMedicalRecord = async (req, res) => {
    try {

        const user_id = req.user.id;
        const { id } = req.params;

        // Find all patients of logged-in user
        const patients = await Patient.find({ user_id });

        const patientIds = patients.map(patient => patient._id);

        // Find medical record
        const medicalRecord = await MedicalRecord.findById(id)
            .populate("doctor_id", "first_name last_name specialization")
            .populate("appointment_id", "appointment_date appointment_time consult_mode")
            .populate("medicines_prescribed.medicine_id", "medicine_name strength category");

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found."
            });
        }

        // Check ownership
        if (!patientIds.includes(medicalRecord.patient_id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this medical record."
            });
        }

        return res.status(200).json({
            success: true,
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical record.",
            error: error.message
        });

    }
};

// -----------------------------------admin side ---------------------------------------------

exports.getAllMedicalRecords = async (req, res) => {
    try {

        const medicalRecords = await MedicalRecord.find()
            .populate("patient_id", "first_name last_name gender")
            .populate("doctor_id", "first_name last_name specialization")
            .populate("appointment_id", "appointment_date appointment_time consult_mode")
            .populate("medicines_prescribed.medicine_id", "medicine_name strength category")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: medicalRecords.length,
            data: medicalRecords
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch medical records.",
            error: error.message
        });

    }
};

exports.archiveMedicalRecord = async (req, res) => {
    try {

        const { id } = req.params;

        const medicalRecord = await MedicalRecord.findById(id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found."
            });
        }

        if (medicalRecord.record_status === "Archived") {
            return res.status(400).json({
                success: false,
                message: "Medical record is already archived."
            });
        }

        medicalRecord.record_status = "Archived";

        await medicalRecord.save();

        return res.status(200).json({
            success: true,
            message: "Medical record archived successfully.",
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to archive medical record.",
            error: error.message
        });

    }
};

exports.restoreMedicalRecord = async (req, res) => {
    try {

        const { id } = req.params;

        // Find medical record
        const medicalRecord = await MedicalRecord.findById(id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found."
            });
        }

        // Check if already active
        if (medicalRecord.record_status === "Active") {
            return res.status(400).json({
                success: false,
                message: "Medical record is already active."
            });
        }

        // Restore record
        medicalRecord.record_status = "Active";

        await medicalRecord.save();

        return res.status(200).json({
            success: true,
            message: "Medical record restored successfully.",
            data: medicalRecord
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to restore medical record.",
            error: error.message
        });

    }
};

