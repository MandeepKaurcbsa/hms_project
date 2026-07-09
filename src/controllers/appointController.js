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

//logged in user can view a single appointment
exports.getSingleAppointment = async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id)
            .populate(
                "doctor_id",
                "first_name last_name specialization department"
            )
            .populate(
                "patient_id",
                "first_name last_name gender age"
            );

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        // security check
        if (appointment.user_id !== req.user.id) {
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
        
        const bookedAppointments = await Appointment.find({
            doctor_id: doctorId,
            appointment_date: date,
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

// pharmacist can view all appointments (or filtered depending on UI)
exports.getPharmacistAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate(
                "doctor_id",
                "first_name last_name specialization department"
            )
            .populate(
                "patient_id",
                "first_name last_name gender age blood_group"
            )
            .sort({ appointment_date: -1, appointment_time: -1 });

        res.status(200).json({
            message: "Appointments fetched successfully",
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