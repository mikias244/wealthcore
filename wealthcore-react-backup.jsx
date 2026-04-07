import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Settings, Plus, Trash2, Pencil, GripVertical, Upload, CalendarDays, CheckCircle2, Camera, ArrowRight, Shield, PiggyBank, CreditCard, Wallet, BadgeDollarSign } from "lucide-react";

const STORAGE_KEY = "monthly-budget-tracking-v2-complete";
const DEFAULT_PIN = "1634";

const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const hiddenMoney = (n, visible) => (visible ? money(n) : "••••");

const defaultState = {
  pin: DEFAULT_PIN,
  monthlyIncome: 4500,
  piggyBank: 3200,
  eqLocked: 0,
  spendingBudget: 300,
  weeklyBudget: 75,
  debtStart: 22000,
  debtRemaining: 22000,
  debtRegularPayment: 550,
  debtExtraPaid: 0,
  commissionRule: { save: 70, debt: 20, self: 10 },
  categories: [
    "Groceries",
    "Eating Out",
    "Food Delivery",
    "Transport",
    "Bills",
    "Savings",
    "Debt",
    "Trading",
    "Shopping",
    "Subscriptions",
    "Other",
  ],
  rows: {
    Income: [
      { id: uid(), name: "Paycheck 1", planned: 1750, actual: 1750, enabled: true },
      { id: uid(), name: "Paycheck 2", planned: 2750, actual: 2750, enabled: true },
      { id: uid(), name: "Bonus / Commission", planned: 0, actual: 0, enabled: true },
    ],
    Bills: [
      { id: uid(), name: "Rent", planned: 1037, actual: 1037, enabled: true },
      { id: uid(), name: "Water", planned: 45, actual: 45, enabled: true },
      { id: uid(), name: "Hydro (avg)", planned: 18, actual: 18, enabled: true },
      { id: uid(), name: "Internet", planned: 22, actual: 22, enabled: true },
      { id: uid(), name: "Insurance", planned: 148.89, actual: 148.89, enabled: true },
      { id: uid(), name: "Gas", planned: 80, actual: 80, enabled: true },
      { id: uid(), name: "Phone", planned: 30, actual: 30, enabled: true },
      { id: uid(), name: "Streaming", planned: 23, actual: 23, enabled: true },
      { id: uid(), name: "Donation", planned: 450, actual: 450, enabled: true },
    ],
    Savings: [
      { id: uid(), name: "Piggy Bank", planned: 1600, actual: 1600, enabled: true },
      { id: uid(), name: "EQ Locked Transfer", planned: 0, actual: 0, enabled: true },
      { id: uid(), name: "Emergency Fund", planned: 0, actual: 0, enabled: false },
    ],
    Expenses: [
      { id: uid(), name: "Groceries", planned: 120, actual: 56.2, enabled: true },
      { id: uid(), name: "Eating Out", planned: 80, actual: 12.5, enabled: true },
      { id: uid(), name: "Food Delivery", planned: 50, actual: 0, enabled: true },
      { id: uid(), name: "Transport", planned: 50, actual: 16.75, enabled: true },
      { id: uid(), name: "Trading", planned: 0, actual: 0, enabled: true },
      { id: uid(), name: "Other", planned: 0, actual: 0, enabled: true },
    ],
    Debt: [
      { id: uid(), name: "Consolidation Payment", planned: 550, actual: 550, enabled: true },
      { id: uid(), name: "Extra Payment", planned: 0, actual: 0, enabled: true },
    ],
  },
  transactions: [
    { id: uid(), date: "2026-04-03", merchant: "Thrifty Foods", amount: 56.2, category: "Groceries", source: "manual", note: "", flagged: false },
    { id: uid(), date: "2026-04-05", merchant: "Blue Nile Food", amount: 12.5, category: "Eating Out", source: "manual", note: "", flagged: false },
    { id: uid(), date: "2026-04-06", merchant: "Uber", amount: 16.75, category: "Transport", source: "manual", note: "", flagged: false },
  ],
  sundayReview: {
    lastCompletedFor: "",
    checks: {
      upload: false,
      weekly: false,
      monthly: false,
      piggy: false,
      debt: false,
      rules: false,
    },
  },
};

function startOfSunday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function nextSunday(date = new Date()) {
  const d = startOfSunday(date);
  d.setDate(d.getDate() + 7);
  return d;
}

function formatDateInput(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  const day = `${x.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPreviousQuarterRange(now = new Date()) {
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const prevQuarter = (currentQuarter + 3 - 1) % 4;
  const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const startMonth = prevQuarter * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

function getRange(filter, customStart, customEnd) {
  const now = new Date();
  if (filter === "all") return { start: "1900-01-01", end: "2999-12-31" };
  if (filter === "current") {
    return {
      start: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (filter === "previous") {
    return {
      start: formatDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (filter === "quarter") return getPreviousQuarterRange(now);
  if (filter === "year") {
    const y = now.getFullYear() - 1;
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: customStart, end: customEnd };
}

function categorizeMerchant(merchant = "") {
  const m = merchant.toLowerCase();
  if (["uber eats", "skip", "doordash"].some((x) => m.includes(x))) return "Food Delivery";
  if (["thrifty", "save on", "walmart", "costco", "market", "foods"].some((x) => m.includes(x))) return "Groceries";
  if (["restaurant", "cafe", "food", "pizza", "sushi", "nile"].some((x) => m.includes(x))) return "Eating Out";
  if (["uber", "shell", "esso", "chevron", "gas"].some((x) => m.includes(x))) return "Transport";
  if (["wealthsimple", "tradingview", "broker", "crypto"].some((x) => m.includes(x))) return "Trading";
  if (["telus", "rogers", "fido", "bell", "hydro", "insurance", "internet"].some((x) => m.includes(x))) return "Bills";
  if (["netflix", "spotify", "apple", "prime"].some((x) => m.includes(x))) return "Subscriptions";
  return "Other";
}

function parseOCRText(text = "") {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const amountMatch = line.match(/(-?\$?\d+[\d,]*\.?\d{0,2})\s*$/);
    if (!amountMatch) continue;
    const amount = Number(amountMatch[1].replace(/[$,]/g, ""));
    if (Number.isNaN(amount)) continue;
    const dateMatch = line.match(/(20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}(?:[-\/]20\d{2})?)/);
    const merchant = line.replace(amountMatch[0], "").replace(dateMatch?.[0] || "", "").trim() || "Uploaded Transaction";
    out.push({
      id: uid(),
      date: dateMatch ? normalizeDate(dateMatch[0]) : formatDateInput(new Date()),
      merchant,
      amount: Math.abs(amount),
      category: categorizeMerchant(merchant),
      source: "upload",
      note: "",
      flagged: /uber eats|skip|doordash|trading|crypto|broker/i.test(merchant),
    });
  }
  return out;
}

function normalizeDate(v) {
  if (/^20\d{2}-\d{1,2}-\d{1,2}$/.test(v)) return v;
  const clean = v.replace(/\//g, "-");
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  if (parts.length >= 2) {
    const year = parts[2] && parts[2].length === 4 ? parts[2] : `${new Date().getFullYear()}`;
    return `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return formatDateInput(new Date());
}

function sumEnabled(rows) {
  return rows.filter((r) => r.enabled).reduce((a, r) => a + Number(r.actual || 0), 0);
}

function pct(actual, planned) {
  if (!planned) return actual ? 100 : 0;
  return Math.round((actual / planned) * 100);
}

function Card({ title, value, sub, icon, visible, className = "" }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/8 backdrop-blur p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/60">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{visible ? value : "••••"}</div>
          {sub ? <div className="mt-1 text-xs text-white/60">{sub}</div> : null}
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-white/90">{icon}</div>
      </div>
    </div>
  );
}

function SectionTable({ title, rows, onManage, visible }) {
  const [sortMode, setSortMode] = useState("default");

  const enabledRows = rows.filter((r) => r.enabled);
  const totalPlanned = enabledRows.reduce((a, r) => a + Number(r.planned || 0), 0);
  const totalActual = enabledRows.reduce((a, r) => a + Number(r.actual || 0), 0);
  const biggestActual = enabledRows.reduce((max, row) => Math.max(max, Number(row.actual || 0)), 0);

  const sortedRows = [...enabledRows].sort((a, b) => {
    if (sortMode === "highest") return Number(b.actual || 0) - Number(a.actual || 0);
    if (sortMode === "lowest") return Number(a.actual || 0) - Number(b.actual || 0);
    if (sortMode === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/60">
            Planned {hiddenMoney(totalPlanned, visible)} · Actual {hiddenMoney(totalActual, visible)} · {pct(totalActual, totalPlanned)}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="rounded-2xl bg-black/20 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="default">Default order</option>
            <option value="highest">Highest to lowest</option>
            <option value="lowest">Lowest to highest</option>
            <option value="name">A to Z</option>
          </select>
          <button onClick={onManage} className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            Manage
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-[420px]">
        <table className="w-full text-sm text-white">
          <thead className="sticky top-0 z-10 bg-white/10 text-xs uppercase text-white/60 backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Planned</th>
              <th className="px-3 py-2 text-left">Actual</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const rowActual = Number(row.actual || 0);
              const isBiggest = biggestActual > 0 && rowActual === biggestActual;
              return (
                <tr key={row.id} className={`border-t border-white/10 ${isBiggest ? "bg-amber-400/10" : ""}`}>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{hiddenMoney(row.planned, visible)}</td>
                  <td className="px-3 py-2">{hiddenMoney(row.actual, visible)}</td>
                  <td className={`px-3 py-2 ${pct(row.actual, row.planned) > 100 ? "text-amber-300" : "text-emerald-300"}`}>
                    <div className="flex items-center gap-2">
                      <span>{pct(row.actual, row.planned)}%</span>
                      {isBiggest ? <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">Highest</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManageSectionModal({ open, onClose, title, rows, setRows }) {
  const dragId = useRef(null);
  if (!open) return null;

  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () => setRows((prev) => [...prev, { id: uid(), name: "New Item", planned: 0, actual: 0, enabled: true }]);

  const onDrop = (targetId) => {
    const sourceId = dragId.current;
    if (!sourceId || sourceId === targetId) return;
    setRows((prev) => {
      const next = [...prev];
      const from = next.findIndex((x) => x.id === sourceId);
      const to = next.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    dragId.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Manage {title}</h3>
            <p className="text-sm text-white/60">Edit, remove, toggle, and drag rows to reorder.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 px-3 py-2 text-white">Close</button>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              draggable
              onDragStart={() => (dragId.current = row.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(row.id)}
              className="grid grid-cols-[0.3fr,1.2fr,0.8fr,0.8fr,0.6fr,0.4fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex justify-center text-white/60"><GripVertical className="h-5 w-5" /></div>
              <input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} className="rounded-xl bg-white/10 px-3 py-2 text-white outline-none" />
              <input type="number" value={row.planned} onChange={(e) => updateRow(row.id, { planned: Number(e.target.value) })} className="rounded-xl bg-white/10 px-3 py-2 text-white outline-none" />
              <input type="number" value={row.actual} onChange={(e) => updateRow(row.id, { actual: Number(e.target.value) })} className="rounded-xl bg-white/10 px-3 py-2 text-white outline-none" />
              <button onClick={() => updateRow(row.id, { enabled: !row.enabled })} className={`rounded-xl px-3 py-2 text-sm ${row.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>{row.enabled ? "On" : "Off"}</button>
              <button onClick={() => removeRow(row.id)} className="rounded-xl bg-red-500/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="mt-4 flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-white"><Plus className="h-4 w-4" /> Add row</button>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(defaultState);
  const [enteredPin, setEnteredPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState("");
  const [filter, setFilter] = useState("current");
  const [customStart, setCustomStart] = useState(formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(formatDateInput(new Date()));
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [uploadPreview, setUploadPreview] = useState([]);
  const [ocrTextFallback, setOcrTextFallback] = useState("");
  const [reviewQueue, setReviewQueue] = useState([]);
  const [savePulse, setSavePulse] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavePulse(true);
    const t = setTimeout(() => setSavePulse(false), 1200);
    return () => clearTimeout(t);
  }, [data, ready]);

  const range = useMemo(() => getRange(filter, customStart, customEnd), [filter, customStart, customEnd]);

  const filteredTransactions = useMemo(() => {
    return data.transactions.filter((t) => t.date >= range.start && t.date <= range.end);
  }, [data.transactions, range]);

  const spentThisView = useMemo(() => filteredTransactions.reduce((a, t) => a + Number(t.amount || 0), 0), [filteredTransactions]);
  const weeklySpend = useMemo(() => {
    const sunday = formatDateInput(startOfSunday(new Date()));
    const next = formatDateInput(nextSunday(new Date()));
    return data.transactions
      .filter((t) => t.date >= sunday && t.date < next)
      .reduce((a, t) => a + Number(t.amount || 0), 0);
  }, [data.transactions]);

  const sectionTotals = useMemo(() => {
    return {
      income: sumEnabled(data.rows.Income),
      bills: sumEnabled(data.rows.Bills),
      savings: sumEnabled(data.rows.Savings),
      expenses: sumEnabled(data.rows.Expenses),
      debt: sumEnabled(data.rows.Debt),
    };
  }, [data.rows]);

  const sundayKey = formatDateInput(startOfSunday(new Date()));
  const reviewDone = Object.values(data.sundayReview.checks).every(Boolean) && data.sundayReview.lastCompletedFor === sundayKey;
  const nextReviewDate = nextSunday(new Date()).toLocaleDateString();

  const warnings = useMemo(() => {
    const items = [];
    if (weeklySpend > data.weeklyBudget) items.push(`Weekly spending is over budget by ${money(weeklySpend - data.weeklyBudget)}.`);
    const eatingOut = filteredTransactions.filter((t) => ["Eating Out", "Food Delivery"].includes(t.category)).reduce((a, t) => a + t.amount, 0);
    if (eatingOut > 75) items.push(`Eating out + delivery is high at ${money(eatingOut)}.`);
    const trading = filteredTransactions.filter((t) => t.category === "Trading").reduce((a, t) => a + t.amount, 0);
    if (trading > 0) items.push(`Trading-related spending detected: ${money(trading)}.`);
    if (spentThisView > data.spendingBudget && ["current", "custom"].includes(filter)) items.push(`Monthly spending budget exceeded by ${money(spentThisView - data.spendingBudget)}.`);
    return items;
  }, [weeklySpend, data.weeklyBudget, filteredTransactions, spentThisView, data.spendingBudget, filter]);

  const budgetDelta = data.spendingBudget - spentThisView;
  const budgetTone = budgetDelta < 0 ? "text-red-300 bg-red-500/15 border-red-400/20" : budgetDelta <= data.spendingBudget * 0.2 ? "text-amber-200 bg-amber-500/15 border-amber-400/20" : "text-emerald-200 bg-emerald-500/15 border-emerald-400/20";

  const setSectionRows = (section, updater) => {
    setData((prev) => ({ ...prev, rows: { ...prev.rows, [section]: typeof updater === "function" ? updater(prev.rows[section]) : updater } }));
  };

  const updateTransaction = (id, patch) => {
    setData((prev) => ({ ...prev, transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  };

  const deleteTransaction = (id) => {
    setData((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }));
  };

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDraft, setQuickAddDraft] = useState({
    date: formatDateInput(new Date()),
    merchant: "",
    amount: "",
    category: "Other",
  });

  const addTransaction = () => {
    setData((prev) => ({
      ...prev,
      transactions: [
        {
          id: uid(),
          date: quickAddDraft.date || formatDateInput(new Date()),
          merchant: quickAddDraft.merchant || "New Transaction",
          amount: Number(quickAddDraft.amount || 0),
          category: quickAddDraft.category || "Other",
          source: "manual",
          note: "",
          flagged: false,
        },
        ...prev.transactions,
      ],
    }));
    setQuickAddDraft({
      date: formatDateInput(new Date()),
      merchant: "",
      amount: "",
      category: "Other",
    });
    setQuickAddOpen(false);
  };

  const processUploads = async (files) => {
    const previews = files.map((f) => ({ id: uid(), name: f.name, url: URL.createObjectURL(f), file: f }));
    setUploadPreview(previews);
  };

  const runOCR = async () => {
    if (!uploadPreview.length && !ocrTextFallback.trim()) return;
    setOcrBusy(true);
    setOcrStatus("Reading upload...");
    let combinedText = ocrTextFallback.trim();

    try {
      if (uploadPreview.length) {
        const mod = await import("tesseract.js");
        for (let i = 0; i < uploadPreview.length; i++) {
          setOcrStatus(`Extracting text from image ${i + 1} of ${uploadPreview.length}...`);
          const result = await mod.recognize(uploadPreview[i].url, "eng");
          combinedText += `\n${result.data.text || ""}`;
        }
      }
    } catch (e) {
      setOcrStatus("OCR could not run in this preview. You can paste transaction text below and continue.");
    }

    const parsed = parseOCRText(combinedText);
    setReviewQueue(parsed);
    setTab("upload");
    setOcrBusy(false);
    setOcrStatus(parsed.length ? `Found ${parsed.length} possible transactions.` : "No transactions found yet. You can paste text manually below.");
  };

  const approveQueue = () => {
    if (!reviewQueue.length) return;
    setData((prev) => ({ ...prev, transactions: [...reviewQueue, ...prev.transactions] }));
    setReviewQueue([]);
    setUploadPreview([]);
    setOcrTextFallback("");
    setOcrStatus("Transactions added.");
  };

  if (!ready) return <div className="min-h-screen bg-slate-950" />;

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.28),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_22%),linear-gradient(135deg,#09090b,#111827,#0f172a)] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
            <div className="mb-6 flex items-center justify-center">
              <svg width="60" height="60" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <path d="M10 20 L30 80 L50 40 L70 80 L90 20" fill="none" stroke="url(#g2)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-center text-2xl font-semibold">WealthCore</h1>
            <input
              type="password"
              inputMode="numeric"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-center text-xl tracking-[0.4em] text-white outline-none"
            />
            <button
              onClick={() => enteredPin === data.pin && setUnlocked(true)}
              className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-4 text-lg font-medium text-white transition hover:bg-violet-400"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.28),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_22%),linear-gradient(135deg,#09090b,#111827,#0f172a)] text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <svg width="28" height="28" viewBox="0 0 100 100" className="shrink-0">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <path d="M10 20 L30 80 L50 40 L70 80 L90 20" fill="none" stroke="url(#g)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-2xl font-semibold">WealthCore</h1>
            </div>
            <p className="text-sm text-white/60">Control your money. Build your core.</p>
          </div>
          <div className="flex items-center gap-2">
            {savePulse ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">Saved ✓</span> : null}
            <button onClick={() => setShowNumbers((v) => !v)} className="rounded-2xl bg-white/10 p-3 hover:bg-white/15">{showNumbers ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
            <button onClick={() => setSettingsOpen(true)} className="rounded-2xl bg-white/10 p-3 hover:bg-white/15"><Settings className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card title="Income" value={money(sectionTotals.income)} sub="Planned income this month" icon={<BadgeDollarSign className="h-5 w-5" />} visible={showNumbers} />
          <Card title="Bills" value={money(sectionTotals.bills)} sub="Fixed obligations" icon={<Wallet className="h-5 w-5" />} visible={showNumbers} />
          <Card title="Piggy Bank" value={money(data.piggyBank)} sub="Toward $5,000 EQ transfer" icon={<PiggyBank className="h-5 w-5" />} visible={showNumbers} />
          <Card title="Spending" value={money(spentThisView)} sub={`Budget ${money(data.spendingBudget)} · Remaining ${money(Math.max(0, data.spendingBudget - spentThisView))}`} icon={<CreditCard className="h-5 w-5" />} visible={showNumbers} />
          <Card title="Debt Left" value={money(data.debtRemaining)} sub={`${Math.ceil(data.debtRemaining / Math.max(1, data.debtRegularPayment))} months at base payment`} icon={<ArrowRight className="h-5 w-5" />} visible={showNumbers} />
        </div>

        <div className="fixed bottom-5 right-5 z-40">
          <button onClick={() => setQuickAddOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_10px_30px_rgba(124,58,237,0.45)] hover:bg-violet-400" aria-label="Quick add transaction">
            <Plus className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 rounded-3xl border border-white/10 bg-white/8 p-2 backdrop-blur md:w-fit">
          {[
            ["dashboard", "Dashboard"],
            ["monthly", "Monthly"],
            ["upload", "Upload"],
            ["review", "Sunday Review"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`rounded-2xl px-4 py-3 text-sm ${tab === id ? "bg-violet-500 text-white" : "text-white/70 hover:bg-white/10"}`}>{label}</button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Quick Actions</h2>
                  <div className="text-xs text-white/50">Tap to jump</div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "Upload latest screenshots", action: () => setTab("upload"), icon: <Camera className="h-4 w-4" /> },
                    { label: `Review weekly spend vs ${money(data.weeklyBudget)}`, action: () => setTab("review"), icon: <CalendarDays className="h-4 w-4" /> },
                    { label: `Review monthly spend vs ${money(data.spendingBudget)}`, action: () => setTab("monthly"), icon: <CreditCard className="h-4 w-4" /> },
                    { label: "Update piggy bank total", action: () => setSettingsOpen(true), icon: <PiggyBank className="h-4 w-4" /> },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10">
                      <div className="mb-2 text-violet-300">{item.icon}</div>
                      <div className="text-sm text-white">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className={`mb-4 rounded-2xl border px-4 py-4 ${budgetTone}`}>
                  <div className="text-sm opacity-80">Remaining Budget</div>
                  <div className="mt-1 text-2xl font-semibold">{showNumbers ? money(budgetDelta) : "••••"}</div>
                  <div className="mt-1 text-xs opacity-80">Monthly budget {money(data.spendingBudget)} · Spent this view {money(spentThisView)}</div>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Alerts</h2>
                  <span className="text-xs text-white/50">Auto insights</span>
                </div>
                {warnings.length ? (
                  <div className="space-y-2">
                    {warnings.map((w) => <div key={w} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{w}</div>)}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">You are on track right now.</div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Sunday Review</h2>
                  <span className={`rounded-full px-3 py-1 text-xs ${reviewDone ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>{reviewDone ? "Completed this Sunday" : `Next review: ${nextReviewDate}`}</span>
                </div>
                <div className="mb-3 flex justify-end">
                  <button
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        sundayReview: {
                          lastCompletedFor: "",
                          checks: { upload: false, weekly: false, monthly: false, piggy: false, debt: false, rules: false },
                        },
                      }))
                    }
                    className="rounded-2xl bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30"
                  >
                    Reset checklist
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    ["upload", "Upload latest screenshots"],
                    ["weekly", `Review weekly spend vs ${money(data.weeklyBudget)}`],
                    ["monthly", `Review monthly spend vs ${money(data.spendingBudget)}`],
                    ["piggy", "Update piggy bank total"],
                    ["debt", "Log debt payment if paid"],
                    ["rules", "No trading deposit this week"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={data.sundayReview.checks[key]}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            sundayReview: {
                              lastCompletedFor: sundayKey,
                              checks: { ...prev.sundayReview.checks, [key]: e.target.checked },
                            },
                          }))
                        }
                      />
                      <span className="text-sm text-white">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "monthly" && (
          <div className="mt-5 space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="grid gap-3 md:grid-cols-[1fr,1fr,1fr] lg:grid-cols-[220px,180px,180px,1fr]">
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-2xl bg-black/20 px-4 py-3 text-white outline-none">
                  <option value="current">Current month</option>
                  <option value="previous">Previous month</option>
                  <option value="quarter">Previous quarter</option>
                  <option value="year">Previous year</option>
                  <option value="custom">Custom dates</option>
                  <option value="all">All time</option>
                </select>
                {filter === "custom" && (
                  <>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-2xl bg-black/20 px-4 py-3 text-white outline-none" />
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-2xl bg-black/20 px-4 py-3 text-white outline-none" />
                  </>
                )}
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">Showing {range.start} to {range.end}</div>
              </div>
            </div>

            <SectionTable title="Income" rows={data.rows.Income} onManage={() => setManageOpen("Income")} visible={showNumbers} />
            <SectionTable title="Bills" rows={data.rows.Bills} onManage={() => setManageOpen("Bills")} visible={showNumbers} />
            <SectionTable title="Savings" rows={data.rows.Savings} onManage={() => setManageOpen("Savings")} visible={showNumbers} />
            <SectionTable title="Expenses" rows={data.rows.Expenses} onManage={() => setManageOpen("Expenses")} visible={showNumbers} />
            <SectionTable title="Debt" rows={data.rows.Debt} onManage={() => setManageOpen("Debt")} visible={showNumbers} />

            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Spending Budget</h2>
                <button onClick={addTransaction} className="rounded-2xl bg-violet-500 px-3 py-2 text-sm text-white">Add entry</button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-[420px]">
                <table className="w-full text-sm text-white">
                  <thead className="sticky top-0 z-10 bg-white/10 text-xs uppercase text-white/60 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Merchant</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-t border-white/10">
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={t.date}
                            onChange={(e) => updateTransaction(t.id, { date: e.target.value })}
                            className="w-full rounded-xl bg-black/20 px-2 py-2 text-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={t.merchant}
                            onChange={(e) => updateTransaction(t.id, { merchant: e.target.value, category: categorizeMerchant(e.target.value) })}
                            className="w-full rounded-xl bg-black/20 px-2 py-2 text-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={t.amount}
                            onChange={(e) => updateTransaction(t.id, { amount: Number(e.target.value) })}
                            className="w-full rounded-xl bg-black/20 px-2 py-2 text-white outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={t.category}
                            onChange={(e) => updateTransaction(t.id, { category: e.target.value })}
                            className="w-full rounded-xl bg-black/20 px-2 py-2 text-white outline-none"
                          >
                            {data.categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-white/60">{t.source}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => deleteTransaction(t.id)} className="rounded-xl bg-red-500/20 p-2 text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "upload" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <h2 className="text-lg font-semibold">Upload latest screenshots</h2>
              <p className="mt-1 text-sm text-white/60">Use cropped screenshots only. Exclude account numbers and personal details.</p>
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-dashed border-white/20 bg-black/15 px-4 py-10 text-white/70 hover:bg-black/20">
                <Upload className="h-5 w-5" />
                <span>Select screenshot images</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => processUploads(Array.from(e.target.files || []))} />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {uploadPreview.map((f) => (
                  <div key={f.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    <img src={f.url} alt={f.name} className="h-36 w-full object-cover" />
                    <div className="truncate px-3 py-2 text-xs text-white/70">{f.name}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm text-white/80">Fallback paste area</div>
                <textarea value={ocrTextFallback} onChange={(e) => setOcrTextFallback(e.target.value)} placeholder="Paste transaction text here if needed..." className="min-h-[140px] w-full rounded-2xl bg-black/20 px-4 py-3 text-white outline-none" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={runOCR} disabled={ocrBusy} className="rounded-2xl bg-violet-500 px-4 py-3 text-white disabled:opacity-50">{ocrBusy ? "Processing..." : "Extract transactions"}</button>
                <button onClick={approveQueue} className="rounded-2xl bg-emerald-500 px-4 py-3 text-white">Approve all to log</button>
              </div>
              {ocrStatus ? <div className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">{ocrStatus}</div> : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Review extracted transactions</h2>
                <span className="text-sm text-white/50">Approve after review</span>
              </div>
              <div className="space-y-3">
                {reviewQueue.length === 0 && <div className="rounded-2xl bg-white/5 px-4 py-6 text-sm text-white/60">No extracted transactions yet.</div>}
                {reviewQueue.map((t) => (
                  <div key={t.id} className="grid grid-cols-[0.8fr,1.4fr,0.7fr,0.8fr,0.3fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <input type="date" value={t.date} onChange={(e) => setReviewQueue((prev) => prev.map((x) => x.id === t.id ? { ...x, date: e.target.value } : x))} className="rounded-xl bg-black/20 px-2 py-2 text-white outline-none" />
                    <input value={t.merchant} onChange={(e) => setReviewQueue((prev) => prev.map((x) => x.id === t.id ? { ...x, merchant: e.target.value } : x))} className="rounded-xl bg-black/20 px-2 py-2 text-white outline-none" />
                    <input type="number" value={t.amount} onChange={(e) => setReviewQueue((prev) => prev.map((x) => x.id === t.id ? { ...x, amount: Number(e.target.value) } : x))} className="rounded-xl bg-black/20 px-2 py-2 text-white outline-none" />
                    <select value={t.category} onChange={(e) => setReviewQueue((prev) => prev.map((x) => x.id === t.id ? { ...x, category: e.target.value } : x))} className="rounded-xl bg-black/20 px-2 py-2 text-white outline-none">
                      {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => setReviewQueue((prev) => prev.filter((x) => x.id !== t.id))} className="rounded-xl bg-red-500/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "review" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr,1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <h2 className="text-lg font-semibold">This week</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-sm text-white/60">Weekly spend</div>
                  <div className="mt-1 text-2xl font-semibold">{hiddenMoney(weeklySpend, showNumbers)}</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-sm text-white/60">Weekly budget</div>
                  <div className="mt-1 text-2xl font-semibold">{hiddenMoney(data.weeklyBudget, showNumbers)}</div>
                </div>
              </div>
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${weeklySpend <= data.weeklyBudget ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                {weeklySpend <= data.weeklyBudget ? "You are within your weekly budget." : `You are over by ${money(weeklySpend - data.weeklyBudget)} this week.`}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <h2 className="text-lg font-semibold">Sunday completion</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">This Sunday: {reviewDone ? "Completed" : "Not completed yet"}</div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">Next review day: {nextReviewDate}</div>
                <button
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      sundayReview: {
                        lastCompletedFor: sundayKey,
                        checks: { upload: true, weekly: true, monthly: true, piggy: true, debt: true, rules: true },
                      },
                    }))
                  }
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-white"
                >
                  Mark Sunday review complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="rounded-2xl bg-white/10 px-3 py-2 text-white">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm text-white/60">Reset PIN</div>
                <input value={data.pin} onChange={(e) => setData((prev) => ({ ...prev, pin: e.target.value }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm text-white/60">Piggy Bank Total</div>
                <input type="number" value={data.piggyBank} onChange={(e) => setData((prev) => ({ ...prev, piggyBank: Number(e.target.value) }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm text-white/60">Monthly spending budget</div>
                <input type="number" value={data.spendingBudget} onChange={(e) => setData((prev) => ({ ...prev, spendingBudget: Number(e.target.value) }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm text-white/60">Weekly spending budget</div>
                <input type="number" value={data.weeklyBudget} onChange={(e) => setData((prev) => ({ ...prev, weeklyBudget: Number(e.target.value) }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                <div className="mb-2 text-sm text-white/60">Categories</div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {data.categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setData((prev) => ({ ...prev, categories: prev.categories.filter((x) => x !== c), transactions: prev.transactions.map((t) => t.category === c ? { ...t, category: "Other" } : t) }))}
                      className="rounded-full bg-white/10 px-3 py-2 text-sm text-white"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
                <AddCategory onAdd={(name) => setData((prev) => ({ ...prev, categories: [...prev.categories, name] }))} />
                <ExportImportTools data={data} onImport={(parsed) => setData(parsed)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Quick Add Transaction</h3>
              <button onClick={() => setQuickAddOpen(false)} className="rounded-2xl bg-white/10 px-3 py-2 text-white">Close</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-sm text-white/60">Date</div>
                <input type="date" value={quickAddDraft.date} onChange={(e) => setQuickAddDraft((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
              </div>
              <div>
                <div className="mb-1 text-sm text-white/60">Merchant</div>
                <input value={quickAddDraft.merchant} onChange={(e) => setQuickAddDraft((prev) => ({ ...prev, merchant: e.target.value, category: categorizeMerchant(e.target.value) }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" placeholder="Enter merchant" />
              </div>
              <div>
                <div className="mb-1 text-sm text-white/60">Amount</div>
                <input type="number" value={quickAddDraft.amount} onChange={(e) => setQuickAddDraft((prev) => ({ ...prev, amount: e.target.value }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none" placeholder="0" />
              </div>
              <div>
                <div className="mb-1 text-sm text-white/60">Category</div>
                <select value={quickAddDraft.category} onChange={(e) => setQuickAddDraft((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl bg-black/20 px-3 py-3 text-white outline-none">
                  {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={addTransaction} className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-white">Add transaction</button>
            </div>
          </div>
        </div>
      )}

      {manageOpen && (
        <ManageSectionModal
          open={!!manageOpen}
          onClose={() => setManageOpen("")}
          title={manageOpen}
          rows={data.rows[manageOpen]}
          setRows={(updater) => setSectionRows(manageOpen, updater)}
        />
      )}
    </div>
  );
}

function ExportImportTools({ data, onImport }) {
  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-budget-tracking-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    onImport(parsed);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
      <div className="mb-2 text-sm text-white/60">Backup</div>
      <div className="flex flex-wrap gap-3">
        <button onClick={downloadBackup} className="rounded-xl bg-emerald-500 px-4 py-3 text-white">Export backup</button>
        <label className="cursor-pointer rounded-xl bg-white/10 px-4 py-3 text-white">
          Import backup
          <input type="file" accept="application/json" className="hidden" onChange={(e) => importBackup(e.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}

function AddCategory({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add category" className="flex-1 rounded-xl bg-black/20 px-3 py-3 text-white outline-none" />
      <button onClick={() => { if (value.trim()) onAdd(value.trim()); setValue(""); }} className="rounded-xl bg-violet-500 px-4 py-3 text-white">Add</button>
    </div>
  );
}