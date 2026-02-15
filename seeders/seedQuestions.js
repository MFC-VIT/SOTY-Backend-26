// seedQuestions.js
require("dotenv").config({ path: "../.env" });
console.log(process.env.CONNECT_STRING)
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const userModel = require("../models/userModel");
const questionModel = require("../models/questionModel");

mongoose.connect(process.env.CONNECT_STRING);

const questionFilePath = path.join(__dirname, "../seederQuestions.json");

const seedQuestions = async () => {
  try {
    const users = await userModel.find({ questionsSeeded: { $ne: true } });

    for (const user of users) {
      const questions = JSON.parse(fs.readFileSync(questionFilePath, "utf8"));
      const userQuestions = questions.map((question) => ({
        user_id: user._id,
        question: question.question,
        answer: question.answer,
        points: question.points,
        difficultyLevel: question.difficultyLevel,
        answered: false,
      }));

      await questionModel.insertMany(userQuestions);

      await userModel.findByIdAndUpdate(user._id, { questionsSeeded: true });
    }
  } catch (error) {
    console.error("Error seeding questions:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedQuestions();
