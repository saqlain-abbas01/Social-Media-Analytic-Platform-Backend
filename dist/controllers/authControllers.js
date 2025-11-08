"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = exports.register = void 0;
const generateToken_1 = require("../utils/generateToken");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("../models/userModel");
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
// ✅ POST /api/auth/register
const register = async (req, res) => {
    const { email, password, name, role } = req.body;
    const existing = await userModel_1.User.findOne({ email });
    if (existing)
        return res.status(400).json({ message: "Email already exists" });
    const user = new userModel_1.User({ email, password, name, role });
    await user.save();
    const { accessToken, refreshToken } = (0, generateToken_1.generateTokens)(user._id.toString(), user.role);
    user.refreshToken = refreshToken;
    await user.save();
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        accessToken,
    });
};
exports.register = register;
// ✅ POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await userModel_1.User.findOne({ email });
    if (!user)
        return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });
    const { accessToken, refreshToken } = (0, generateToken_1.generateTokens)(user._id.toString(), user.role);
    user.refreshToken = refreshToken;
    await user.save();
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        accessToken,
    });
};
exports.login = login;
// ✅ POST /api/auth/refresh
const refresh = async (req, res) => {
    console.log("refresh api is called");
    const refreshToken = req.cookies?.refreshToken;
    console.log("refreshToken", refreshToken);
    if (!refreshToken)
        return res.status(401).json({ message: "Refresh token required" });
    const user = await userModel_1.User.findOne({ refreshToken });
    if (!user)
        return res.status(403).json({ message: "Invalid refresh token" });
    const decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = (0, generateToken_1.generateTokens)(decoded.userId, user.role);
    user.refreshToken = newRefreshToken;
    await user.save();
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, accessToken });
};
exports.refresh = refresh;
// ✅ POST /api/auth/logout
const logout = async (req, res) => {
    const userId = req.user?.userId;
    const user = await userModel_1.User.findOne({ id: userId });
    if (!user) {
        res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
        return res.status(200).json({ message: "Logged out" });
    }
    user.refreshToken = undefined;
    await user.save();
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.json({ message: "Logged out successfully" });
};
exports.logout = logout;
//# sourceMappingURL=authControllers.js.map