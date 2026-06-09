const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach only required fields
        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please login again."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed.",
            error: error.message
        });
    }
};

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


module.exports = {authMiddleware, userOnly};