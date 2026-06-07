const doctorOnly = (req, res, next) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (req.user.role !== "doctor") {
            return res.status(403).json({
                message: "Access denied. Doctors only."
            });
        }

        next();

    } catch (error) {
        res.status(500).json({
            message: "Authorization error",
            error: error.message
        });
    }
};

module.exports = doctorOnly;