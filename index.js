const express = require("express");
const bodyParser = require("body-parser");
const donenv = require("dotenv").config();
const connectDb = require("./db/dbConnection");
const AuthRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const questionRoute = require("./routes/questionRoute");
const cors = require("cors");

connectDb();

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.use("/auth", AuthRoute);
app.use("/users", userRoute);
app.use("/questions", questionRoute);

app.get("")

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
