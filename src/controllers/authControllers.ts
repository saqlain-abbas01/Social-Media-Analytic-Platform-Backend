import { Request, Response } from "express";
import { generateTokens } from "../utils/generateToken";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel";
import { log } from "console";

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

// ✅ POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ message: "Email already exists" });

  const user = new User({ email, password, name, role });
  await user.save();

  const { accessToken, refreshToken } = generateTokens(
    (user._id as string).toString(),
    user.role
  );
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

// ✅ POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const { accessToken, refreshToken } = generateTokens(
    (user._id as string).toString(),
    user.role
  );
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

// ✅ POST /api/auth/refresh
export const refresh = async (req: Request, res: Response) => {
  console.log("refresh api is called");
  const refreshToken = req.cookies?.refreshToken;
  console.log("token", refreshToken);

  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token required" });

  const user = await User.findOne({ refreshToken });
  if (!user) return res.status(403).json({ message: "Invalid refresh token" });

  const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
    userId: string;
  };
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId,
    user.role
  );

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ data: accessToken });
};

// ✅ POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required" });

  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    return res.status(200).json({ message: "Logged out" });
  }

  user.refreshToken = undefined;
  await user.save();

  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });

  res.json({ message: "Logged out successfully" });
};
