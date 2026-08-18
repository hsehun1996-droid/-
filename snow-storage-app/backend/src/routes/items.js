const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM items ORDER BY category, name").all();
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, category, unit, min_stock } = req.body || {};
  if (!name || !unit) {
    return res.status(400).json({ error: "품목명과 단위를 입력하세요." });
  }
  const info = db
    .prepare(
      "INSERT INTO items (name, category, unit, min_stock) VALUES (?, ?, ?, ?)"
    )
    .run(name, category || null, unit, min_stock ?? 0);
  res.status(201).json(db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid));
});

router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "품목을 찾을 수 없습니다." });
  const { name, category, unit, min_stock } = req.body || {};
  db.prepare(
    "UPDATE items SET name = ?, category = ?, unit = ?, min_stock = ? WHERE id = ?"
  ).run(
    name ?? existing.name,
    category ?? existing.category,
    unit ?? existing.unit,
    min_stock ?? existing.min_stock,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id));
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const used = db
    .prepare("SELECT COUNT(*) c FROM transactions WHERE item_id = ?")
    .get(req.params.id).c;
  if (used > 0) {
    return res.status(400).json({ error: "입출고 이력이 있는 품목은 삭제할 수 없습니다." });
  }
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
