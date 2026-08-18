const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

// 지사 x 창고 x 품목별 현재 재고 = 해당 조합 거래의 delta 합계
router.get("/", requireAuth, (req, res) => {
  const { warehouse_id, branch_id } = req.query;
  const clauses = [];
  const params = [];
  if (warehouse_id) {
    clauses.push("w.id = ?");
    params.push(warehouse_id);
  }
  if (branch_id) {
    clauses.push("w.branch_id = ?");
    params.push(branch_id);
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const rows = db
    .prepare(
      `SELECT b.id AS branch_id, b.name AS branch_name,
              w.id AS warehouse_id, w.name AS warehouse_name,
              i.id AS item_id, i.name AS item_name, i.category, i.unit, i.min_stock,
              COALESCE(SUM(t.delta), 0) AS quantity
       FROM warehouses w
       JOIN branches b ON b.id = w.branch_id
       CROSS JOIN items i
       LEFT JOIN transactions t ON t.warehouse_id = w.id AND t.item_id = i.id
       ${where}
       GROUP BY w.id, i.id
       ORDER BY b.name, w.name, i.category, i.name`
    )
    .all(...params);
  res.json(rows);
});

router.get("/low", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.id AS branch_id, b.name AS branch_name,
              w.id AS warehouse_id, w.name AS warehouse_name,
              i.id AS item_id, i.name AS item_name, i.category, i.unit, i.min_stock,
              COALESCE(SUM(t.delta), 0) AS quantity
       FROM warehouses w
       JOIN branches b ON b.id = w.branch_id
       CROSS JOIN items i
       LEFT JOIN transactions t ON t.warehouse_id = w.id AND t.item_id = i.id
       GROUP BY w.id, i.id
       HAVING COALESCE(SUM(t.delta), 0) < i.min_stock
       ORDER BY (i.min_stock - COALESCE(SUM(t.delta), 0)) DESC`
    )
    .all();
  res.json(rows);
});

module.exports = router;
