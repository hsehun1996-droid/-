import React, { useEffect, useMemo, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { submitTransaction, submitConversion } from "../offline/sync.js";

const TYPE_OPTIONS = [
  { value: "in", label: "입고", color: "bg-emerald-600 active:bg-emerald-700" },
  { value: "out", label: "출고", color: "bg-rose-600 active:bg-rose-700" },
  { value: "adjust", label: "재고조정", color: "bg-amber-600 active:bg-amber-700" },
  { value: "convert", label: "전환", color: "bg-violet-600 active:bg-violet-700" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function EntryForm() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [itemId, setItemId] = useState("");
  const [fromItemId, setFromItemId] = useState("");
  const [toItemId, setToItemId] = useState("");
  const [type, setType] = useState("in");
  const [quantity, setQuantity] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayStr());
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isConvert = type === "convert";

  useEffect(() => {
    Promise.all([client.get("/branches"), client.get("/warehouses")]).then(([branchRes, warehouseRes]) => {
      setBranches(branchRes.data);
      setWarehouses(warehouseRes.data);
      const preferredWarehouse = warehouseRes.data.find((w) => w.id === user?.warehouse_id);
      const initialBranchId = preferredWarehouse?.branch_id || branchRes.data[0]?.id || "";
      setBranchId(String(initialBranchId));
      setWarehouseId(String(preferredWarehouse?.id || ""));
    });
    client.get("/items").then((res) => {
      setItems(res.data);
      setItemId(String(res.data[0]?.id || ""));
      setFromItemId(String(res.data[0]?.id || ""));
    });
  }, [user]);

  const warehousesInBranch = useMemo(
    () => warehouses.filter((w) => String(w.branch_id) === String(branchId)),
    [warehouses, branchId]
  );

  useEffect(() => {
    if (!warehousesInBranch.some((w) => String(w.id) === warehouseId)) {
      setWarehouseId(String(warehousesInBranch[0]?.id || ""));
    }
  }, [warehousesInBranch, warehouseId]);

  const categories = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push(it);
    }
    return map;
  }, [items]);

  const fromItem = useMemo(() => items.find((it) => String(it.id) === fromItemId), [items, fromItemId]);
  const toItemOptions = useMemo(
    () => (fromItem ? items.filter((it) => it.category === fromItem.category && it.id !== fromItem.id) : []),
    [items, fromItem]
  );
  const toItem = useMemo(() => items.find((it) => String(it.id) === toItemId), [items, toItemId]);

  useEffect(() => {
    if (!isConvert) return;
    if (!toItemOptions.some((it) => String(it.id) === toItemId)) {
      setToItemId(String(toItemOptions[0]?.id || ""));
    }
  }, [isConvert, toItemOptions, toItemId]);

  const convertedPreview = useMemo(() => {
    if (!fromItem || !toItem || !quantity) return null;
    const tons = Number(quantity) * fromItem.to_ton_factor;
    return tons / toItem.to_ton_factor;
  }, [fromItem, toItem, quantity]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!warehouseId || !quantity || Number(quantity) <= 0) {
      setMessage({ type: "error", text: "창고·수량을 확인하세요." });
      return;
    }
    if (isConvert && (!fromItemId || !toItemId)) {
      setMessage({ type: "error", text: "전환 전/후 형태를 확인하세요." });
      return;
    }
    if (!isConvert && !itemId) {
      setMessage({ type: "error", text: "품목을 확인하세요." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = isConvert
        ? await submitConversion({
            warehouse_id: Number(warehouseId),
            from_item_id: Number(fromItemId),
            to_item_id: Number(toItemId),
            quantity: Number(quantity),
            occurred_at: occurredAt,
            memo,
          })
        : await submitTransaction({
            warehouse_id: Number(warehouseId),
            item_id: Number(itemId),
            type,
            quantity: Number(quantity),
            occurred_at: occurredAt,
            memo,
          });
      if (result.queued) {
        setMessage({ type: "warn", text: "오프라인 상태입니다. 연결되면 자동으로 저장됩니다." });
      } else {
        setMessage({ type: "success", text: "저장되었습니다." });
      }
      setQuantity("");
      setMemo("");
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "저장에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4">입출고 등록</h2>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : message.type === "warn"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">유형</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`py-4 rounded-xl text-white font-bold text-lg ${opt.color} ${
                  type === opt.value ? "ring-4 ring-offset-2 ring-brand-300" : "opacity-60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isConvert && (
            <p className="text-xs text-slate-500 mt-2">
              같은 창고 안에서 형태만 바꿉니다 (예: 톤백 → 개포). 재고 총량(톤)은 변하지 않습니다.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">지사</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base bg-white"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">창고</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base bg-white"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehousesInBranch.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isConvert ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">전환 전 형태</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base bg-white"
                value={fromItemId}
                onChange={(e) => setFromItemId(e.target.value)}
              >
                {[...categories.entries()].map(([category, list]) => (
                  <optgroup key={category} label={category || "기타"}>
                    {list.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">전환 후 형태</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base bg-white"
                value={toItemId}
                onChange={(e) => setToItemId(e.target.value)}
                disabled={toItemOptions.length === 0}
              >
                {toItemOptions.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.unit})
                  </option>
                ))}
              </select>
              {toItemOptions.length === 0 && (
                <p className="text-xs text-red-600 mt-1">이 품목에는 전환할 다른 형태가 없습니다.</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">품목</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base bg-white"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              {[...categories.entries()].map(([category, list]) => (
                <optgroup key={category} label={category || "기타"}>
                  {list.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {isConvert ? "전환 수량 (전환 전 형태 기준)" : "수량"}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="w-full border border-slate-300 rounded-lg px-3 py-4 text-2xl font-bold text-center"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            required
          />
          {isConvert && convertedPreview != null && (
            <p className="text-sm text-slate-500 mt-2 text-center">
              → 전환 후 약{" "}
              <span className="font-semibold text-violet-700">
                {convertedPreview.toLocaleString(undefined, { maximumFractionDigits: 3 })} {toItem?.unit}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">날짜</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">담당자</label>
            <input
              disabled
              className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-3 text-base text-slate-500"
              value={user?.name || ""}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">메모 (선택)</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 강설 대비 보충"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || (isConvert && toItemOptions.length === 0)}
          className="w-full bg-brand-700 text-white font-bold py-4 rounded-xl text-lg active:bg-brand-800 disabled:opacity-60"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
