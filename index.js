const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const connectDb = require("./db/dbConnection");
const AuthRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const questionRoute = require("./routes/questionRoute");
const cors = require("cors");

connectDb();

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      const allowedOrigins = ['*'];

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === 'development'
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

app.use("/auth", AuthRoute);
app.use("/users", userRoute);
app.use("/questions", questionRoute);

app.get("");

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
