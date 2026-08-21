const Prescription = require("../models/prescriptionModel");
const Appointment = require("../models/appointModel");
const MedicalRecord = require("../models/medicalRecordModel");
const Medicine = require("../models/medicineModel");
const Patient = require("../models/patientModel");

// --------------------------------doctor side -----------------------------------------------------

// Create Prescription
exports.createPrescription = async (req, res) => {

    try {

        const doctor_id = req.user.id;

        const {

            appointment_id,
            medical_record_id,
            patient_id,
            medicines,
            general_instructions,
            follow_up_date

        } = req.body;

        // Validate required fields
        if (
            !appointment_id ||
            !medical_record_id ||
            !patient_id ||
            !medicines ||
            medicines.length === 0
        ) {

            return res.status(400).json({

                success: false,
                message: "All required fields must be provided."

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

        // Check prescription already exists
        const existingPrescription = await Prescription.findOne({

            appointment_id

        });

        if (existingPrescription) {

            return res.status(400).json({

                success: false,
                message: "Prescription already exists for this appointment."

            });

        }

        // Check medical record exists
        const medicalRecord = await MedicalRecord.findById(medical_record_id);

        if (!medicalRecord) {

            return res.status(404).json({

                success: false,
                message: "Medical record not found."

            });

        }

        const prescriptionMedicines = [];

        // Validate every medicine
        for (const item of medicines) {

            const medicine = await Medicine.findById(item.medicine_id);

            if (!medicine) {

                return res.status(404).json({

                    success: false,
                    message: `Medicine not found: ${item.medicine_id}`

                });

            }

            if (medicine.status !== "active") {

                return res.status(400).json({

                    success: false,
                    message: `${medicine.medicine_name} is currently unavailable.`

                });

            }

            prescriptionMedicines.push({

                medicine_id: medicine._id,

                medicine_name: medicine.medicine_name,

                generic_name: medicine.generic_name,

                strength: medicine.strength,

                dosage: item.dosage,

                frequency: item.frequency,

                duration: item.duration,

                quantity: item.quantity,

                instructions: item.instructions || ""

            });

        }

        let normalizedFollowUpDate = null;
        if (follow_up_date && typeof follow_up_date === "string" && follow_up_date.trim() !== "") {
            normalizedFollowUpDate = new Date(follow_up_date);
        } else if (follow_up_date instanceof Date) {
            normalizedFollowUpDate = follow_up_date;
        }

        const prescription = await Prescription.create({

            appointment_id,

            medical_record_id,

            patient_id,

            doctor_id,

            medicines: prescriptionMedicines,

            general_instructions,

            follow_up_date: normalizedFollowUpDate

        });

        // Update appointment
        appointment.prescription_added = true;

        await appointment.save();

        return res.status(201).json({

            success: true,

            message: "Prescription created successfully.",

            prescription

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to create prescription.",

            error: error.message

        });

    }

};


// Get logged-in doctor's prescriptions
exports.getMyPrescriptions = async (req, res) => {

    try {

        const doctor_id = req.user.id;

        const prescriptions = await Prescription.find({

            doctor_id

        })
        .populate("patient_id", "first_name last_name age gender phone email address blood_group")
        .populate("appointment_id")
        .populate("medical_record_id")
        .sort({

            prescribed_date: -1

        });

        return res.status(200).json({

            success: true,

            total_prescriptions: prescriptions.length,

            prescriptions

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch prescriptions.",

            error: error.message

        });

    }

};


// Get prescription by appointment_id
exports.getPrescriptionByAppointment = async (req, res) => {
    try {
        const { appointment_id } = req.params;

        const prescription = await Prescription.findOne({ appointment_id })
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name gender age blood_group phone email address")
            .populate("appointment_id")
            .populate("medical_record_id");

        if (prescription) {
            return res.status(200).json({
                success: true,
                prescription
            });
        }

        // Fallback: Check if a MedicalRecord exists for this appointment
        const medicalRecord = await MedicalRecord.findOne({ appointment_id })
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name gender age blood_group phone email address")
            .populate("appointment_id")
            .populate("medicines_prescribed.medicine_id", "medicine_name strength category");

        if (medicalRecord) {
            const formattedPrescription = {
                _id: medicalRecord._id,
                appointment_id: medicalRecord.appointment_id,
                medical_record_id: medicalRecord._id,
                patient_id: medicalRecord.patient_id,
                doctor_id: medicalRecord.doctor_id,
                medicines: (medicalRecord.medicines_prescribed || []).map(m => ({
                    medicine_id: m.medicine_id?._id || m.medicine_id,
                    medicine_name: m.medicine_id?.medicine_name || 'Prescribed Medicine',
                    strength: m.medicine_id?.strength || '',
                    dosage: m.dosage || '',
                    frequency: m.duration || '',
                    duration: m.duration || '',
                    instructions: ''
                })),
                general_instructions: medicalRecord.doctor_notes || medicalRecord.prescription || '',
                follow_up_date: medicalRecord.follow_up_date,
                prescribed_date: medicalRecord.visit_date || medicalRecord.createdAt,
                status: 'completed',
                diagnosis: medicalRecord.diagnosis,
                symptoms: medicalRecord.symptoms
            };

            return res.status(200).json({
                success: true,
                prescription: formattedPrescription,
                isMedicalRecordFallback: true
            });
        }

        return res.status(404).json({
            success: false,
            message: "Prescription or consultation record not found for this appointment."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch prescription details.",
            error: error.message
        });
    }
};

// Get single prescription
exports.getPrescriptionDetails = async (req, res) => {

    try {

        const { prescription_id } = req.params;

        const prescription = await Prescription.findById(prescription_id)
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name gender age blood_group phone email address")
            .populate("appointment_id")
            .populate("medical_record_id");

        if (!prescription) {

            return res.status(404).json({

                success: false,

                message: "Prescription not found."

            });

        }

        // Doctor can view only own prescriptions
        if (
            req.user.role === "doctor" &&
            prescription.doctor_id !== req.user.id
        ) {

            return res.status(403).json({

                success: false,

                message: "Access denied."

            });

        }

        // Patient(User) can view only prescriptions
// belonging to their own patient profiles

if (req.user.role === "user") {

    const patient = await Patient.findOne({

        user_id: req.user.id,

        _id: prescription.patient_id

    });

    if (!patient) {

        return res.status(403).json({

            success: false,

            message: "Access denied."

        });

    }

}

        // Admin can view any prescription

        return res.status(200).json({

            success: true,

            prescription

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch prescription.",

            error: error.message

        });

    }

};

// Update Prescription
exports.updatePrescription = async (req, res) => {

    try {

        const doctor_id = req.user.id;
        const { prescription_id } = req.params;

        const {

            medicines,
            general_instructions,
            follow_up_date,
            status

        } = req.body;

        const prescription = await Prescription.findById(prescription_id);

        if (!prescription) {

            return res.status(404).json({

                success: false,
                message: "Prescription not found."

            });

        }

        // Doctor can update only own prescription
        if (prescription.doctor_id !== doctor_id) {

            return res.status(403).json({

                success: false,
                message: "Access denied."

            });

        }

        // Update medicines if provided
        if (medicines) {

            if (!Array.isArray(medicines) || medicines.length === 0) {

                return res.status(400).json({

                    success: false,
                    message: "At least one medicine is required."

                });

            }

            const updatedMedicines = [];

            for (const item of medicines) {

                const medicine = await Medicine.findById(item.medicine_id);

                if (!medicine) {

                    return res.status(404).json({

                        success: false,
                        message: `Medicine not found: ${item.medicine_id}`

                    });

                }

                if (medicine.status !== "active") {

                    return res.status(400).json({

                        success: false,
                        message: `${medicine.medicine_name} is currently unavailable.`

                    });

                }

                updatedMedicines.push({

                    medicine_id: medicine._id,
                    medicine_name: medicine.medicine_name,
                    generic_name: medicine.generic_name,
                    strength: medicine.strength,

                    dosage: item.dosage,
                    frequency: item.frequency,
                    duration: item.duration,
                    quantity: item.quantity,
                    instructions: item.instructions || ""

                });

            }

            prescription.medicines = updatedMedicines;

        }

        // Update optional fields
        if (general_instructions !== undefined) {

            prescription.general_instructions = general_instructions;

        }

        if (follow_up_date !== undefined) {
            if (follow_up_date && typeof follow_up_date === "string" && follow_up_date.trim() !== "") {
                prescription.follow_up_date = new Date(follow_up_date);
            } else {
                prescription.follow_up_date = null;
            }
        }

        if (status !== undefined) {

            prescription.status = status;

        }

        await prescription.save();

        return res.status(200).json({

            success: true,
            message: "Prescription updated successfully.",
            prescription

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to update prescription.",
            error: error.message

        });

    }

};

// ---------------------------patient side -----------------------------------------------

// Get logged-in user's prescriptions
exports.getMyPatientPrescriptions = async (req, res) => {

    try {

        const user_id = req.user.id;

        // Find all patients linked to the user
        const patients = await Patient.find({

            user_id

        }).select("_id");

        const patientIds = patients.map(patient => patient._id);

        const prescriptions = await Prescription.find({

            patient_id: { $in: patientIds }

        })
        .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
        .populate("patient_id", "first_name last_name age gender phone email address blood_group")
        .populate("appointment_id")
        .populate("medical_record_id")
        .sort({

            prescribed_date: -1

        });

        return res.status(200).json({

            success: true,

            total_prescriptions: prescriptions.length,

            prescriptions

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch prescriptions.",

            error: error.message

        });

    }

};

// -----------------------------admin side -----------------------------------------------------

// Get all prescriptions (Admin)
exports.getAllPrescriptions = async (req, res) => {

    try {

        const prescriptions = await Prescription.find()
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name age gender phone email address blood_group")
            .populate("appointment_id")
            .populate("medical_record_id")
            .sort({

                prescribed_date: -1

            });

        return res.status(200).json({

            success: true,

            total_prescriptions: prescriptions.length,

            prescriptions

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch prescriptions.",

            error: error.message

        });

    }

};