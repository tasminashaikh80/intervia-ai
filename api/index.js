import express from "express";

const app = express();

app.get("/api", (req, res) => {
  res.json({ status: "Intervia API is running" });
});

export default app;