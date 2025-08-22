import jwt, { decode } from 'jsonwebtoken';
import { User } from '../model/user.model.js';

export const userAuth = async (req, res, next) => {
    try {
        const token = req.cookies.userToken ||
            req.cookies.token ||
            req.headers.authorization?.split(' ')[1] ||
            req.headers['x-auth-token'];

        console.log('Token sources:', {
            cookie: !!req.cookies.userToken,
            bearer: !!req.headers.authorization,
            custom: !!req.headers['x-auth-token']
        });

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access - No token provided"
            });
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
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}