import jwt, { decode } from 'jsonwebtoken';
import { User } from '../model/user.model.js';

export const userAuth = async (req, res, next) => {
    try {
        const token = req.cookies.userToken || req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        req.userId = userId;
        req.user = user;
        next();
    } catch (error) {
        console.error("Error in userAuth middleware:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}