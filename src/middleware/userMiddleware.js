const userOnly = (req, res, next) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Users only."
            });
        }

        next();

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Authorization error.",
            error: error.message
        });
    }

};

module.exports = userOnly;