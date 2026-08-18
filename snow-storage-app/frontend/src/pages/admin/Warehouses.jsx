import React, { useEffect, useState } from "react";
import client from "../../api/client.js";

export default function AdminWarehouses() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  function reload() {
    client.get("/warehouses").then((res) => setRows(res.data));
  }

  useEffect(reload, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/warehouses", { name, location });
      setName("");
      setLocation("");
      reload();
    } catch (err) {
      setError(err.response?.data?.error || "추가에 실패했습니다.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("이 창고를 삭제하시겠습니까?")) return;
    try {
      await client.delete(`/warehouses/${id}`);
      reload();
    } catch (err) {
      alert(err.response?.data?.error || "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-4">창고 관리</h2>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">창고명</label>
          <input
            className="border border-slate-300 rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">위치</label>
          <input
            className="border border-slate-300 rounded-lg px-3 py-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <button className="bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold">추가</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {rows.map((w) => (
          <div key={w.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">{w.name}</div>
              <div className="text-sm text-slate-500">{w.location || "-"}</div>
            </div>
            <button onClick={() => handleDelete(w.id)} className="text-sm text-red-600 font-medium">
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
