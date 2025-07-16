import { User } from "../model/user.model.js"
import bcrypt, { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';


const setCookie = (res, token, rememberMe = true) => {
    const maxAge = rememberMe ? (7 * 24 * 60 * 60 * 1000) : (1 * 24 * 60 * 60 * 1000);

    res.cookie('userToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: maxAge,
        path: '/'
    });
};

const clearCookie = (res) => {
    res.clearCookie('userToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
    });
};


const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {

        const exisitngUser = await User.findOne({ email });

        if (exisitngUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        const token = jwt.sign(
            {
                id: newUser._id,
                email: newUser.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        setCookie(res, token, true);

        res.status(201).json({ message: "User registered successfully" });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        setCookie(res, token, true);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const logout = (req, res) => {
    try {
        clearCookie(res);
        res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error("Error logging out user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export { register, login, logout };