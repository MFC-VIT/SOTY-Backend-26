const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) - 1, 0) || 0;
    const limit = parseInt(req.query.limit) || 10000000;
    const skip = page * limit;

    const sortParam = req.query.sort ? req.query.sort.split(",") : ["score"];
    const sortBy = { [sortParam[0]]: sortParam[1] || "desc" };

    const users = await UserModel.find({ isAdmin: false })
      .select("username score updatedAnswerAt isBan")
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateScore = async (req, res) => {
  const { username, newscore } = req.body;
  
  if (typeof newscore !== "number") {
    return res.status(400).json({ message: "Invalid score. Must be a number." });
  }

  try {
    const user = await UserModel.findOneAndUpdate(
      { username },
      { $set: { score: newscore } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Score updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updatePassword = async (req, res) => {
  const { username, newpassword } = req.body;
  
  try {
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newpassword, 10);
    await UserModel.updateOne({ username }, { $set: { password: hashedPassword } });
    
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const isBanStatus = async (req, res) => {
  const { username, banstatus } = req.body;
  
  if (typeof banstatus !== "boolean") {
    return res.status(400).json({ message: "Invalid input. Must be a boolean." });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isBan && banstatus) {
      const timeoutDuration = 15 * 60 * 1000;
      const timeElapsed = Date.now() - user.banTime;
      
      if (timeElapsed < timeoutDuration) {
        return res.status(200).json({
          message: `User is already banned. Please wait ${timeoutDuration - timeElapsed} ms before unbanning.`,
          remainingTime: timeoutDuration - timeElapsed,
          isBan: user.isBan,
        });
      }
    }

    const updateFields = banstatus ? { isBan: true, banTime: Date.now() } : { isBan: false, banTime: null };
    await UserModel.updateOne({ username }, { $set: updateFields });

    if (banstatus) {
      setTimeout(async () => {
        await UserModel.updateOne({ username }, { $set: { isBan: false } });
      }, 15 * 60 * 1000);
    }

    res.status(200).json({ message: `Ban status updated successfully to ${banstatus}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getAllUsers, updateScore, updatePassword, isBanStatus };
