const Prescription = require("../models/prescriptionModel");
const Appointment = require("../models/appointModel");
const MedicalRecord = require("../models/medicalRecordModel");
const Medicine = require("../models/medicineModel");
const Patient = require("../models/patientModel");
const Doctor = require("../models/doctorModel");

const parseTimeToHoursMinutes = (timeStr) => {
    let hours = 17;
    let minutes = 0;
    if (!timeStr) return { hours, minutes };
    const clean = String(timeStr).trim();
    if (clean.toLowerCase().includes("am") || clean.toLowerCase().includes("pm")) {
        const isPm = clean.toLowerCase().includes("pm");
        const numPart = clean.replace(/(am|pm)/gi, "").trim();
        const parts = numPart.split(":").map(Number);
        let h = parts[0] || 0;
        const m = parts[1] || 0;
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
        hours = h;
        minutes = m;
    } else if (clean.includes(":")) {
        const parts = clean.split(":").map(Number);
        hours = parts[0] || 0;
        minutes = parts[1] || 0;
    }
    return { hours, minutes };
};

// --------------------------------doctor side -----------------------------------------------------

// Create Prescription
exports.createPrescription = async (req, res) => {

    try {

        const doctor_id = req.user.id;

        const {

            appointment_id,
            medical_record_id,
            patient_id,
            patient_age,
            patient_gender,
            age,
            gender,
            medicines,
            general_instructions,
            follow_up_date,
            prescription_type,
            is_follow_up

        } = req.body;

        const isFollowUp = is_follow_up === true || is_follow_up === "true" || prescription_type === "follow_up";
        const finalAge = patient_age !== undefined ? Number(patient_age) : (age !== undefined ? Number(age) : null);
        const finalGender = (patient_gender || gender || "").toLowerCase();

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

        if (isFollowUp) {
            // Check follow-up prescription already exists
            const existingFollowUp = await Prescription.findOne({
                appointment_id,
                prescription_type: "follow_up"
            });

            if (existingFollowUp || appointment.follow_up_prescription_status === "added") {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up prescription has already been added for this appointment and cannot be modified."
                });
            }
        } else {
            // Check primary prescription already exists or is already added to appointment
            const existingPrescription = await Prescription.findOne({
                appointment_id,
                prescription_type: { $ne: "follow_up" }
            });

            if (existingPrescription) {
                return res.status(400).json({
                    success: false,
                    message: "Prescription has already been added for this appointment and cannot be modified."
                });
            }
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

            patient_age: finalAge,

            patient_gender: finalGender,

            doctor_id,

            medicines: prescriptionMedicines,

            general_instructions,

            follow_up_date: normalizedFollowUpDate,

            prescription_type: isFollowUp ? "follow_up" : "primary"

        });

        if (finalAge && Number(finalAge) > 0 && patient_id) {
            try {
                const pat = await Patient.findById(patient_id);
                if (pat) {
                    const currentAge = pat.dob ? Math.floor((new Date() - new Date(pat.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                    if (!pat.dob || currentAge !== Number(finalAge)) {
                        const approxBirthYear = new Date().getFullYear() - Number(finalAge);
                        const updatedDob = new Date(`${approxBirthYear}-01-01`);
                        await Patient.findByIdAndUpdate(patient_id, { dob: updatedDob });
                    }
                }
            } catch (e) {}
        }

        // Update appointment
        if (isFollowUp) {
            appointment.follow_up_prescription_status = "added";
            appointment.follow_up_prescription_id = prescription._id;
            if (normalizedFollowUpDate) {
                appointment.follow_up_date = normalizedFollowUpDate;
                appointment.assigned_follow_up_date = normalizedFollowUpDate;
            }
        } else {
            appointment.prescription_added = true;
            appointment.status = "completed";
            if (normalizedFollowUpDate) {
                appointment.follow_up_date = normalizedFollowUpDate;
                appointment.assigned_follow_up_date = normalizedFollowUpDate;
                // Set assigned follow-up time to the doctor's last meet time of the day (minimum 17:00)
                let lastMeetHour = 17;
                let lastMeetMin = 0;
                try {
                    const doc = await Doctor.findById(doctor_id || req.user.id).select("work_time_end");
                    if (doc && doc.work_time_end) {
                        const parsed = parseTimeToHoursMinutes(doc.work_time_end);
                        if (parsed.hours > 17 || (parsed.hours === 17 && parsed.minutes > 0)) {
                            lastMeetHour = parsed.hours;
                            lastMeetMin = parsed.minutes;
                        }
                    }
                } catch (err) {}
                appointment.assigned_follow_up_time = `${String(lastMeetHour).padStart(2, '0')}:${String(lastMeetMin).padStart(2, '0')}`;
                appointment.follow_up_status = "none";
            } else {
                appointment.follow_up_date = null;
                appointment.assigned_follow_up_date = null;
                appointment.assigned_follow_up_time = null;
                appointment.follow_up_time = null;
                appointment.follow_up_status = "none";
                appointment.follow_up_reason = null;
                appointment.follow_up_expire_reason = null;
                appointment.follow_up_expired_at = null;
                appointment.follow_up_requested_at = null;
                appointment.follow_up_requested_by = null;
                appointment.follow_up_responded_at = null;
                appointment.follow_up_cancel_reason = null;
                appointment.follow_up_cancelled_at = null;
                appointment.follow_up_cancelled_by = null;
                appointment.follow_up_doctor_joined = false;
                appointment.follow_up_patient_joined = false;
                appointment.follow_up_patient_arrived = false;
                appointment.follow_up_meet_time_start = null;
                appointment.follow_up_meet_time_end = null;
            }
            if (!appointment.meet_time_end) {
                appointment.meet_time_end = new Date();
            }
            if (appointment.meet_time_start && appointment.meet_time_end) {
                appointment.meet_time = Math.max(1, Math.round((new Date(appointment.meet_time_end) - new Date(appointment.meet_time_start)) / 60000));
            }
        }

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
        .populate("patient_id", "first_name last_name dob age gender phone email address blood_group")
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
        const { type } = req.query;

        const query = { appointment_id };
        if (type === "follow_up") {
            query.prescription_type = "follow_up";
        } else {
            query.prescription_type = { $ne: "follow_up" };
        }

        const prescription = await Prescription.findOne(query)
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name dob gender age blood_group phone email address")
            .populate("appointment_id")
            .populate("medical_record_id");

        if (prescription) {
            return res.status(200).json({
                success: true,
                prescription
            });
        }

        if (type === "follow_up") {
            return res.status(404).json({
                success: false,
                message: "Follow-up prescription not found for this appointment."
            });
        }

        // Fallback: Check if a MedicalRecord exists for this appointment
        const medicalRecord = await MedicalRecord.findOne({ appointment_id })
            .populate("doctor_id", "first_name last_name specialization department email phone visit_address signature profile_img")
            .populate("patient_id", "first_name last_name dob gender age blood_group phone email address")
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
            .populate("patient_id", "first_name last_name dob gender age blood_group phone email address")
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
            String(prescription.doctor_id?._id || prescription.doctor_id) !== String(req.user.id)
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
        return res.status(403).json({
            success: false,
            message: "Prescription cannot be modified or updated once added."
        });
    } catch (error) {
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
        .populate("patient_id", "first_name last_name dob age gender phone email address blood_group")
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
            .populate("patient_id", "first_name last_name dob age gender phone email address blood_group")
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