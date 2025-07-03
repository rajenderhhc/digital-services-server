require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const imagesRoute = require("./routes/imageRoutes");
const docsRoute = require("./routes/docusRoutes");
const mainRoutes = require("./routes/mainRoutes");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./Utils/appError");
require("./dbConfig");

const app = express();

process.on("uncaughtException", (err) => {
  console.log("Uncaught exception! Shutting down...");
  process.exit(1);
});

// Rate Limiter Middleware
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per window
//   message: {
//     status: 'fail',
//     message: 'Too many requests, please try again later.',
//   },
// });

// // Apply rate limiter to all requests
// app.use(limiter);
app.use(bodyParser.json());

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5139;
const START_PATH = process.env.START_PATH;

app.use("/api/images", imagesRoute);
app.use("/api/docs", docsRoute);

app.use(`${START_PATH}`, mainRoutes);

// Handle favicon requests
app.get("/favicon.ico", (req, res) => res.status(204));

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  server.close(() => {
    console.log("Process terminated!");
  });
});

module.exports = app;
