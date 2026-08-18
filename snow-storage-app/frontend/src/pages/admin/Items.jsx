import React, { useEffect, useState } from "react";
import client from "../../api/client.js";

const EMPTY = { name: "", category: "", unit: "", min_stock: 0 };

export default function AdminItems() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function reload() {
    client.get("/items").then((res) => setRows(res.data));
  }

  useEffect(reload, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/items", form);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setError(err.response?.data?.error || "추가에 실패했습니다.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("이 품목을 삭제하시겠습니까?")) return;
    try {
      await client.delete(`/items/${id}`);
      reload();
    } catch (err) {
      alert(err.response?.data?.error || "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-slate-800 mb-4">품목 관리</h2>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">품목명</label>
          <input
            className="border border-slate-300 rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">분류</label>
          <input
            className="border border-slate-300 rounded-lg px-3 py-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="제설제 / 장비 등"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">단위</label>
          <input
            className="border border-slate-300 rounded-lg px-3 py-2 w-20"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="포대"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">최소재고기준</label>
          <input
            type="number"
            className="border border-slate-300 rounded-lg px-3 py-2 w-28"
            value={form.min_stock}
            onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
          />
        </div>
        <button className="bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold">추가</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="px-4 py-2">품목명</th>
              <th className="px-4 py-2">분류</th>
              <th className="px-4 py-2">단위</th>
              <th className="px-4 py-2">최소재고기준</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium text-slate-800">{it.name}</td>
                <td className="px-4 py-2 text-slate-500">{it.category || "-"}</td>
                <td className="px-4 py-2">{it.unit}</td>
                <td className="px-4 py-2">{it.min_stock}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDelete(it.id)} className="text-sm text-red-600 font-medium">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
