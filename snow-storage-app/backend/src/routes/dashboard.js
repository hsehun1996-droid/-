const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

router.get("/summary", requireAuth, (req, res) => {
  const warehouseCount = db.prepare("SELECT COUNT(*) c FROM warehouses").get().c;
  const itemCount = db.prepare("SELECT COUNT(*) c FROM items").get().c;

  const stockByWarehouse = db
    .prepare(
      `SELECT w.id AS warehouse_id, w.name AS warehouse_name,
              COALESCE(SUM(t.delta), 0) AS total_quantity
       FROM warehouses w
       LEFT JOIN transactions t ON t.warehouse_id = w.id
       GROUP BY w.id
       ORDER BY w.name`
    )
    .all();

  const stockByCategory = db
    .prepare(
      `SELECT COALESCE(i.category, '기타') AS category,
              COALESCE(SUM(t.delta), 0) AS total_quantity
       FROM items i
       LEFT JOIN transactions t ON t.item_id = i.id
       GROUP BY i.category
       ORDER BY category`
    )
    .all();

  const lowStock = db
    .prepare(
      `SELECT w.id AS warehouse_id, w.name AS warehouse_name,
              i.id AS item_id, i.name AS item_name, i.unit, i.min_stock,
              COALESCE(SUM(t.delta), 0) AS quantity
       FROM warehouses w
       CROSS JOIN items i
       LEFT JOIN transactions t ON t.warehouse_id = w.id AND t.item_id = i.id
       GROUP BY w.id, i.id
       HAVING quantity < i.min_stock
       ORDER BY (i.min_stock - quantity) DESC
       LIMIT 20`
    )
    .all();

  const recent = db
    .prepare(
      `SELECT t.id, t.type, t.quantity, t.occurred_at, t.memo,
              w.name AS warehouse_name, i.name AS item_name, i.unit, u.name AS user_name
       FROM transactions t
       JOIN warehouses w ON w.id = t.warehouse_id
       JOIN items i ON i.id = t.item_id
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT 20`
    )
    .all();

  res.json({
    warehouse_count: warehouseCount,
    item_count: itemCount,
    low_stock_count: lowStock.length,
    stock_by_warehouse: stockByWarehouse,
    stock_by_category: stockByCategory,
    low_stock: lowStock,
    recent_transactions: recent,
  });
});

module.exports = router;
