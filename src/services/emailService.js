const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const BRAND_COLOR = '#14b8a6';
const BRAND_NAME = 'MediPulse';

function baseLayout(body) {
    return `
<div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);border:1px solid #e2e8f0;">
  <div style="background:${BRAND_COLOR};padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${BRAND_NAME}</h1>
    <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px;">Healthcare, at your fingertips</p>
  </div>
  <div style="padding:36px 32px;color:#1a202c;">
    ${body}
  </div>
  <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#a0aec0;">&copy; ${new Date().getFullYear()} ${BRAND_NAME} Healthcare Systems. All rights reserved.</p>
  </div>
</div>`;
}

/**
 * Sends an email when a doctor confirms the appointment,
 * asking the user to complete payment via Razorpay.
 */
async function sendAppointmentConfirmedEmail({ to, userName, doctorName, appointmentDate, appointmentTime, consultFee, appointmentId, consult_mode }) {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
<h2 style="margin-top:0;font-size:20px;color:#0f172a;">Your Appointment is Confirmed! 🎉</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello <strong>${userName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  Great news! Dr. <strong>${doctorName}</strong> has <strong>confirmed</strong> your appointment.
  To complete the booking, please proceed with the payment.
</p>

<div style="background:#f0fdfa;border:1.5px solid #99f6e4;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:1px;">Appointment Details</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
    <tr><td style="padding:6px 0;color:#6b7280;">Doctor</td><td style="padding:6px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${formattedDate}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Mode</td><td style="padding:6px 0;font-weight:600;text-transform:capitalize;">${consult_mode || 'offline'}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Consultation Fee</td><td style="padding:6px 0;font-weight:700;color:#0d9488;font-size:16px;">₹${consultFee}</td></tr>
  </table>
</div>

<div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
  <p style="margin:0;font-size:14px;color:#92400e;">
    ⚠️ <strong>Action Required:</strong> Please complete the payment within <strong>24 hours</strong> to confirm your slot. Log in to your MediPulse dashboard and click <em>Pay Now</em>.
  </p>
</div>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  If you have any questions, feel free to contact our support team.
</p>
<p style="font-size:14px;color:#6b7280;margin-top:0;">
  Thank you for trusting <strong style="color:${BRAND_COLOR};">${BRAND_NAME}</strong> with your health.
</p>`;

    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `✅ Appointment Confirmed — Please Complete Payment | ${BRAND_NAME}`,
        html: baseLayout(body)
    });
}

/**
 * Sends a payment success email after the user pays via Razorpay.
 */
async function sendAppointmentPaymentSuccessEmail({ to, userName, doctorName, appointmentDate, appointmentTime, consultFee, consult_mode }) {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
<h2 style="margin-top:0;font-size:20px;color:#0f172a;">Payment Successful! 💳</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello <strong>${userName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  We've received your payment of <strong style="color:#0d9488;">₹${consultFee}</strong> for your appointment with Dr. <strong>${doctorName}</strong>.
  Your booking is now fully confirmed.
</p>

<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Payment Receipt</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
    <tr><td style="padding:6px 0;color:#6b7280;">Doctor</td><td style="padding:6px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${formattedDate}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Mode</td><td style="padding:6px 0;font-weight:600;text-transform:capitalize;">${consult_mode || 'offline'}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Amount Paid</td><td style="padding:6px 0;font-weight:700;color:#16a34a;font-size:16px;">₹${consultFee}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;"><span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">PAID</span></td></tr>
  </table>
</div>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  Please arrive <strong>10 minutes early</strong> for your appointment. You can view your appointment details in your MediPulse dashboard.
</p>
<p style="font-size:14px;color:#6b7280;margin-top:0;">
  Stay healthy! — <strong style="color:${BRAND_COLOR};">${BRAND_NAME} Team</strong>
</p>`;

    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `💳 Payment Confirmed — Your Appointment is Booked | ${BRAND_NAME}`,
        html: baseLayout(body)
    });
}

/**
 * Sends an email when a doctor rejects the appointment.
 */
async function sendAppointmentRejectedEmail({ to, userName, doctorName, appointmentDate, appointmentTime, cancelReason }) {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
<h2 style="margin-top:0;font-size:20px;color:#dc2626;">Appointment Declined ❌</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello <strong>${userName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  We regret to inform you that Dr. <strong>${doctorName}</strong> has declined/cancelled your appointment request.
</p>

<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Appointment Details</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
    <tr><td style="padding:6px 0;color:#6b7280;">Doctor</td><td style="padding:6px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${formattedDate}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
    ${cancelReason ? `<tr><td style="padding:6px 0;color:#6b7280;">Reason</td><td style="padding:6px 0;font-weight:600;color:#dc2626;">${cancelReason}</td></tr>` : ''}
  </table>
</div>

<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  You can book another appointment with Dr. <strong>${doctorName}</strong> or choose a different specialist through your dashboard.
</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="http://localhost:5173/doctors" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Find Another Doctor</a>
</div>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  If you have already paid or need any assistance, please contact our support desk.
</p>
<p style="font-size:14px;color:#6b7280;margin-top:0;">
  Best regards, — <strong style="color:${BRAND_COLOR};">${BRAND_NAME} Team</strong>
</p>`;

    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `❌ Appointment Declined | ${BRAND_NAME}`,
        html: baseLayout(body)
    });
}

/**
 * Sends an email to a doctor when a patient books a new appointment.
 */
async function sendDoctorAppointmentBookingEmail({ to, doctorName, patientName, appointmentDate, appointmentTime, consultMode, disease, symptoms, confirmUrl, rejectUrl }) {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
<h2 style="margin-top:0;font-size:20px;color:#0f172a;">New Appointment Request! 📅</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello Dr. <strong>${doctorName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  A new appointment has been requested with you. Below are the details of the request:
</p>

<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;">Booking Info</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
    <tr><td style="padding:6px 0;color:#6b7280;">Patient</td><td style="padding:6px 0;font-weight:600;">${patientName}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${formattedDate}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Mode</td><td style="padding:6px 0;font-weight:600;text-transform:capitalize;">${consultMode || 'offline'}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Disease/Concern</td><td style="padding:6px 0;font-weight:600;">${disease}</td></tr>
    ${symptoms ? `<tr><td style="padding:6px 0;color:#6b7280;">Symptoms</td><td style="padding:6px 0;">${symptoms}</td></tr>` : ''}
  </table>
</div>

<div style="margin: 28px 0; text-align: center;">
    <a href="${confirmUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin-right: 15px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Accept Appointment</a>
    <a href="${rejectUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">Reject Appointment</a>
</div>

<p style="font-size:13px;color:#94a3b8;line-height:1.5;">
  Please click one of the buttons above to process this request directly from this email. Alternatively, you can log in to your MediPulse dashboard.
</p>`;

    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `🔔 New Appointment Request: ${patientName} | ${BRAND_NAME}`,
        html: baseLayout(body)
    });
}

/**
 * Sends a video call reminder email to both doctor and patient.
 */
async function sendVideoCallReminderEmails({ doctorEmail, doctorName, patientEmail, patientName, roomId, appointmentDate, appointmentTime }) {
    const videoCallLink = `http://localhost:5173/video-call/${roomId}`;

    const doctorBody = `
<h2 style="margin-top:0;font-size:20px;color:#0d9488;">Video Call Reminder 📞</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello Dr. <strong>${doctorName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  This is a reminder that your online consultation with patient <strong>${patientName}</strong> is ready.
  Please click the button below to join the video call room.
</p>

<div style="background:#f0fdfa;border:1.5px solid #99f6e4;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center;">
    <a href="${videoCallLink}" style="background-color:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">Join Video Call</a>
</div>

<table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;margin-bottom:20px;">
  <tr><td style="padding:6px 0;color:#6b7280;">Patient</td><td style="padding:6px 0;font-weight:600;">${patientName}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${new Date(appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
</table>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  Please ensure your camera and microphone are working before joining.
</p>`;

    const patientBody = `
<h2 style="margin-top:0;font-size:20px;color:#0d9488;">Video Call Reminder 📞</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello <strong>${patientName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  Your online consultation with Dr. <strong>${doctorName}</strong> is starting.
  Please click the button below to join the video call room and meet your doctor.
</p>

<div style="background:#f0fdfa;border:1.5px solid #99f6e4;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center;">
    <a href="${videoCallLink}" style="background-color:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">Join Video Call</a>
</div>

<table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;margin-bottom:20px;">
  <tr><td style="padding:6px 0;color:#6b7280;">Doctor</td><td style="padding:6px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;font-weight:600;">${new Date(appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;font-weight:600;">${appointmentTime}</td></tr>
</table>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  Please ensure your camera and microphone are working before joining.
</p>`;

    // Send to doctor
    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: doctorEmail,
        subject: `📞 Video Call Joining Link — Dr. ${doctorName} | ${BRAND_NAME}`,
        html: baseLayout(doctorBody)
    });

    // Send to patient
    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: patientEmail,
        subject: `📞 Join your Video Consultation with Dr. ${doctorName} | ${BRAND_NAME}`,
        html: baseLayout(patientBody)
    });
}

module.exports = {
    sendAppointmentConfirmedEmail,
    sendAppointmentPaymentSuccessEmail,
    sendAppointmentRejectedEmail,
    sendDoctorAppointmentBookingEmail,
    sendVideoCallReminderEmails
};
