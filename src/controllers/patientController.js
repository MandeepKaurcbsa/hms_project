const Patient = require("../models/patientModel");
const Appointment = require("../models/appointModel");

//-----------------------------user side ------------------------------------------------------------------------

exports.getMyPatients = async (req, res) => {
    try {

        const patients = await Patient.find({
            user_id: req.user.id
        });

        return res.status(200).json({
            success: true,
            count: patients.length,
            patients
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getSinglePatient = async (req, res) => {
    try {

        const patient = await Patient.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            success: true,
            patient
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updatePatient = async (req, res) => {
    try {

        const patient = await Patient.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        return res.status(200).json({
            success: true,
            patient: updatedPatient
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.inactivatePatient = async (req, res) => {
    try {

        const patient = await Patient.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        patient.status = "inactive";

        await patient.save();

        return res.status(200).json({
            success: true,
            message: "Patient inactivated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.activatePatient = async (req, res) => {
    try {

        const patient = await Patient.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        patient.status = "active";

        await patient.save();

        return res.status(200).json({
            success: true,
            message: "Patient activated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getPatientAppointments = async (req, res) => {
    try {

        const patient = await Patient.findOne({
            _id: req.params.id,
            user_id: req.user.id
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const appointments = await Appointment.find({
            patient_id: req.params.id
        });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


//------------------------------Doctor side  ----------------------------------------------------

exports.getDoctorPatients = async (req, res) => {
    try {

        const doctorId = req.user.id;

        const appointments = await Appointment.find({
            doctor_id: doctorId
        });

        const patientIds = [
            ...new Set(
                appointments.map(
                    appointment => appointment.patient_id
                )
            )
        ];

        const patients = await Patient.find({
            _id: { $in: patientIds }
        });

        return res.status(200).json({
            success: true,
            count: patients.length,
            patients
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDoctorSinglePatient = async (req, res) => {
    try {

        const doctorId = req.user.id;
        const patientId = req.params.id;

        const appointmentExists = await Appointment.findOne({
            doctor_id: doctorId,
            patient_id: patientId
        });

        if (!appointmentExists) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Patient not assigned to this doctor."
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found."
            });
        }

        return res.status(200).json({
            success: true,
            patient
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDoctorPatientAppointments = async (req, res) => {
    try {

        const doctorId = req.user.id;
        const patientId = req.params.id;

        const patientAssigned = await Appointment.findOne({
            doctor_id: doctorId,
            patient_id: patientId
        });

        if (!patientAssigned) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Patient not assigned to this doctor."
            });
        }

        const appointments = await Appointment.find({
            doctor_id: doctorId,
            patient_id: patientId
        }).sort({
            appointment_date: -1
        });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//-------------------------doctor side --------------------------------------------------------

exports.getDoctorPatients = async (req, res) => {
    try {

        const doctorId = req.user.id;

        const appointments = await Appointment.find({
            doctor_id: doctorId
        });

        const patientIds = [
            ...new Set(
                appointments.map(
                    appointment => appointment.patient_id
                )
            )
        ];

        const patients = await Patient.find({
            _id: {
                $in: patientIds
            }
        });

        return res.status(200).json({
            success: true,
            count: patients.length,
            patients
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch patients",
            error: error.message
        });
    }
};

exports.getDoctorSinglePatient = async (req, res) => {
    try {

        const doctorId = req.user.id;
        const patientId = req.params.id;

        const appointmentExists = await Appointment.findOne({
            doctor_id: doctorId,
            patient_id: patientId
        });

        if (!appointmentExists) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Patient not assigned to this doctor."
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found."
            });
        }

        return res.status(200).json({
            success: true,
            patient
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch patient",
            error: error.message
        });
    }
};

exports.getDoctorPatientAppointments = async (req, res) => {
    try {

        const doctorId = req.user.id;
        const patientId = req.params.id;

        const appointmentExists = await Appointment.findOne({
            doctor_id: doctorId,
            patient_id: patientId
        });

        if (!appointmentExists) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Patient not assigned to this doctor."
            });
        }

        const appointments = await Appointment.find({
            doctor_id: doctorId,
            patient_id: patientId
        }).sort({
            appointment_date: -1
        });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to fetch appointment history",
            error: error.message
        });
    }
};


