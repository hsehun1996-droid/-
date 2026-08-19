const bcrypt = require("bcryptjs");
const db = require("./db");

function upsertBranch(name) {
  const existing = db.prepare("SELECT * FROM branches WHERE name = ?").get(name);
  if (existing) return existing;
  const info = db.prepare("INSERT INTO branches (name) VALUES (?)").run(name);
  return db.prepare("SELECT * FROM branches WHERE id = ?").get(info.lastInsertRowid);
}

function upsertWarehouse(branchId, name) {
  const existing = db
    .prepare("SELECT * FROM warehouses WHERE branch_id = ? AND name = ?")
    .get(branchId, name);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO warehouses (branch_id, name) VALUES (?, ?)")
    .run(branchId, name);
  return db.prepare("SELECT * FROM warehouses WHERE id = ?").get(info.lastInsertRowid);
}

function upsertItem(category, name, unit, to_ton_factor) {
  const existing = db
    .prepare("SELECT * FROM items WHERE category = ? AND name = ?")
    .get(category, name);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO items (name, category, unit, to_ton_factor) VALUES (?, ?, ?, ?)")
    .run(name, category, unit, to_ton_factor);
  return db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid);
}

function upsertStockTarget(branchId, category, minStockTons) {
  const existing = db
    .prepare("SELECT * FROM stock_targets WHERE branch_id = ? AND category = ?")
    .get(branchId, category);
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO stock_targets (branch_id, category, min_stock_tons) VALUES (?, ?, ?)")
    .run(branchId, category, minStockTons);
  return db.prepare("SELECT * FROM stock_targets WHERE id = ?").get(info.lastInsertRowid);
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

// 충북본부 지사별 제설창고 구성
const BRANCH_WAREHOUSES = {
  진천지사: ["서청주IC", "지사", "일죽IC", "남이천IC", "마장휴게소"],
  제천지사: ["지사", "단양영업소", "치악휴게소"],
  충주지사: ["지사", "감곡IC", "괴산IC", "연풍IC"],
  보은지사: ["지사", "문의IC", "화서IC", "남상주IC", "내서"],
  엄정지사: ["지사", "서충주IC", "북진천IC"],
  상주지사: ["연풍IC", "점촌함창IC", "지사", "선산IC"],
};

const branchesByName = {};
const warehousesByBranch = {};
for (const [branchName, warehouseNames] of Object.entries(BRANCH_WAREHOUSES)) {
  const branch = upsertBranch(branchName);
  branchesByName[branchName] = branch;
  warehousesByBranch[branchName] = warehouseNames.map((wname) => upsertWarehouse(branch.id, wname));
}

// 품목: 카테고리(대분류)별 형태(톤백/개포/염수) 구분. to_ton_factor는 해당 형태의 1단위가
// 몇 톤에 해당하는지를 나타내며, 재고 합계 계산에 쓰임. 아래 값은 기본값(추정치)이므로
// 관리자 계정으로 로그인 후 "품목 관리" 화면에서 실제 값으로 수정 가능.
const CATEGORY_MIN_STOCK_TONS = { "소금(제설용)": 300, 염화칼슘: 200 };
upsertItem("소금(제설용)", "톤백", "톤", 1);
upsertItem("소금(제설용)", "개포", "kg", 0.001); // 톤백 1개(1,000kg)를 개포해도 무게 그대로 kg로 환산
upsertItem("염화칼슘", "톤백", "톤", 1);
upsertItem("염화칼슘", "염수", "리터", 1 / 1935); // 염화칼슘 1톤으로 염수 1,935리터 제조 기준

for (const branch of Object.values(branchesByName)) {
  for (const [category, minTons] of Object.entries(CATEGORY_MIN_STOCK_TONS)) {
    upsertStockTarget(branch.id, category, minTons);
  }
}

upsertUser("admin", "admin1234", "관리자", "admin", null);
upsertUser("office1", "office1234", "사무실 담당자", "office", null);

const jincheonHq = warehousesByBranch["진천지사"].find((w) => w.name === "지사");
const chungjuHq = warehousesByBranch["충주지사"].find((w) => w.name === "지사");
upsertUser("field1", "field1234", "현장 창고 담당자(진천지사)", "field", jincheonHq.id);
upsertUser("field2", "field1234", "현장 창고 담당자(충주지사)", "field", chungjuHq.id);

console.log("시드 데이터 생성 완료");
console.log(`- 지사 ${Object.keys(BRANCH_WAREHOUSES).length}개, 창고 ${Object.values(warehousesByBranch).flat().length}개 생성`);
console.log("- 품목: 소금(제설용) 톤백/개포(kg), 염화칼슘 톤백/염수(리터, 1톤=1,935리터 기준)");
console.log("  ※ 비축기준 소금 300톤·염화칼슘 200톤은 기본값입니다. 로그인 후 관리자 화면");
console.log("    (품목 관리 / 비축기준 관리)에서 실제 값으로 수정하세요.");
console.log("- admin / admin1234 (관리자)");
console.log("- office1 / office1234 (사무실)");
console.log(`- field1 / field1234 (현장, 진천지사 - ${jincheonHq.name})`);
console.log(`- field2 / field1234 (현장, 충주지사 - ${chungjuHq.name})`);
