
import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
        const token = jwt.sign({userId}, process.env.jwt_SECRET, {
        expiresIn: '15d',
    });


res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000, //MS
        httpOnly: true, // Prevent XSS attacks cross-site scripting attacts
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: process.env.NODE_ENV !== "development",
    });

};