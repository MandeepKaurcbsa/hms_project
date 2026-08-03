const Appointment = require("../models/appointModel");
const Doctor = require("../models/doctorModel");
const Patient = require("../models/patientModel");
const User = require("../models/userModel");

//----------------------------------user side ------------------------------------------ 
// book appointment
exports.createAppointment = async (req, res) => {
    try {

        const {
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            consult_mode,
            disease,
            symptoms
        } = req.body;

        if (
            !patient_id ||
            !doctor_id ||
            !appointment_date ||
            !appointment_time ||
            !disease
        ) {
            return res.status(400).json({
                message: "Please fill all required fields"
            });
        }

        const patient = await Patient.findById(patient_id);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        if (patient.user_id !== req.user.id) {
            return res.status(403).json({
                message: "You can only book appointments for your own patients"
            });
        }

        const doctor = await Doctor.findById(doctor_id);

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        if (doctor.status !== "active") {
            return res.status(400).json({
                message: "Doctor is not available"
            });
        }
                const existingAppointment = await Appointment.findOne({
                doctor_id,
                appointment_date,
                appointment_time,
                status: {
                    $in: ["pending", "confirmed"]
                }
            });

            if (existingAppointment) {
                return res.status(400).json({
                    message: "This time slot is already booked"
                });
            }
            const appointment = await Appointment.create({
            user_id: req.user.id,
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            consult_mode,
            disease,
            symptoms,
            consultation_fee: doctor.consult_fee
        });

        res.status(201).json({
            message: "Appointment booked successfully",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error booking appointment",
            error: error.message
        });
    }
};

//logged in user can fetch all the appointments he has 
exports.getMyAppointments = async (req, res) => {
    try {

        const appointments = await Appointment.find({
            user_id: req.user.id
        })
        .populate("doctor_id", "first_name last_name specialization")
        .populate("patient_id", "first_name last_name");

        res.status(200).json({
            totalAppointments: appointments.length,
            appointments
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointments",
            error: error.message
        });
    }
};

//logged in user OR pharmacist can view a single appointment they own
exports.getSingleAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id)
            .populate(
                "doctor_id",
                "first_name last_name specialization department consult_fee profile_img"
            )
            .populate(
                "patient_id",
                "first_name last_name gender age blood_group phone"
            );

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        // Allow both users and pharmacists — both book with their own user_id
        const isOwner = String(appointment.user_id) === String(req.user.id);
        if (!isOwner) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.status(200).json({
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointment",
            error: error.message
        });
    }
};

//----------------------------------doctor side -------------------------------------------------------- 

// doctor can view all assigned appointments
exports.getDoctorAppointments = async (req, res) => {
    try {

        const appointments = await Appointment.find({
            doctor_id: req.user.id
        })
        .populate(
            "patient_id",
            "first_name last_name"
        );

        res.status(200).json({
            totalAppointments: appointments.length,
            appointments
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointments",
            error: error.message
        });
    }
};

// doctor can view one assigned appointment
exports.getDoctorSingleAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id)
            .populate(
                "patient_id",
                "first_name last_name"
            );

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.status(200).json({
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointment",
            error: error.message
        });
    }
};

// doctor confirms appointment
exports.confirmAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        appointment.status = "confirmed";

        // If a pharmacist booked this appointment, flag it so
        // the pharmacist knows they need to complete payment.
        if (appointment.booker_role === "pharmacist") {
            appointment.awaiting_pharmacist_payment = true;
        }

        await appointment.save();

        res.status(200).json({
            message: "Appointment confirmed successfully",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error confirming appointment",
            error: error.message
        });
    }
};

// doctor rejects appointment
exports.rejectAppointment = async (req, res) => {
    try {

        const { cancel_reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        appointment.status = "rejected";
        appointment.cancelled_by = "doctor";
        appointment.cancel_reason = cancel_reason;

        await appointment.save();

        res.status(200).json({
            message: "Appointment rejected successfully",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error rejecting appointment",
            error: error.message
        });
    }
};

// doctor completes appointment
exports.completeAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        appointment.status = "completed";

        await appointment.save();

        res.status(200).json({
            message: "Appointment completed successfully",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error completing appointment",
            error: error.message
        });
    }
};

//----------------------------------admin side ------------------------------------------------

// admin can view all appointments
exports.getAllAppointments = async (req, res) => {
    try {

        const appointments = await Appointment.find()
            .populate("doctor_id", "first_name last_name specialization")
            .populate("patient_id", "first_name last_name")
            .sort({ createdAt: -1 });

        // Manually attach user (booker) data since populate fails on custom string _id
        const userIds = [...new Set(appointments.map(a => a.user_id).filter(Boolean))];
        const users = await User.find({ _id: { $in: userIds } }).select("first_name last_name email");
        const userMap = {};
        users.forEach(u => { userMap[u._id] = u; });

        const enriched = appointments.map(a => ({
            ...a.toObject(),
            booked_by: userMap[a.user_id] || null
        }));

        res.status(200).json({
            message: "Appointments fetched successfully",
            totalAppointments: enriched.length,
            appointments: enriched
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointments",
            error: error.message
        });
    }
};

// admin can view single appointment
exports.getAdminSingleAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id)
            .populate(
                "doctor_id",
                "first_name last_name specialization department"
            )
            .populate(
                "patient_id",
                "first_name last_name"
            );

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        res.status(200).json({
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching appointment",
            error: error.message
        });
    }
};


//-------------------------cancellation by user -------------------------------------

// user cancels own appointment
exports.cancelAppointment = async (req, res) => {
    try {

        const { cancel_reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        // ownership check
        if (appointment.user_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // already cancelled
        if (appointment.status === "cancelled") {
            return res.status(400).json({
                message: "Appointment already cancelled"
            });
        }

        // completed appointments cannot be cancelled
        if (appointment.status === "completed") {
            return res.status(400).json({
                message: "Completed appointments cannot be cancelled"
            });
        }

        // rejected appointments cannot be cancelled
        if (appointment.status === "rejected") {
            return res.status(400).json({
                message: "Rejected appointments cannot be cancelled"
            });
        }

        let refundPercentage = 0;

        // CASE 1: Pending appointment
        if (appointment.status === "pending") {

            refundPercentage = 100;

        } else if (appointment.status === "confirmed") {

            // calculate hours remaining

            const appointmentDateTime = new Date(
                `${appointment.appointment_date.toISOString().split("T")[0]}T${appointment.appointment_time}`
            );

            const now = new Date();

            const hoursRemaining =
                (appointmentDateTime - now) / (1000 * 60 * 60);

            if (hoursRemaining >= 24) {

                refundPercentage = 80;

            } else if (hoursRemaining >= 6) {

                refundPercentage = 50;

            } else {

                refundPercentage = 0;
            }
        }

        const refundAmount =
            (appointment.consultation_fee * refundPercentage) / 100;

        appointment.status = "cancelled";
        appointment.cancelled_by = "user";
        appointment.cancel_reason = cancel_reason;
        appointment.cancelled_at = new Date();

        appointment.refund_percentage = refundPercentage;
        appointment.refund_amount = refundAmount;

        if (refundPercentage > 0) {

            appointment.refund_status = "pending";

        } else {

            appointment.refund_status = "not_applicable";
        }

        await appointment.save();

        res.status(200).json({
            message: "Appointment cancelled successfully",
            refund_percentage: refundPercentage,
            refund_amount: refundAmount,
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error cancelling appointment",
            error: error.message
        });
    }
};

//----------------------cancel by doc ------------------------------------------------------

// doctor cancels appointment
exports.doctorCancelAppointment = async (req, res) => {
    try {

        const { cancel_reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        // doctor can cancel only his appointments
        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (
            appointment.status === "cancelled" ||
            appointment.status === "completed" ||
            appointment.status === "rejected"
        ) {
            return res.status(400).json({
                message: `Appointment is already ${appointment.status}`
            });
        }

        const refundAmount = appointment.consultation_fee;

        appointment.status = "cancelled";
        appointment.cancelled_by = "doctor";
        appointment.cancel_reason = cancel_reason;
        appointment.cancelled_at = new Date();

        appointment.refund_percentage = 100;
        appointment.refund_amount = refundAmount;
        appointment.refund_status = "pending";

        await appointment.save();

        res.status(200).json({
            message: "Appointment cancelled by doctor",
            refund_percentage: 100,
            refund_amount: refundAmount,
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error cancelling appointment",
            error: error.message
        });
    }
};

//-----------------------------cancel by admin ------------------------------------------------

// admin cancels appointment
exports.adminCancelAppointment = async (req, res) => {
    try {

        const { cancel_reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (
            appointment.status === "cancelled" ||
            appointment.status === "completed" ||
            appointment.status === "rejected"
        ) {
            return res.status(400).json({
                message: `Appointment is already ${appointment.status}`
            });
        }

        const refundAmount = appointment.consultation_fee;

        appointment.status = "cancelled";
        appointment.cancelled_by = "admin";
        appointment.cancel_reason = cancel_reason;
        appointment.cancelled_at = new Date();

        appointment.refund_percentage = 100;
        appointment.refund_amount = refundAmount;
        appointment.refund_status = "pending";

        await appointment.save();

        res.status(200).json({
            message: "Appointment cancelled by admin",
            refund_percentage: 100,
            refund_amount: refundAmount,
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error cancelling appointment",
            error: error.message
        });
    }
};

//fetch booked slots for a specific doctor on a specific date
exports.getBookedSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedAppointments = await Appointment.find({
            doctor_id: doctorId,
            $or: [
                { appointment_date: date },
                { appointment_date: { $gte: startOfDay, $lte: endOfDay } }
            ],
            status: { $in: ["pending", "confirmed"] }
        }).select('appointment_time');

        const bookedTimes = bookedAppointments.map(a => a.appointment_time);

        res.status(200).json({
            bookedTimes
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching booked slots",
            error: error.message
        });
    }
};

//----------------------------------pharmacist side ------------------------------------------------

// Pharmacist can view only their own booked appointments
exports.getPharmacistAppointments = async (req, res) => {
    try {
        const Patient = require("../models/patientModel");
        const Appointment = require("../models/appointModel");
        const Doctor = require("../models/doctorModel");

        const patients = await Patient.find({ user_id: req.user.id }).select("_id");
        const patientIds = patients.map(p => p._id);

        const appointments = await Appointment.find({
            $or: [
                { user_id: req.user.id },
                { booker_role: "pharmacist" },
                { patient_id: { $in: patientIds } }
            ]
        })
            .populate("doctor_id", "first_name last_name specialization department consult_fee phone email profile_img")
            .populate("patient_id", "first_name last_name gender age blood_group phone")
            .sort({ createdAt: -1, appointment_date: -1 });

        res.status(200).json({
            success: true,
            message: "Appointments fetched successfully",
            totalAppointments: appointments.length,
            appointments
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching appointments",
            error: error.message
        });
    }
};

// ─── STEP 1 ───
// Pharmacist books an appointment → status: "pending", payment_status: "pending"
// Doctor will then accept or reject it.
exports.pharmacistBookAppointment = async (req, res) => {
    try {
        const {
            doctor_id,
            appointment_date,
            appointment_time,
            consult_mode,
            disease,
            symptoms
        } = req.body;

        if (!doctor_id || !appointment_date || !appointment_time || !disease) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields: doctor, date, time, disease."
            });
        }

        const Pharmacist = require("../models/pharmacistModel");
        const pharmacist = await Pharmacist.findById(req.user.id);
        if (!pharmacist) {
            return res.status(404).json({ success: false, message: "Pharmacist account not found." });
        }

        const doctor = await Doctor.findById(doctor_id);
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found." });
        }
        if (doctor.status !== "active") {
            return res.status(400).json({ success: false, message: "Selected doctor is currently not active." });
        }

        // Check slot availability
        const startOfDay = new Date(appointment_date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(appointment_date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const slotTaken = await Appointment.findOne({
            doctor_id,
            $or: [
                { appointment_date: appointment_date },
                { appointment_date: { $gte: startOfDay, $lte: endOfDay } }
            ],
            appointment_time,
            status: { $in: ["pending", "confirmed"] }
        });
        if (slotTaken) {
            return res.status(400).json({
                success: false,
                message: "This time slot is already booked for the selected doctor."
            });
        }

        // 10% pharmacist discount
        const originalFee = doctor.consult_fee || 500;
        const discountedFee = Math.round(originalFee * 0.90);

        const cleanPhone = (pharmacist.phone || "").replace(/\D/g, '').slice(-10) || "9999999999";
        const finalPhone = cleanPhone.length === 10 ? cleanPhone : "9999999999";

        // Find or auto-create the patient profile linked to this pharmacist
        let patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) {
            patient = await Patient.create({
                user_id: req.user.id,
                first_name: pharmacist.first_name || "Pharmacist",
                last_name: pharmacist.last_name || "User",
                phone: finalPhone,
                dob: new Date("1990-01-01"),
                gender: "other",
                blood_group: "O+",
                relationship_to_user: "self",
                emergency_contact_name: pharmacist.first_name || "Pharmacist",
                emergency_contact_number: finalPhone
            });
        }

        const appointment = await Appointment.create({
            user_id: req.user.id,
            patient_id: patient._id,
            doctor_id,
            appointment_date,
            appointment_time,
            consult_mode: consult_mode || "offline",
            disease,
            symptoms: Array.isArray(symptoms)
                ? symptoms
                : (symptoms ? symptoms.split(",").map(s => s.trim()) : ["Consultation"]),
            consultation_fee: discountedFee,
            original_fee: originalFee,
            payment_status: "pending",
            payment_method: "upi",
            status: "pending",
            booker_role: "pharmacist",
            awaiting_pharmacist_payment: false
        });

        res.status(201).json({
            success: true,
            message: `Appointment request sent to Dr. ${doctor.first_name} ${doctor.last_name}. Awaiting doctor approval. You will be notified to complete payment once accepted.`,
            appointment,
            original_fee: originalFee,
            discounted_fee: discountedFee,
            you_save: originalFee - discountedFee
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error booking pharmacist appointment.",
            error: error.message
        });
    }
};

// ─── STEP 2 ───
// Doctor confirms a pharmacist appointment → status stays "pending" but
// awaiting_pharmacist_payment flips to true so the pharmacist knows to pay.
// This reuses the existing /doctor/:id/confirmed route — we just add the flag.
// NOTE: no change to confirmAppointment needed; it already sets status="confirmed".
// Instead, the pharmacist dashboard reads awaiting_pharmacist_payment from the
// appointment and prompts the pharmacist to pay.

// ─── STEP 3 ───
// Pharmacist confirms payment → status: "confirmed", payment_status: "paid"
exports.pharmacistConfirmPayment = async (req, res) => {
    try {
        const { payment_method } = req.body;

        const appointment = await Appointment.findById(req.params.id)
            .populate("doctor_id", "first_name last_name specialization");

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        // Only the pharmacist who booked it can pay
        if (appointment.user_id !== req.user.id || appointment.booker_role !== "pharmacist") {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (appointment.status !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: `Cannot pay for an appointment that is "${appointment.status}". Doctor must confirm first.`
            });
        }

        if (appointment.payment_status === "paid") {
            return res.status(400).json({ success: false, message: "Payment already done." });
        }

        appointment.payment_status = "paid";
        appointment.payment_method = payment_method || "upi";
        appointment.awaiting_pharmacist_payment = false;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Payment of ₹${appointment.consultation_fee} done! Your appointment with Dr. ${appointment.doctor_id?.first_name} ${appointment.doctor_id?.last_name} is now fully scheduled.`,
            appointment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error confirming payment.",
            error: error.message
        });
    }
};

// ─── STEP 2 hook ───
// When doctor confirms a pharmacist appointment we set awaiting_pharmacist_payment = true.
// We patch the existing confirmAppointment to handle this case.
// We create a separate "doctor confirm for pharmacist" controller entry below.
// (The frontend calls the same /doctor/:id/confirmed route — no extra route needed)

// Pharmacist cancel appointment (before payment / before doctor confirmation)
exports.pharmacistCancelAppointment = async (req, res) => {
    try {
        const { cancel_reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        if (appointment.user_id !== req.user.id || appointment.booker_role !== "pharmacist") {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (!["pending", "confirmed"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an appointment that is already "${appointment.status}".`
            });
        }

        if (appointment.payment_status === "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment already made. Contact admin for refund."
            });
        }

        appointment.status = "cancelled";
        appointment.cancelled_by = "pharmacist";
        appointment.cancel_reason = cancel_reason || "Cancelled by pharmacist";
        appointment.cancelled_at = new Date();

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully.",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error cancelling appointment.",
            error: error.message
        });
    }
};

