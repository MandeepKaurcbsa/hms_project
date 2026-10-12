const Appointment = require("../models/appointModel");
const Doctor = require("../models/doctorModel");
const Patient = require("../models/patientModel");
const User = require("../models/userModel");
const Prescription = require("../models/prescriptionModel");
const { sendAppointmentConfirmedEmail, sendAppointmentRejectedEmail, sendDoctorPaymentReceivedEmail } = require("../services/emailService");

// Helper to parse follow-up scheduled date and time into a precise Date object
const getFollowUpScheduledDateTime = (appt) => {
    if (!appt || !appt.follow_up_date) return null;
    const timeStr = String(appt.follow_up_time || appt.appointment_time || "10:00").trim();
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

    const d = new Date(appt.follow_up_date);
    let year, month, date;
    if (typeof appt.follow_up_date === 'string' && appt.follow_up_date.includes('-')) {
        const dateParts = appt.follow_up_date.split('T')[0].split('-').map(Number);
        year = dateParts[0];
        month = dateParts[1] - 1;
        date = dateParts[2];
    } else {
        year = d.getFullYear();
        month = d.getMonth();
        date = d.getDate();
    }
    return new Date(year, month, date, hours, minutes, 0, 0);
};

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

// Auto-expire appointments and follow-up meets whose scheduled time or meeting start window has crossed
const checkAndExpireAppointments = async (appointments) => {
    if (!appointments) return;
    const list = Array.isArray(appointments) ? appointments : [appointments];
    const now = new Date();

    for (const appt of list) {
        if (!appt) continue;

        // ── 1. Primary appointment expiration ──
        if (appt.appointment_date && appt.appointment_time && ["pending", "confirmed"].includes(appt.status)) {
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

        // ── 1.5. Synchronize follow_up_date from Prescription or MedicalRecord if set by doctor ──
        if (appt.status === "completed" && !appt.follow_up_date && (!appt.follow_up_status || appt.follow_up_status === "none")) {
            try {
                const MedicalRecord = require("../models/medicalRecordModel");
                const Prescription = require("../models/prescriptionModel");
                const rec = await MedicalRecord.findOne({ appointment_id: appt._id, follow_up_date: { $ne: null } });
                const presc = await Prescription.findOne({ appointment_id: appt._id, follow_up_date: { $ne: null } });
                const fDate = presc?.follow_up_date || rec?.follow_up_date;
                if (fDate) {
                    appt.follow_up_date = fDate;
                    appt.assigned_follow_up_date = fDate;
                    if (!appt.assigned_follow_up_time) {
                        appt.assigned_follow_up_time = "17:00";
                    }
                    appt.follow_up_status = "none";
                    await appt.save().catch(() => {});
                }
            } catch (syncErr) {}
        }

        // ── 2. Follow-up meeting expiration ──
        if (appt.follow_up_date && ["requested", "accepted"].includes(appt.follow_up_status)) {
            const scheduledFU = getFollowUpScheduledDateTime(appt);
            if (scheduledFU && !isNaN(scheduledFU.getTime())) {
                const isPharmacist = appt.booker_role === "pharmacist" || appt.follow_up_requested_by === "pharmacist";

                // SCENARIO 1:
                // Patient/pharmacist sends request before assigned follow-up meet, and date/time passed,
                // doctor does not confirm/reject it -> mark as expired:
                // "Follow-up meet expired without doctor confirmation"
                if (appt.follow_up_status === "requested") {
                    if (now > scheduledFU) {
                        appt.follow_up_status = "expired";
                        appt.follow_up_expire_reason = "Follow-up meet expired without doctor confirmation";
                        appt.follow_up_expired_at = now;
                        await appt.save().catch(() => {});
                    }
                }
                // SCENARIO 2 & 3:
                // Doctor confirmed (accepted) follow-up meet -> check after 30-min window
                else if (appt.follow_up_status === "accepted") {
                    const expireCutoffFU = new Date(scheduledFU.getTime() + 30 * 60 * 1000);
                    if (now > expireCutoffFU) {
                        appt.follow_up_status = "expired";
                        appt.follow_up_expired_at = now;

                        if (appt.consult_mode === "online") {
                            const doctorJoined = Boolean(appt.follow_up_doctor_joined || appt.follow_up_meet_time_start);
                            const patientJoined = Boolean(appt.follow_up_patient_joined);

                            if (doctorJoined && !patientJoined) {
                                // SCENARIO 2 (Online): Doctor confirmed -> patient/pharmacist did not join
                                appt.follow_up_expire_reason = isPharmacist
                                    ? "Follow-up meet expired because of pharmacist unavailability"
                                    : "Follow-up meet expired because of patient unavailability";
                            } else if (patientJoined && !doctorJoined) {
                                // SCENARIO 3 (Online): Patient/pharmacist available -> doctor did not join
                                appt.follow_up_expire_reason = "Follow-up meet expired because of doctor unavailability";
                            } else {
                                // Neither joined -> doctor is practitioner required to initiate consultation
                                appt.follow_up_expire_reason = "Follow-up meet expired because of doctor unavailability";
                            }
                        } else {
                            // Offline Consultation mode
                            const patientArrived = Boolean(appt.follow_up_patient_arrived);

                            if (patientArrived) {
                                // SCENARIO 3 (Offline): Patient/pharmacist available/arrived at clinic -> doctor did not mark complete
                                appt.follow_up_expire_reason = "Follow-up meet expired because of doctor unavailability";
                            } else {
                                // SCENARIO 2 (Offline): Patient/pharmacist did not visit doctor
                                appt.follow_up_expire_reason = isPharmacist
                                    ? "Follow-up meet expired because of pharmacist unavailability"
                                    : "Follow-up meet expired because of patient unavailability";
                            }
                        }

                        await appt.save().catch(() => {});
                    }
                }
            }
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
        .populate("doctor_id", "first_name last_name specialization visit_address consult_fee phone email profile_img work_time_start work_time_end")
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
            .populate("doctor_id", "first_name last_name specialization visit_address work_time_start work_time_end")
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
//fetch booked slots for a specific doctor on a specific date (combines primary bookings and accepted follow-ups)
exports.getBookedSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        const targetDate = req.query.date || date;
        
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // 1. Regular appointments
        const bookedPrimary = await Appointment.find({
            doctor_id: doctorId,
            $or: [
                { appointment_date: targetDate },
                { appointment_date: { $gte: startOfDay, $lte: endOfDay } }
            ],
            status: { $in: ["pending", "confirmed"] }
        }).select('appointment_time');

        // 2. Accepted follow-ups
        const bookedFollowUps = await Appointment.find({
            doctor_id: doctorId,
            $or: [
                { follow_up_date: targetDate },
                { follow_up_date: { $gte: startOfDay, $lte: endOfDay } }
            ],
            follow_up_status: "accepted"
        }).select('follow_up_time appointment_time');

        const times1 = bookedPrimary.map(a => a.appointment_time).filter(Boolean);
        const times2 = bookedFollowUps.map(a => a.follow_up_time || a.appointment_time).filter(Boolean);

        const bookedTimes = [...new Set([...times1, ...times2])];

        res.status(200).json({
            success: true,
            bookedTimes,
            booked_slots: bookedTimes,
            slots: bookedTimes
        });

    } catch (error) {
        res.status(500).json({
            success: false,
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
            .populate("doctor_id", "first_name last_name specialization department consult_fee phone email profile_img visit_address work_time_start work_time_end")
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

// ── Follow-Up Appointment Controllers ──────────────────────────────────────

// Doctor sets / updates follow up date
exports.setFollowUpDate = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        // Check if prescription already exists or is marked as added
        const existingPrescription = await Prescription.findOne({ appointment_id: appointment._id });
        if (appointment.prescription_added || existingPrescription) {
            return res.status(400).json({
                success: false,
                message: "Prescription has already been added. Doctor cannot add or update follow-up status."
            });
        }

        return res.status(400).json({
            success: false,
            message: "Doctor can only set the follow-up consultation status while creating the prescription."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error setting follow-up date.",
            error: error.message
        });
    }
};

// Patient or Pharmacist sends follow-up request
exports.requestFollowUp = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        // Check ownership (user or pharmacist)
        const isOwner = String(appointment.user_id) === String(req.user.id);
        if (!isOwner) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        // Cannot request follow-up if doctor did not prescribe a follow-up
        const doctorAssignedDate = appointment.assigned_follow_up_date || appointment.follow_up_date;
        if (!doctorAssignedDate) {
            return res.status(400).json({
                success: false,
                message: "No follow-up was prescribed by the doctor for this consultation."
            });
        }

        const { follow_up_date, follow_up_time, follow_up_reason } = req.body;

        let targetDate = follow_up_date ? new Date(follow_up_date) : appointment.follow_up_date;

        if (!targetDate || isNaN(new Date(targetDate).getTime())) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid follow-up date."
            });
        }

        // Ensure target date is not in the past
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (new Date(targetDate) < todayStart) {
            return res.status(400).json({
                success: false,
                message: "Follow-up date cannot be in the past. Please select today or a future date."
            });
        }

        // Ensure doctor's assigned follow-up deadline has not passed (lasts till the last meet time of the assigned date)
        let lastMeetHour = 17;
        let lastMeetMin = 0;
        try {
            const doc = await Doctor.findById(appointment.doctor_id).select("work_time_end");
            if (doc && doc.work_time_end) {
                const parsed = parseTimeToHoursMinutes(doc.work_time_end);
                if (parsed.hours > 17 || (parsed.hours === 17 && parsed.minutes > 0)) {
                    lastMeetHour = parsed.hours;
                    lastMeetMin = parsed.minutes;
                }
            } else if (appointment.assigned_follow_up_time && appointment.assigned_follow_up_time !== appointment.appointment_time) {
                const parsed = parseTimeToHoursMinutes(appointment.assigned_follow_up_time);
                if (parsed.hours > 17 || (parsed.hours === 17 && parsed.minutes > 0)) {
                    lastMeetHour = parsed.hours;
                    lastMeetMin = parsed.minutes;
                }
            }
        } catch (err) {}

        if (doctorAssignedDate) {
            const d = new Date(doctorAssignedDate);
            let year, month, date;
            if (typeof doctorAssignedDate === "string" && doctorAssignedDate.includes("-")) {
                const dateParts = doctorAssignedDate.split("T")[0].split("-").map(Number);
                year = dateParts[0];
                month = dateParts[1] - 1;
                date = dateParts[2];
            } else {
                year = d.getFullYear();
                month = d.getMonth();
                date = d.getDate();
            }
            const assignedDeadline = new Date(year, month, date, lastMeetHour, lastMeetMin, 59, 999);
            if (new Date() > assignedDeadline) {
                return res.status(400).json({
                    success: false,
                    message: "The doctor's assigned follow-up date and time has passed. A follow-up cannot be requested."
                });
            }
        }

        if (appointment.follow_up_status === "requested") {
            return res.status(400).json({
                success: false,
                message: "Follow-up request is already pending doctor approval."
            });
        }

        // Preserve initial assigned follow-up date if not already set
        if (!appointment.assigned_follow_up_date && appointment.follow_up_date) {
            appointment.assigned_follow_up_date = appointment.follow_up_date;
            appointment.assigned_follow_up_time = `${String(lastMeetHour).padStart(2, '0')}:${String(lastMeetMin).padStart(2, '0')}`;
        }

        const requesterRole = appointment.booker_role === "pharmacist" ? "pharmacist" : "user";

        appointment.follow_up_date = targetDate;
        if (follow_up_time) appointment.follow_up_time = follow_up_time;
        if (follow_up_reason) appointment.follow_up_reason = follow_up_reason;
        appointment.follow_up_status = "requested";
        appointment.follow_up_requested_at = new Date();
        appointment.follow_up_requested_by = requesterRole;
        appointment.follow_up_expire_reason = null;
        appointment.follow_up_expired_at = null;
        appointment.follow_up_completed_at = null;
        appointment.follow_up_cancel_reason = null;
        appointment.follow_up_cancelled_at = null;
        appointment.follow_up_cancelled_by = null;
        appointment.follow_up_doctor_joined = false;
        appointment.follow_up_doctor_joined_at = null;
        appointment.follow_up_patient_joined = false;
        appointment.follow_up_patient_joined_at = null;
        appointment.follow_up_patient_arrived = false;
        appointment.follow_up_patient_arrived_at = null;
        appointment.follow_up_meet_time_start = null;
        appointment.follow_up_meet_time_end = null;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Free follow-up request sent to doctor successfully.",
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error submitting follow-up request.",
            error: error.message
        });
    }
};

// Doctor accepts or rejects follow-up request
exports.respondFollowUp = async (req, res) => {
    try {
        const { action } = req.body; // 'accept' or 'reject'
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (appointment.follow_up_status !== "requested") {
            return res.status(400).json({
                success: false,
                message: "No pending follow-up request to respond to for this appointment."
            });
        }

        // Strict date & time check: if scheduled follow-up date & time has crossed and doctor did not confirm/reject,
        // automatically mark as expired: "Follow-up meet expired without doctor confirmation"
        if (appointment.follow_up_date) {
            const scheduledFU = getFollowUpScheduledDateTime(appointment);
            const now = new Date();
            if (scheduledFU && now > scheduledFU) {
                appointment.follow_up_status = "expired";
                appointment.follow_up_expire_reason = "Follow-up meet expired without doctor confirmation";
                appointment.follow_up_expired_at = now;
                await appointment.save();
                return res.status(400).json({
                    success: false,
                    message: "The follow-up date and time has passed. Follow-up meet is marked as expired without doctor confirmation.",
                    appointment
                });
            }
        }

        if (action === "accept") {
            appointment.follow_up_status = "accepted";
        } else if (action === "reject") {
            appointment.follow_up_status = "rejected";
        } else {
            return res.status(400).json({ success: false, message: "Invalid action. Use 'accept' or 'reject'." });
        }

        appointment.follow_up_responded_at = new Date();
        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Follow-up request ${action === "accept" ? "accepted" : "rejected"} successfully.`,
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error responding to follow-up request.",
            error: error.message
        });
    }
};

// Doctor cancels accepted follow-up meeting with cancellation form reason
exports.cancelFollowUp = async (req, res) => {
    try {
        const { cancel_reason } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (appointment.follow_up_status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: "Only accepted follow-up appointments can be cancelled."
            });
        }

        if (!cancel_reason || !cancel_reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A cancellation reason is required to cancel the follow-up appointment."
            });
        }

        appointment.follow_up_status = "cancelled";
        appointment.follow_up_cancel_reason = cancel_reason.trim();
        appointment.follow_up_cancelled_at = new Date();
        appointment.follow_up_cancelled_by = "doctor";

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Accepted follow-up appointment cancelled successfully.",
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error cancelling follow-up appointment.",
            error: error.message
        });
    }
};

// ── Follow-Up Meeting Attendance & Completion Controllers ──────────────────

// Patient / Pharmacist joins online follow-up meet
exports.patientJoinFollowUp = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (String(appointment.user_id) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }
        if (appointment.follow_up_status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: `Cannot join follow-up meeting when status is ${appointment.follow_up_status}.`
            });
        }

        appointment.follow_up_patient_joined = true;
        if (!appointment.follow_up_patient_joined_at) appointment.follow_up_patient_joined_at = new Date();
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Patient joined follow-up meet successfully.",
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error joining follow-up meet.", error: error.message });
    }
};

// Patient / Pharmacist marks arrived / available at clinic (offline mode)
exports.patientArrivedFollowUp = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (String(appointment.user_id) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }
        if (appointment.follow_up_status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm clinic visit when status is ${appointment.follow_up_status}.`
            });
        }

        appointment.follow_up_patient_arrived = true;
        if (!appointment.follow_up_patient_arrived_at) appointment.follow_up_patient_arrived_at = new Date();
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "You have marked your availability at the clinic for follow-up.",
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error marking clinic visit.", error: error.message });
    }
};

// Doctor starts online follow-up meet
exports.doctorStartFollowUp = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (appointment.doctor_id !== req.user.id) return res.status(403).json({ success: false, message: "Access denied." });

        if (appointment.follow_up_status !== "accepted") {
            return res.status(400).json({
                success: false,
                message: `Cannot start follow-up meeting when status is ${appointment.follow_up_status}.`
            });
        }

        const scheduledFU = getFollowUpScheduledDateTime(appointment);
        if (scheduledFU) {
            const now = new Date();
            const windowEnd = new Date(scheduledFU.getTime() + 30 * 60 * 1000);
            if (now < scheduledFU) {
                return res.status(400).json({
                    success: false,
                    message: `Follow-up meeting can only be started at scheduled time (${appointment.follow_up_time || ''}).`
                });
            }
            if (now > windowEnd) {
                return res.status(400).json({
                    success: false,
                    message: "Follow-up meeting start window (30 mins from scheduled time) has expired."
                });
            }
        }

        appointment.follow_up_doctor_joined = true;
        if (!appointment.follow_up_doctor_joined_at) appointment.follow_up_doctor_joined_at = new Date();
        if (!appointment.follow_up_meet_time_start) appointment.follow_up_meet_time_start = new Date();
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Follow-up meeting started successfully. Time tracking initiated.",
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error starting follow-up meeting.", error: error.message });
    }
};

// Doctor completes follow-up consultation (online or offline)
exports.doctorCompleteFollowUp = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (appointment.doctor_id !== req.user.id) return res.status(403).json({ success: false, message: "Access denied." });

        if (!["accepted", "completed"].includes(appointment.follow_up_status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot complete follow-up when status is ${appointment.follow_up_status}.`
            });
        }

        appointment.follow_up_status = "completed";
        if (!appointment.follow_up_completed_at) appointment.follow_up_completed_at = new Date();
        if (!appointment.follow_up_meet_time_end) appointment.follow_up_meet_time_end = new Date();
        if (!appointment.follow_up_prescription_status || appointment.follow_up_prescription_status === "none") {
            appointment.follow_up_prescription_status = "pending";
        }
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Follow-up consultation marked as completed successfully.",
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error completing follow-up consultation.", error: error.message });
    }
};

// Doctor skips prescription for completed follow-up consultation
exports.doctorSkipFollowUpPrescription = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (appointment.doctor_id !== req.user.id) return res.status(403).json({ success: false, message: "Access denied." });
        if (appointment.follow_up_status !== "completed") {
            return res.status(400).json({ success: false, message: "Follow-up consultation must be completed first." });
        }

        appointment.follow_up_prescription_status = "skipped";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Prescription skipped for follow-up consultation.",
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error skipping prescription.", error: error.message });
    }
};

// Doctor marks offline follow-up patient as no-show (did not visit clinic)
exports.doctorMarkFollowUpNoShow = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
        if (appointment.doctor_id !== req.user.id) return res.status(403).json({ success: false, message: "Access denied." });

        if (["expired", "completed", "cancelled"].includes(appointment.follow_up_status)) {
            return res.status(400).json({
                success: false,
                message: `Follow-up consultation is already ${appointment.follow_up_status}.`
            });
        }

        const scheduledFU = getFollowUpScheduledDateTime(appointment);
        if (scheduledFU) {
            const now = new Date();
            const windowEnd = new Date(scheduledFU.getTime() + 30 * 60 * 1000);
            if (now < scheduledFU) {
                return res.status(400).json({
                    success: false,
                    message: `Action is only allowed starting at scheduled follow-up time (${appointment.follow_up_time || ''}).`
                });
            }
            if (now > windowEnd) {
                return res.status(400).json({
                    success: false,
                    message: "The 30-minute window for marking follow-up no-show has expired."
                });
            }
        }

        const isPharmacist = appointment.booker_role === "pharmacist" || appointment.follow_up_requested_by === "pharmacist";
        appointment.follow_up_status = "expired";
        appointment.follow_up_expired_at = new Date();
        appointment.follow_up_expire_reason = isPharmacist
            ? "Follow-up meet expired because of pharmacist unavailability"
            : "Follow-up meet expired because of patient unavailability";

        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Follow-up marked as Expired (${appointment.follow_up_expire_reason}).`,
            appointment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error marking follow-up patient no-show.", error: error.message });
    }
};

// Export helper for background auto-expiration
exports.checkAndExpireAppointments = checkAndExpireAppointments;


