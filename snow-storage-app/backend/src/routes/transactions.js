const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

function computeDelta(type, quantity) {
  const q = Number(quantity);
  if (type === "in") return Math.abs(q);
  if (type === "out") return -Math.abs(q);
  return q; // adjust: signed value as given
}

function insertTransaction(tx, userId) {
  const { client_id, warehouse_id, item_id, type, quantity, memo, occurred_at } = tx;
  if (!client_id || !warehouse_id || !item_id || !type || quantity == null || !occurred_at) {
    return { error: "필수 항목이 누락되었습니다.", client_id };
  }
  if (!["in", "out", "adjust"].includes(type)) {
    return { error: "유효하지 않은 입출고 유형입니다.", client_id };
  }

  const existing = db
    .prepare("SELECT * FROM transactions WHERE client_id = ?")
    .get(client_id);
  if (existing) {
    return { status: "duplicate", transaction: existing };
  }

  const delta = computeDelta(type, quantity);
  try {
    const info = db
      .prepare(
        `INSERT INTO transactions
          (client_id, warehouse_id, item_id, type, quantity, delta, memo, user_id, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        client_id,
        warehouse_id,
        item_id,
        type,
        Math.abs(Number(quantity)),
        delta,
        memo || null,
        userId,
        occurred_at
      );
    return {
      status: "created",
      transaction: db.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid),
    };
  } catch (e) {
    return { error: "저장 중 오류가 발생했습니다: " + e.message, client_id };
  }
}

router.get("/", requireAuth, (req, res) => {
  const { warehouse_id, item_id, type, from, to, limit } = req.query;
  const clauses = [];
  const params = [];
  if (warehouse_id) {
    clauses.push("t.warehouse_id = ?");
    params.push(warehouse_id);
  }
  if (item_id) {
    clauses.push("t.item_id = ?");
    params.push(item_id);
  }
  if (type) {
    clauses.push("t.type = ?");
    params.push(type);
  }
  if (from) {
    clauses.push("t.occurred_at >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("t.occurred_at <= ?");
    params.push(to);
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const lim = Math.min(Number(limit) || 200, 1000);
  const rows = db
    .prepare(
      `SELECT t.*, w.name AS warehouse_name, i.name AS item_name, i.unit AS item_unit, u.name AS user_name
       FROM transactions t
       JOIN warehouses w ON w.id = t.warehouse_id
       JOIN items i ON i.id = t.item_id
       LEFT JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY t.occurred_at DESC, t.id DESC
       LIMIT ?`
    )
    .all(...params, lim);
  res.json(rows);
});

router.post("/", requireAuth, (req, res) => {
  const result = insertTransaction(req.body || {}, req.user.id);
  if (result.error) return res.status(400).json(result);
  const code = result.status === "created" ? 201 : 200;
  res.status(code).json(result);
});

router.post("/sync", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  const results = items.map((tx) => ({
    client_id: tx.client_id,
    ...insertTransaction(tx, req.user.id),
  }));
  res.json({ results });
});

module.exports = router;
