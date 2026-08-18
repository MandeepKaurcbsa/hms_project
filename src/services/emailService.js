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
 * Sends a Delivery OTP email when an order status changes to "out_for_delivery".
 */
async function sendDeliveryOtpEmail({ to, userName, orderId, otp, estimatedMinutes, address, deliveryBoyName, deliveryBoyPhone }) {
    const formattedAddress = address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip_code || ''}`.trim() : 'Your Address';
    const etaTime = new Date(Date.now() + (estimatedMinutes || 25) * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const body = `
<h2 style="margin-top:0;font-size:20px;color:#0f172a;">🚚 Your MediPulse Order is Out for Delivery!</h2>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">Hello <strong>${userName}</strong>,</p>
<p style="font-size:15px;color:#4a5568;line-height:1.7;">
  Your order <strong>#${(orderId || '').slice(-8).toUpperCase()}</strong> has been dispatched and is on its way to your delivery address!
</p>

<!-- OTP Highlight Box -->
<div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Your Delivery Verification OTP</p>
  <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#16a34a;margin:8px 0;font-family:monospace;">${otp}</div>
  <p style="margin:8px 0 0;font-size:13px;color:#166534;">Please share this 6-digit OTP with your delivery executive upon arrival to receive your package.</p>
</div>

<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:1px;">Delivery Details</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
    <tr><td style="padding:6px 0;color:#6b7280;">Estimated Delivery</td><td style="padding:6px 0;font-weight:700;color:#0d9488;">~${estimatedMinutes || 25} Mins (by ${etaTime})</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Delivery Agent</td><td style="padding:6px 0;font-weight:600;">${deliveryBoyName || 'Assigned Partner'}</td></tr>
    ${deliveryBoyPhone ? `<tr><td style="padding:6px 0;color:#6b7280;">Contact Agent</td><td style="padding:6px 0;font-weight:600;">📞 ${deliveryBoyPhone}</td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#6b7280;">Deliver To</td><td style="padding:6px 0;font-weight:500;">${formattedAddress}</td></tr>
  </table>
</div>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">
  Thank you for choosing <strong style="color:${BRAND_COLOR};">${BRAND_NAME}</strong>. If you did not place this order, please contact our support immediately.
</p>`;

    await transporter.sendMail({
        from: `${BRAND_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `🚚 Out for Delivery! Your Delivery OTP is ${otp} | ${BRAND_NAME}`,
        html: baseLayout(body)
    });
}

module.exports = {
    sendAppointmentConfirmedEmail,
    sendAppointmentPaymentSuccessEmail,
    sendAppointmentRejectedEmail,
    sendDeliveryOtpEmail
};

