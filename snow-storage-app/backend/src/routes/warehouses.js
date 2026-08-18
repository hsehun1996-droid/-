const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM warehouses ORDER BY name").all();
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, location } = req.body || {};
  if (!name) return res.status(400).json({ error: "창고명을 입력하세요." });
  try {
    const info = db
      .prepare("INSERT INTO warehouses (name, location) VALUES (?, ?)")
      .run(name, location || null);
    res.status(201).json(db.prepare("SELECT * FROM warehouses WHERE id = ?").get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: "이미 존재하는 창고명입니다." });
  }
});

router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { name, location } = req.body || {};
  const existing = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "창고를 찾을 수 없습니다." });
  db.prepare("UPDATE warehouses SET name = ?, location = ? WHERE id = ?").run(
    name ?? existing.name,
    location ?? existing.location,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM warehouses WHERE id = ?").get(req.params.id));
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const used = db
    .prepare("SELECT COUNT(*) c FROM transactions WHERE warehouse_id = ?")
    .get(req.params.id).c;
  if (used > 0) {
    return res.status(400).json({ error: "입출고 이력이 있는 창고는 삭제할 수 없습니다." });
  }
  db.prepare("DELETE FROM warehouses WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
