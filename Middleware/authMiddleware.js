const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded; // Contains id
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
