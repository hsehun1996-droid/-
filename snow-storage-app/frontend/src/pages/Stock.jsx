import React, { useEffect, useMemo, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Stock() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/warehouses").then((res) => {
      setWarehouses(res.data);
      if (user?.role === "field" && user.warehouse_id) {
        setWarehouseId(String(user.warehouse_id));
      }
    });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    client
      .get("/stock", { params: warehouseId ? { warehouse_id: warehouseId } : {} })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, [warehouseId]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.warehouse_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return map;
  }, [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">재고 현황</h2>
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          disabled={user?.role === "field"}
        >
          <option value="">전체 창고</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : (
        [...grouped.entries()].map(([warehouseName, list]) => (
          <div key={warehouseName} className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden">
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
        ))
      )}
    </div>
  );
}
