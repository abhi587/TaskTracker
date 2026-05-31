const express = require("express");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
// const taskRoutes = require("./routes/taskRoutes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
// app.use("/api/tasks", taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 404,
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;
