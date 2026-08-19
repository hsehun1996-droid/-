const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const branchRoutes = require("./routes/branches");
const warehouseRoutes = require("./routes/warehouses");
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");
const stockRoutes = require("./routes/stock");
const stockTargetRoutes = require("./routes/stock-targets");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/stock-targets", stockTargetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`제설창고관리시스템 API 서버 실행 중: http://localhost:${PORT}`);
});
