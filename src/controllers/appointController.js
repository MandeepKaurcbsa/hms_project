const Appointment = require("../models/appointModel");
const Doctor = require("../models/doctorModel");
const Patient = require("../models/patientModel");
const User = require("../models/userModel");
const { sendAppointmentConfirmedEmail, sendAppointmentRejectedEmail, sendDoctorPaymentReceivedEmail } = require("../services/emailService");

// Auto-expire appointments whose scheduled time passed without action (pending) or meeting start limit crossed (confirmed)
const checkAndExpireAppointments = async (appointments) => {
    if (!appointments) return;
    const list = Array.isArray(appointments) ? appointments : [appointments];
    const now = new Date();

    for (const appt of list) {
        if (!appt || !appt.appointment_date || !appt.appointment_time) continue;
        if (!["pending", "confirmed"].includes(appt.status)) continue;

        const apptDate = new Date(appt.appointment_date);
        const timeStr = String(appt.appointment_time).trim();
        let hours = 0;
        let minutes = 0;

        if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
            const isPm = timeStr.toLowerCase().includes('pm');
            const cleanTime = timeStr.replace(/(am|pm)/gi, '').trim();
            const parts = cleanTime.split(':').map(Number);
            hours = parts[0] || 0;
            minutes = parts[1] || 0;
            if (isPm && hours < 12) hours += 12;
            if (!isPm && hours === 12) hours = 0;
        } else {
            const parts = timeStr.split(':').map(Number);
            hours = parts[0] || 0;
            minutes = parts[1] || 0;
        }

        const year = apptDate.getUTCFullYear();
        const month = apptDate.getUTCMonth();
        const date = apptDate.getUTCDate();
        const scheduled = new Date(year, month, date, hours, minutes, 0, 0);

        let shouldExpire = false;
        let reason = "";
        let isPatientNoShow = false;
        let isDoctorNoShow = false;

        if (appt.status === "pending") {
            if (now > scheduled) {
                shouldExpire = true;
                reason = "Expired: Scheduled appointment time passed without doctor action (confirmation/rejection)";
                isDoctorNoShow = true;
            }
        } else if (appt.status === "confirmed") {
            const expireCutoff = new Date(scheduled.getTime() + 30 * 60 * 1000);
            if (now > expireCutoff) {
                shouldExpire = true;
                if (appt.payment_status !== "paid") {
                    reason = "Expired: Appointment fee was not paid within 30 minutes of scheduled time";
                    isPatientNoShow = true;
                } else if (appt.consult_mode === "online") {
                    if (appt.meet_time_start) {
                        reason = "Expired: Doctor joined online meet, but patient failed to join within 30 minutes";
                        isPatientNoShow = true;
                    } else {
                        reason = "Expired: Doctor did not join online meeting within 30 minutes of scheduled time";
                        isDoctorNoShow = true;
                    }
                } else {
                    reason = "Expired: Scheduled time passed without doctor marking consultation as completed or recording patient no-show (Doctor's Fault)";
                    isDoctorNoShow = true;
                }
            }
        }

        if (shouldExpire) {
            appt.status = "expired";
            appt.cancel_reason = reason;

            if (isPatientNoShow) {
                appt.refund_status = "not_applicable";
                appt.refund_percentage = 0;
                appt.refund_amount = 0;
            } else if (isDoctorNoShow && appt.payment_status === "paid") {
                appt.refund_percentage = 100;
                appt.refund_amount = appt.consultation_fee || 0;
                if (appt.refund_status !== "refunded") {
                    appt.refund_status = "pending";
                }
            } else {
                appt.refund_status = "not_applicable";
            }

            await appt.save().catch(() => {});
        }
    }
};


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
        .populate("doctor_id", "first_name last_name specialization visit_address consult_fee phone email profile_img")
        .populate("patient_id", "first_name last_name");

        await checkAndExpireAppointments(appointments);

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

        await checkAndExpireAppointments(appointment);

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
            "first_name last_name age gender phone email address blood_group"
        )
        .sort({ createdAt: -1 });

        // Auto-expire appointments if time limit passed without doctor action or meeting start
        await checkAndExpireAppointments(appointments);

        const userIds = [...new Set(appointments.map(a => a.user_id).filter(Boolean))];
        const users = await User.find({ _id: { $in: userIds } }).select("first_name last_name email phone");
        const userMap = {};
        users.forEach(u => { userMap[u._id] = u; });

        const enriched = appointments.map(a => ({
            ...a.toObject(),
            booked_by: userMap[a.user_id] || null
        }));

        res.status(200).json({
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

        // Send email to user notifying them
        try {
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            if (user && user.email && doctor) {
                await sendAppointmentConfirmedEmail({
                    to: user.email,
                    userName: `${user.first_name} ${user.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    appointmentId: appointment._id,
                    consult_mode: appointment.consult_mode
                });
            }
        } catch (emailErr) {
            console.error('Email send failed (non-fatal):', emailErr.message);
        }

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

        // Send rejection email to user
        try {
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            if (user && user.email && doctor) {
                await sendAppointmentRejectedEmail({
                    to: user.email,
                    userName: `${user.first_name} ${user.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    cancelReason: cancel_reason
                });
            }
        } catch (emailErr) {
            console.error('Rejection email failed (non-fatal):', emailErr.message);
        }

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

// doctor completes appointment (manual, kept for backward compat)
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
        if (!appointment.meet_time_end) {
            appointment.meet_time_end = new Date();
        }
        if (appointment.meet_time_start && appointment.meet_time_end) {
            appointment.meet_time = Math.max(1, Math.round((new Date(appointment.meet_time_end) - new Date(appointment.meet_time_start)) / 60000));
        }

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

// Doctor starts the meeting → stamps meet_time_start (enabled ONLY at scheduled time up to 30 mins after scheduled time)
exports.startMeeting = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (appointment.status !== "confirmed") {
            return res.status(400).json({ message: "Only confirmed appointments can be started" });
        }

        // Validate time window for Doctor starting the meeting: enabled at scheduled time for 30 mins
        if (appointment.appointment_date && appointment.appointment_time) {
            const scheduled = new Date(appointment.appointment_date);
            const timeStr = String(appointment.appointment_time).trim();
            let hours = 0;
            let minutes = 0;
            if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
                const isPm = timeStr.toLowerCase().includes('pm');
                const cleanTime = timeStr.replace(/(am|pm)/gi, '').trim();
                const parts = cleanTime.split(':').map(Number);
                hours = parts[0] || 0;
                minutes = parts[1] || 0;
                if (isPm && hours < 12) hours += 12;
                if (!isPm && hours === 12) hours = 0;
            } else {
                const parts = timeStr.split(':').map(Number);
                hours = parts[0] || 0;
                minutes = parts[1] || 0;
            }
            scheduled.setHours(hours, minutes, 0, 0);
            const windowEnd = new Date(scheduled.getTime() + 30 * 60 * 1000);
            const now = new Date();

            if (now < scheduled) {
                return res.status(400).json({
                    message: `Start Meet button can only be clicked at scheduled time (${appointment.appointment_time}).`
                });
            }
            if (now > windowEnd) {
                return res.status(400).json({
                    message: "Meeting start window (30 mins from scheduled time) has expired."
                });
            }
        }

        // Stamp meet_time_start if not already set
        if (!appointment.meet_time_start) {
            appointment.meet_time_start = new Date();
            await appointment.save();
        }

        res.status(200).json({
            message: "Meeting started successfully. Time tracking initiated.",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error starting meeting",
            error: error.message
        });
    }
};

// Doctor cuts/stops the video call → stamps meet_time_end, calculates duration, marks appointment as completed
exports.completeAppointmentOnCall = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Mark completed if confirmed or completed
        if (["confirmed", "completed"].includes(appointment.status)) {
            appointment.status = "completed";
        }
        if (!appointment.meet_time_end) {
            appointment.meet_time_end = new Date();
        }
        if (appointment.meet_time_start && appointment.meet_time_end) {
            const durationMs = new Date(appointment.meet_time_end) - new Date(appointment.meet_time_start);
            appointment.meet_time = Math.max(1, Math.round(durationMs / 60000));
        } else {
            appointment.meet_time = 1;
        }
        await appointment.save();

        res.status(200).json({
            message: "Appointment marked as completed and meeting ended by doctor.",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            message: "Error marking appointment call as completed",
            error: error.message
        });
    }
};

//----------------------------------admin side ------------------------------------------------

// admin can view all appointments
exports.getAllAppointments = async (req, res) => {
    try {

        const appointments = await Appointment.find()
            .populate("doctor_id", "first_name last_name specialization visit_address")
            .populate("patient_id", "first_name last_name")
            .sort({ createdAt: -1 });

        await checkAndExpireAppointments(appointments);

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

        // Post-payment cancellation is blocked for user/pharmacist
        if (appointment.payment_status === "paid") {
            return res.status(400).json({
                message: "Cancellation is not allowed after payment is completed."
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

        const isPaid = appointment.payment_status === "paid";
        const refundAmount = isPaid ? appointment.consultation_fee : 0;

        appointment.status = "cancelled";
        appointment.cancelled_by = "doctor";
        appointment.cancel_reason = cancel_reason;
        appointment.cancelled_at = new Date();

        appointment.refund_percentage = isPaid ? 100 : 0;
        appointment.refund_amount = refundAmount;
        appointment.refund_status = isPaid ? "pending" : "not_applicable";

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
                { patient_id: { $in: patientIds } }
            ]
        })
            .populate("doctor_id", "first_name last_name specialization department consult_fee phone email profile_img visit_address")
            .populate("patient_id", "first_name last_name gender age blood_group phone")
            .sort({ createdAt: -1, appointment_date: -1 });

        await checkAndExpireAppointments(appointments);

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
            .populate("doctor_id", "first_name last_name specialization visit_address");

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

        // Send payment notification to doctor
        try {
            const doctorObj = await Doctor.findById(appointment.doctor_id?._id || appointment.doctor_id);
            const patientObj = await Patient.findById(appointment.patient_id);
            const patientName = patientObj ? `${patientObj.first_name || ''} ${patientObj.last_name || ''}`.trim() : 'Pharmacist Patient';

            if (doctorObj && doctorObj.email) {
                await sendDoctorPaymentReceivedEmail({
                    to: doctorObj.email,
                    doctorName: `${doctorObj.first_name || ''} ${doctorObj.last_name || ''}`.trim() || 'Doctor',
                    patientName,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode,
                    appointmentId: appointment._id
                });
            }
        } catch (emailErr) {
            console.error('Doctor payment email failed (non-fatal):', emailErr.message);
        }

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
                message: "Cancellation is not allowed after payment is completed."
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

// Doctor marks offline appointment as patient no-show
exports.doctorMarkPatientNoShow = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (["expired", "completed", "cancelled"].includes(appointment.status)) {
            return res.status(400).json({ success: false, message: `Appointment is already ${appointment.status}.` });
        }

        // Validate time window: enabled only from scheduled time to scheduled time + 30 mins
        if (appointment.appointment_date && appointment.appointment_time) {
            const scheduled = new Date(appointment.appointment_date);
            const timeStr = String(appointment.appointment_time).trim();
            let hours = 0;
            let minutes = 0;
            if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
                const isPm = timeStr.toLowerCase().includes('pm');
                const cleanTime = timeStr.replace(/(am|pm)/gi, '').trim();
                const parts = cleanTime.split(':').map(Number);
                hours = parts[0] || 0;
                minutes = parts[1] || 0;
                if (isPm && hours < 12) hours += 12;
                if (!isPm && hours === 12) hours = 0;
            } else {
                const parts = timeStr.split(':').map(Number);
                hours = parts[0] || 0;
                minutes = parts[1] || 0;
            }
            scheduled.setHours(hours, minutes, 0, 0);
            const windowEnd = new Date(scheduled.getTime() + 30 * 60 * 1000);
            const now = new Date();

            if (now < scheduled) {
                return res.status(400).json({
                    success: false,
                    message: `Patient 'Did Not Visit Clinic' action is only allowed starting at scheduled time (${appointment.appointment_time}).`
                });
            }
            if (now > windowEnd) {
                return res.status(400).json({
                    success: false,
                    message: "The 30-minute window for marking patient no-show has expired."
                });
            }
        }

        appointment.status = "expired";
        appointment.cancel_reason = "Patient did not visit the Clinic";
        appointment.refund_status = "not_applicable";
        appointment.refund_percentage = 0;
        appointment.refund_amount = 0;
        appointment.prescription_added = false;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment marked as Expired (Patient did not visit the Clinic). No refund issued.",
            appointment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error marking patient no-show.",
            error: error.message
        });
    }
};
