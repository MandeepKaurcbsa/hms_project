const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointController");

const authMiddleware = require("../middleware/authMiddleware");

const userOnly = require("../middleware/userMiddleware");

const doctorOnly = require("../middleware/doctorMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

const pharmacistOnly = require("../middleware/pharmacistMiddleware");

//----------------------------------request by user ---------------------------------------- 

//book appointment
router.post("/book", authMiddleware, userOnly, appointmentController.createAppointment);

//fetch all appointments user has
router.get( "/my", authMiddleware, userOnly, appointmentController.getMyAppointments);

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

router.put("/:id/cancel", authMiddleware, userOnly, appointmentController.cancelAppointment);

//--------------------------cancellation api by doc ------------------------------------------

router.put("/doctor/:id/cancel", authMiddleware, doctorOnly, appointmentController.doctorCancelAppointment);

//-----------------------------cancellation api by admin ----------------------------------
router.put("/admin/:id/cancel", authMiddleware, adminOnly, appointmentController.adminCancelAppointment);



//--------------------------------by user------------------------------------------------------

//fetch a single appointment booked by user
router.get("/:id", authMiddleware, userOnly, appointmentController.getSingleAppointment);

//fetch booked slots for a specific doctor on a specific date (public API for booking modal)
router.get("/slots/:doctorId/:date", appointmentController.getBookedSlots);

//--------------------------------pharmacist side -------------------------------------------
//pharmacist can fetch all appointments
router.get("/pharmacistAll", authMiddleware, pharmacistOnly, appointmentController.getPharmacistAppointments);

module.exports = router;