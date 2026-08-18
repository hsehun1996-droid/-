const bcrypt = require("bcryptjs");
const db = require("./db");

function upsertWarehouse(name, location) {
  const existing = db.prepare("SELECT * FROM warehouses WHERE name = ?").get(name);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO warehouses (name, location) VALUES (?, ?)")
    .run(name, location);
  return db.prepare("SELECT * FROM warehouses WHERE id = ?").get(info.lastInsertRowid);
}

function upsertItem(name, category, unit, min_stock) {
  const existing = db.prepare("SELECT * FROM items WHERE name = ?").get(name);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO items (name, category, unit, min_stock) VALUES (?, ?, ?, ?)")
    .run(name, category, unit, min_stock);
  return db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid);
}

function upsertUser(username, password, name, role, warehouse_id) {
  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (existing) return existing;
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, name, role, warehouse_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(username, hash, name, role, warehouse_id || null);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
}

const wh1 = upsertWarehouse("서울지사 제설창고", "서울");
const wh2 = upsertWarehouse("강원지사 제설창고", "강원");

upsertItem("염화칼슘", "제설제", "포대", 200);
upsertItem("소금(제설용)", "제설제", "포대", 300);
upsertItem("모래", "제설제", "톤", 50);
upsertItem("제설삽", "장비", "개", 20);
upsertItem("제설기(살포기)", "장비", "대", 3);

upsertUser("admin", "admin1234", "관리자", "admin", null);
upsertUser("office1", "office1234", "사무실 담당자", "office", null);
upsertUser("field1", "field1234", "현장 창고 담당자", "field", wh1.id);
upsertUser("field2", "field1234", "현장 창고 담당자2", "field", wh2.id);

console.log("시드 데이터 생성 완료");
console.log("- admin / admin1234 (관리자)");
console.log("- office1 / office1234 (사무실)");
console.log("- field1 / field1234 (현장, " + wh1.name + ")");
console.log("- field2 / field1234 (현장, " + wh2.name + ")");
