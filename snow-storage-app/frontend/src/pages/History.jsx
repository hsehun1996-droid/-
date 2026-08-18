import React, { useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const TYPE_LABEL = { in: "입고", out: "출고", adjust: "조정" };
const TYPE_STYLE = {
  in: "bg-emerald-100 text-emerald-700",
  out: "bg-rose-100 text-rose-700",
  adjust: "bg-amber-100 text-amber-700",
};

export default function History() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState({ warehouse_id: "", type: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/warehouses").then((res) => {
      setWarehouses(res.data);
      if (user?.role === "field" && user.warehouse_id) {
        setFilters((f) => ({ ...f, warehouse_id: String(user.warehouse_id) }));
      }
    });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    client
      .get("/transactions", { params })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-4">입출고 이력</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          value={filters.warehouse_id}
          onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
          disabled={user?.role === "field"}
        >
          <option value="">전체 창고</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">전체 유형</option>
          <option value="in">입고</option>
          <option value="out">출고</option>
          <option value="adjust">조정</option>
        </select>
        <input
          type="date"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="px-4 py-2">날짜</th>
              <th className="px-4 py-2">창고</th>
              <th className="px-4 py-2">품목</th>
              <th className="px-4 py-2">유형</th>
              <th className="px-4 py-2 text-right">수량</th>
              <th className="px-4 py-2">담당자</th>
              <th className="px-4 py-2">메모</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  이력이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{r.occurred_at}</td>
                  <td className="px-4 py-2">{r.warehouse_name}</td>
                  <td className="px-4 py-2">{r.item_name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLE[r.type]}`}>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {r.quantity.toLocaleString()} {r.item_unit}
                  </td>
                  <td className="px-4 py-2">{r.user_name || "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{r.memo || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
