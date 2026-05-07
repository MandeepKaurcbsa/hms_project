const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: "No token, access denied" });
        }

        // splits bearer 
        const cleanToken = token.split(" ")[1];

        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        res.status(401).json({ message: "Invalid Token!" });
    }
};

module.exports = authMiddleware;