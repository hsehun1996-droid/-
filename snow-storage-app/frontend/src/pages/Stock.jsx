import React, { useEffect, useMemo, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Stock() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const isField = user?.role === "field";

  useEffect(() => {
    Promise.all([client.get("/branches"), client.get("/warehouses")]).then(([branchRes, warehouseRes]) => {
      setBranches(branchRes.data);
      setWarehouses(warehouseRes.data);
      if (isField && user.warehouse_id) {
        const wh = warehouseRes.data.find((w) => w.id === user.warehouse_id);
        setBranchId(String(wh?.branch_id || ""));
        setWarehouseId(String(user.warehouse_id));
      }
    });
  }, [user]);

  const warehousesInBranch = useMemo(
    () => (branchId ? warehouses.filter((w) => String(w.branch_id) === String(branchId)) : warehouses),
    [warehouses, branchId]
  );

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (branchId) params.branch_id = branchId;
    if (warehouseId) params.warehouse_id = warehouseId;
    client
      .get("/stock", { params })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, [branchId, warehouseId]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const branchKey = r.branch_name;
      if (!map.has(branchKey)) map.set(branchKey, new Map());
      const whMap = map.get(branchKey);
      if (!whMap.has(r.warehouse_name)) whMap.set(r.warehouse_name, []);
      whMap.get(r.warehouse_name).push(r);
    }
    return map;
  }, [rows]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-slate-800">재고 현황</h2>
        <div className="flex gap-2">
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setWarehouseId("");
            }}
            disabled={isField}
          >
            <option value="">전체 지사</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={isField}
          >
            <option value="">전체 창고</option>
            {warehousesInBranch.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : (
        [...grouped.entries()].map(([branchName, whMap]) => (
          <div key={branchName} className="mb-8">
            <h3 className="text-base font-bold text-brand-800 mb-2">{branchName}</h3>
            {[...whMap.entries()].map(([warehouseName, list]) => (
              <div key={warehouseName} className="mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-brand-50 px-4 py-2 font-semibold text-brand-800">{warehouseName}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="px-4 py-2">품목</th>
                      <th className="px-4 py-2">분류</th>
                      <th className="px-4 py-2 text-right">현재고</th>
                      <th className="px-4 py-2 text-right">최소기준</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const low = r.quantity < r.min_stock;
                      return (
                        <tr key={r.item_id} className={`border-b last:border-0 ${low ? "bg-red-50" : ""}`}>
                          <td className="px-4 py-2 font-medium text-slate-800">{r.item_name}</td>
                          <td className="px-4 py-2 text-slate-500">{r.category}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {r.quantity.toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500">
                            {r.min_stock.toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {low && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                부족
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
