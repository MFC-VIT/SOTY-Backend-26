const fs = require("fs");
const path = require("path");
const userModel = require("../models/userModel");
const questionModel = require("../models/questionModel");

const questionFilePath = path.join(__dirname, "../questions.json");

const getQuestions = async (req, res) => {
  const { id } = req.params;
  const { difficultyLevel } = req.query;

  try {

    const isLastAnswered = await checkLastQuestionAnswered(id, difficultyLevel);
    if (!isLastAnswered) {
      return res.status(400).json({
        message: "Please answer the last question before getting a new one.",
      });
    }

    const totalQuestions = await questionModel.countDocuments();
    if (totalQuestions === 0) {
      return res.status(200).json({
        message: "No questions available.",
      });
    }

    const existingUnansweredQuestion = await questionModel.findOne({
      user_id: id,
      answered: "pending",
      difficultyLevel: difficultyLevel,
    });
    console.log("existingUnansweredQuestion", existingUnansweredQuestion);

    if (existingUnansweredQuestion) {
      const questionToDisplay = {
        question: existingUnansweredQuestion.question,
        difficultyLevel: existingUnansweredQuestion.difficultyLevel,
        points: existingUnansweredQuestion.points,
      };

      res.status(200).json(questionToDisplay);
    } else {
      const filteredQuestion = await questionModel.find({
        user_id: id,
        difficultyLevel: difficultyLevel,
        answered: "false",
      });

      if (filteredQuestion.length === 0) {
        return res.status(200).json({
          message: "No questions available for the specified difficulty level.",
        });
      }

      console.log("filteredQuestion", filteredQuestion);

      const randomIndex = Math.floor(Math.random() * filteredQuestion.length);
      const selectedQuestion = filteredQuestion[randomIndex];

      await questionModel.findOneAndUpdate(
        { _id: selectedQuestion._id },
        { answered: "pending" }
      );

      console.log("selectedQuestion", selectedQuestion);
      const questionToDisplay = {
        question: selectedQuestion.question,
        difficultyLevel: selectedQuestion.difficultyLevel,
        points: selectedQuestion.points,
      };

      res.status(200).json(questionToDisplay);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const allQuestions = await questionModel.find({
      user_id: req.params.id,
    });
    if (allQuestions.length === 0) {
      return res
        .status(404)
        .json({ message: "The user haven't started the game." });
    }
    res.status(200).json(allQuestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllAnsweredQuestions = async (req, res) => {
  try {
    const allQuestions = await questionModel.find({
      user_id: req.params.id,
      answered: "true",
    });
    if (allQuestions.length === 0) {
      return res
        .status(404)
        .json(
          { 
            message: "The user haven't started the game." 
          }
        );
    }
    res.status(200).json(allQuestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const postAnswerQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, points, difficultyLevel } = req.body;

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json(
        { 
          message: "User not found." 
        }
      );
    }
    console.log("user", user);
    const postAnswers = await questionModel.findOne({
      user_id: id,
      question: question,
      points: points,
      answered: "pending",
      difficultyLevel: difficultyLevel,
    });
    if (typeof points !== "number") {
      return res
        .status(400)
        .json(
          {
             message: "Invalid score. Score must be a number" 
          }
        );
    }
    if (postAnswers) {
      const questions = JSON.parse(fs.readFileSync(questionFilePath, "utf8"));
      const matchingQuestion = questions.filter(
        (userquestion) => userquestion.question === question
      );
      console.log("matchingQuestion", matchingQuestion);
      if (matchingQuestion && matchingQuestion[0].answer === answer) {
        console.log("matchingQuestion.answer", matchingQuestion.answer);
        const user = await userModel.findById(id);
        if (user) {
          const updatedScore = user.score + points;
          await userModel.findByIdAndUpdate(id, {
            updatedAnswerAt: Date.now(),
          });
          await userModel.findByIdAndUpdate(id, { score: updatedScore });
          await userModel.findByIdAndUpdate(id, { canAnswer: true });
          await userModel.findByIdAndUpdate(id, {
            inCorrectStreaks: 0,
          });

          await questionModel.findOneAndUpdate(
            { user_id: id, question: question },
            { answered: "true" }
          );
          return res.status(200).json({
            message: "Correct answer!",
            updatedScore: updatedScore,
          });
        } else {
          return res.status(404).json(
            { 
              message: "User not found." 
            }
          );
        }
      } else {
        await userModel.findByIdAndUpdate(id, {
          lastIncorrectAttemptTime: Date.now(),
        });
        const updatedStreaks = user.inCorrectStreaks + 1;
        await userModel.findByIdAndUpdate(id, {
          inCorrectStreaks: updatedStreaks,
        });
        await user.save();

        console.log(user.inCorrectStreaks);
        console.log(user.lastIncorrectAttemptTime);

        return res.status(200).json({
          message: "Incorrect answer. Try again.",
          wrongAttempts: `${updatedStreaks}`,
        });
      }
    }
    console.log("postAnswers", postAnswers);
    return res.status(404).json(
      {
      message: "Already answered the question",
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const TimeOut = 2 * 60 * 1000;

const getAnsweringStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userModel.findById(id);
    const canAnswer = user.canAnswer;
    if (!canAnswer) {
      const timeElapsed = Date.now() - user.lastIncorrectAttemptTime;

      if (timeElapsed < TimeOut) {
        const remainingTime = TimeOut - timeElapsed;
        const thirdIncorrectTime = user.lastIncorrectAttemptTime;
        await userModel.findByIdAndUpdate(req.params.id, { canAnswer: false });
        return res.status(200).json({
          message: `You have made too many wrong attempts. Please wait for ${remainingTime} milliseconds.`,
          remainingTime: remainingTime,
          canAnswer: canAnswer,
          thirdIncorrectTime: thirdIncorrectTime,
        });
      } else {
        await userModel.findByIdAndUpdate(id, {
          canAnswer: true,
        });
        return res.status(200).json({
          message: `You can answer`,
          canAnswer: canAnswer,
        });
      }
    }
    console.log(user);
    return res.status(200).json(
      { 
        canAnswer,
        message: "User can answer" 
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getQuestions,
  getAllQuestions,
  getAllAnsweredQuestions,
  postAnswerQuestion,
  getAnsweringStatus,
};
