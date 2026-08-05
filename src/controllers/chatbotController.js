const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handleQuery = async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API Key is not configured in backend .env" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const systemInstruction = `You are MediBot, the official AI assistant for MEDIPULSE Hospital.
MEDIPULSE is a multi-specialty hospital offering online appointment booking, 24/7 medical data access, and integrated pharmacy services.
Your role is to help patients and visitors with general queries about the hospital, services, and policies.

CRITICAL INSTRUCTIONS:
1. If a user mentions general or short-term symptoms (like fever, cough, cold, headache, pain, etc.), be empathetic and suggest consulting a General Physician at MEDIPULSE. For other specialized conditions, guide them nicely to book an appointment with the appropriate specialist. Example: "I'm sorry to hear you're experiencing fever. While I cannot provide a medical diagnosis, I highly recommend consulting one of our expert General Physicians at MEDIPULSE. You can book an appointment directly by clicking the 'Book Appointment' button."
2. Be polite, professional, conversational, and concise.
3. If the user indicates they want to continue or has another question (e.g., typing "yes", "sure", or "what else"), respond warmly, invite them to describe their query, and remind them that they can also choose from options like booking an appointment, signing up, finding a doctor, or buying medicine.

KNOWLEDGE BASE ABOUT MEDIPULSE:
- Login: Click 'Login' on the top nav bar, choose your role (User, Doctor, Pharmacist), and sign in.
- About, Founders & Mission: Founded in 2026 by Sunam Ghosh, Ritu Singh, and Mandeep Kaur. Our mission is to eliminate administrative friction to put the focus back on healing by seamlessly connecting clinics, pharmacies, and patients.
- Key Stats: 500+ Partner Hospitals, 2M+ Patients Served, and 99.9% System Uptime.
- Core Values:
  1) Uncompromising Security: military-grade encryption for sensitive medical data.
  2) Patient-Centric: technology should heal, not hinder; everything starts with the patient.
  3) Collaborative Care: breaking down silos to enable seamless specialist communication.
  4) Lightning Fast: speed is critical in healthcare, systems operate in milliseconds.
- Facilities: Online/in-person consults, video calls, family profile management, integrated pharmacy, role-specific dashboards.
- Doctor fees & Specialists: Fees vary and are shown on doctor profiles. Specialists include Cardiology, Neurology, Pediatrics, etc.
- Refunds: 100% refund if Doctor/Admin cancels. If patient cancels, refund depends on time (100%, 80%, 50%, or 0%). Handled automatically.
- Booking an appointment: 1) Login 2) Click 'Book Appointment' 3) Select/Add Patient 4) Choose Doctor 5) Pick date/time, mode (Online/In-person), add symptoms 6) Confirm.
- Signup: 3 steps: Click 'Signup', verify email with OTP, fill in details (name, phone, password).
- Pharmacy: Buy medicines directly via the 'Pharmacy' page, categorized by type. Add to cart for delivery.
- Video Call: For online consults, a 'Join Video Call' button appears in the dashboard when the doctor confirms. It's built-in (no extra app).
- Dashboard: Manage appointments, view health score, cancel bookings, and manage family profiles.
- Doctor/Pharmacist Registration: Handled securely by the Admin team only.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction
    });

    // Format chat history to strictly alternate starting with a "user" message and ending with a "model" message
    let formattedHistory = [];
    if (Array.isArray(history)) {
      let expectedRole = "user";
      for (const h of history) {
        const textContent = (h.text || "").trim();
        if (!textContent) continue;

        const role = h.role === "user" ? "user" : "model";
        if (role === expectedRole) {
          formattedHistory.push({
            role,
            parts: [{ text: textContent }]
          });
          expectedRole = expectedRole === "user" ? "model" : "user";
        }
      }
      
      // The history must end with a 'model' response so that the next message sent is 'user'
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === "user") {
        formattedHistory.pop();
      }
    }

    console.log("Incoming prompt:", prompt);
    console.log("Incoming raw history:", history);
    console.log("Formatted history sent to Gemini:", JSON.stringify(formattedHistory, null, 2));

    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ message: "Failed to generate response. Please try again later." });
  }
};
