const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointController");

const {authMiddleware} = require("../middleware/authMiddleware");

const doctorOnly = require("../middleware/doctorMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

//----------------------------------request by user ---------------------------------------- 

//book appointment
router.post("/book", authMiddleware, appointmentController.createAppointment);

//fetch all appointments user has
router.get( "/my", authMiddleware, appointmentController.getMyAppointments);

//---------------------------------request by doctor ------------------------------------------------ 

//view all asssigned appointments
router.get("/doctorAll", authMiddleware, doctorOnly, appointmentController.getDoctorAppointments);

//view a single assigned appointment to doc
router.get("/doctor/:id", authMiddleware, doctorOnly, appointmentController.getDoctorSingleAppointment);

//confirm appointment
router.put("/doctor/:id/confirmed", authMiddleware, doctorOnly, appointmentController.confirmAppointment);

//reject appointment
router.put("/doctor/:id/reject", authMiddleware, doctorOnly, appointmentController.rejectAppointment);

//complete appointment
router.put("/doctor/:id/complete", authMiddleware, doctorOnly, appointmentController.completeAppointment);

//-----------------------------------request by admin --------------------------------------------

//admin can fetch all the appointments
router.get("/adminAll", authMiddleware, adminOnly, appointmentController.getAllAppointments);

//admin can fetch single appointments
router.get("/admin/:id", authMiddleware, adminOnly, appointmentController.getAdminSingleAppointment);

//--------------------------cancellation api by user -------------------------------------

router.put("/:id/cancel", authMiddleware, appointmentController.cancelAppointment);

//--------------------------cancellation api by doc ------------------------------------------

router.put("/doctor/:id/cancel", authMiddleware, doctorOnly, appointmentController.doctorCancelAppointment);

//-----------------------------cancellation api by admin ----------------------------------
router.put("/admin/:id/cancel", authMiddleware, adminOnly, appointmentController.adminCancelAppointment);



//--------------------------------by user------------------------------------------------------

//fetch a single appointment booked by user
router.get("/:id", authMiddleware, appointmentController.getSingleAppointment);

module.exports = router;