const express = require("express");
const db = require("../db");
const { requireAuth, effectiveBranchId, canAccessWarehouse } = require("../auth");

const router = express.Router();

function computeDelta(type, quantity) {
  const q = Number(quantity);
  if (type === "in") return Math.abs(q);
  if (type === "out") return -Math.abs(q);
  return q; // adjust: signed값 그대로
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

// 전환: 같은 카테고리 내에서 형태만 바꿔 재기록(예: 톤백 -> 개포). 재고 총량(톤)은
// 변하지 않고, 창고 내 형태별 수량만 이동한다. 두 개의 ledger row(감소/증가)로 기록.
function insertConversion(payload, userId) {
  const { client_id, warehouse_id, from_item_id, to_item_id, quantity, memo, occurred_at } = payload;
  if (!client_id || !warehouse_id || !from_item_id || !to_item_id || quantity == null || !occurred_at) {
    return { error: "필수 항목이 누락되었습니다.", client_id };
  }
  if (from_item_id === to_item_id) {
    return { error: "전환 전/후 형태가 같을 수 없습니다.", client_id };
  }

  const fromClientId = `${client_id}:from`;
  const existing = db.prepare("SELECT * FROM transactions WHERE client_id = ?").get(fromClientId);
  if (existing) {
    const toRow = db
      .prepare("SELECT * FROM transactions WHERE client_id = ?")
      .get(`${client_id}:to`);
    return { status: "duplicate", transactions: [existing, toRow].filter(Boolean) };
  }

  const fromItem = db.prepare("SELECT * FROM items WHERE id = ?").get(from_item_id);
  const toItem = db.prepare("SELECT * FROM items WHERE id = ?").get(to_item_id);
  if (!fromItem || !toItem) {
    return { error: "품목을 찾을 수 없습니다.", client_id };
  }
  if (fromItem.category !== toItem.category) {
    return { error: "같은 품목(카테고리) 안에서만 전환할 수 있습니다.", client_id };
  }

  const fromQty = Math.abs(Number(quantity));
  const tons = fromQty * fromItem.to_ton_factor;
  const toQty = tons / toItem.to_ton_factor;

  try {
    db.exec("BEGIN");
    const infoFrom = db
      .prepare(
        `INSERT INTO transactions
          (client_id, warehouse_id, item_id, type, quantity, delta, memo, user_id, occurred_at)
         VALUES (?, ?, ?, 'convert', ?, ?, ?, ?, ?)`
      )
      .run(fromClientId, warehouse_id, from_item_id, fromQty, -fromQty, memo || null, userId, occurred_at);
    const infoTo = db
      .prepare(
        `INSERT INTO transactions
          (client_id, warehouse_id, item_id, type, quantity, delta, memo, user_id, occurred_at)
         VALUES (?, ?, ?, 'convert', ?, ?, ?, ?, ?)`
      )
      .run(`${client_id}:to`, warehouse_id, to_item_id, toQty, toQty, memo || null, userId, occurred_at);
    db.exec("COMMIT");
    return {
      status: "created",
      transactions: [
        db.prepare("SELECT * FROM transactions WHERE id = ?").get(infoFrom.lastInsertRowid),
        db.prepare("SELECT * FROM transactions WHERE id = ?").get(infoTo.lastInsertRowid),
      ],
    };
  } catch (e) {
    db.exec("ROLLBACK");
    return { error: "저장 중 오류가 발생했습니다: " + e.message, client_id };
  }
}

router.post("/convert", requireAuth, (req, res) => {
  const payload = req.body || {};
  if (!canAccessWarehouse(req.user, payload.warehouse_id)) {
    return res.status(403).json({ error: "소속 지사의 창고에만 기록할 수 있습니다." });
  }
  const result = insertConversion(payload, req.user.id);
  if (result.error) return res.status(400).json(result);
  const code = result.status === "created" ? 201 : 200;
  res.status(code).json(result);
});

router.post("/convert/sync", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.conversions) ? req.body.conversions : [];
  const results = items.map((payload) => {
    if (!canAccessWarehouse(req.user, payload.warehouse_id)) {
      return { client_id: payload.client_id, error: "소속 지사의 창고에만 기록할 수 있습니다." };
    }
    return { client_id: payload.client_id, ...insertConversion(payload, req.user.id) };
  });
  res.json({ results });
});

router.get("/", requireAuth, (req, res) => {
  const { warehouse_id, item_id, type, from, to, limit } = req.query;
  const branchId = effectiveBranchId(req.user, req.query.branch_id);
  const clauses = [];
  const params = [];
  if (warehouse_id) {
    clauses.push("t.warehouse_id = ?");
    params.push(warehouse_id);
  }
  if (branchId) {
    clauses.push("w.branch_id = ?");
    params.push(branchId);
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
      `SELECT t.*, b.name AS branch_name, w.name AS warehouse_name,
              i.category AS item_category, i.name AS item_name, i.unit AS item_unit, u.name AS user_name
       FROM transactions t
       JOIN warehouses w ON w.id = t.warehouse_id
       JOIN branches b ON b.id = w.branch_id
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
  const tx = req.body || {};
  if (!canAccessWarehouse(req.user, tx.warehouse_id)) {
    return res.status(403).json({ error: "소속 지사의 창고에만 기록할 수 있습니다." });
  }
  const result = insertTransaction(tx, req.user.id);
  if (result.error) return res.status(400).json(result);
  const code = result.status === "created" ? 201 : 200;
  res.status(code).json(result);
});

router.post("/sync", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  const results = items.map((tx) => {
    if (!canAccessWarehouse(req.user, tx.warehouse_id)) {
      return { client_id: tx.client_id, error: "소속 지사의 창고에만 기록할 수 있습니다." };
    }
    return { client_id: tx.client_id, ...insertTransaction(tx, req.user.id) };
  });
  res.json({ results });
});

module.exports = router;
