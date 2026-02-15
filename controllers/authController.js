const UserModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const generateAccessToken = (user) => {
  return jwt.sign(
    { username: user.username, id: user._id, teamname: user.teamname },
    process.env.ACCESS_TOKEN_SECRET,
    { 
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "45m" 
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { username: user.username, id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { 
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" 
    }
  );
};

const registerUser = async (req, res) => {
  try {
    const { username, teamname, password, score } = req.body;

    if (!username || !teamname || !password) {
      return res.status(400).json(
        { 
          message: "All fields are required"
        }
      );
    }

    const userExists = await UserModel.findOne({ username });
    if (userExists) {
      return res.status(400).json(
        { 
          message: "User already exists"
        }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      username,
      teamname,
      password: hashedPassword,
      score: score || 0,
    });

    const user = await newUser.save();
    const token = generateAccessToken(user);

    console.log(`User registered: ${user}`);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json(
        {
          message: "Username and password required" 
        }
      );
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json(
        { 
          message: "User not found" 
        }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json(
        { 
          message: "Incorrect password" 
        }
      );
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    console.log(`User logged in: ${user.username}`);
    res.status(200).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json(
      { 
        message: "Internal server error"
      }
    );
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(
        { 
          message: "Refresh token required"
        }
      );
    }

    const user = await UserModel.findOne({ refreshToken });
    if (!user) {
      return res.status(403).json(
        { 
          message: "Invalid refresh token"
        }
      );
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json(
          {
           message: "Invalid token" 
          }
        );

      const newAccessToken = generateAccessToken(user);
      res.status(200).json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(
      { 
        message: "Internal server error"
      }
    );
  }
};

module.exports = { registerUser, loginUser, refreshToken };
