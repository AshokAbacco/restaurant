import React, { useMemo, useState } from "react";
import {
  Search,
  Phone,
  Star,
  Gift,
  TrendingUp,
  Calendar,
  Tag,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — replace with data from your apiClient (e.g. GET /customers,
// GET /loyalty) once wired up. Shapes are kept flat and simple so the two
// tables can be swapped for live data with minimal changes.
// ---------------------------------------------------------------------------

const CRM_CUSTOMERS = [
  {
    id: "C-1042",
    name: "Rahul Sharma",
    mobile: "98765 43210",
    orders: 18,
    totalSpent: 24500,
    avgBill: 1360,
    lastVisit: "15 Sep",
    favorite: "Chicken Biryani",
    tag: "Regular",
  },
  {
    id: "C-1043",
    name: "Ananya Iyer",
    mobile: "91234 56789",
    orders: 6,
    totalSpent: 8200,
    avgBill: 1366,
    lastVisit: "18 Sep",
    favorite: "Paneer Tikka",
    tag: "New",
  },
  {
    id: "C-1044",
    name: "Vikram Nair",
    mobile: "99887 66554",
    orders: 32,
    totalSpent: 61800,
    avgBill: 1931,
    lastVisit: "20 Sep",
    favorite: "Mutton Rogan Josh",
    tag: "VIP",
  },
  {
    id: "C-1045",
    name: "Sneha Patel",
    mobile: "90909 12345",
    orders: 3,
    totalSpent: 2950,
    avgBill: 983,
    lastVisit: "10 Sep",
    favorite: "Veg Thali",
    tag: "New",
  },
];

const LOYALTY_CUSTOMERS = [
  {
    id: "C-1042",
    name: "Rahul Sharma",
    mobile: "98765 43210",
    tier: "Gold",
    pointsBalance: 245,
    pointsEarned: 890,
    pointsRedeemed: 645,
    lastRedeemed: "02 Sep",
    expiring: 40,
  },
  {
    id: "C-1043",
    name: "Ananya Iyer",
    mobile: "91234 56789",
    tier: "Silver",
    pointsBalance: 82,
    pointsEarned: 82,
    pointsRedeemed: 0,
    lastRedeemed: "—",
    expiring: 0,
  },
  {
    id: "C-1044",
    name: "Vikram Nair",
    mobile: "99887 66554",
    tier: "Platinum",
    pointsBalance: 618,
    pointsEarned: 2210,
    pointsRedeemed: 1592,
    lastRedeemed: "20 Aug",
    expiring: 120,
  },
  {
    id: "C-1045",
    name: "Sneha Patel",
    mobile: "90909 12345",
    tier: "Silver",
    pointsBalance: 29,
    pointsEarned: 29,
    pointsRedeemed: 0,
    lastRedeemed: "—",
    expiring: 0,
  },
];

const TIER_STYLES = {
  Platinum: "bg-slate-100 text-slate-700 border border-slate-200",
  Gold: "bg-amber-50 text-amber-700 border border-amber-200",
  Silver: "bg-zinc-50 text-zinc-600 border border-zinc-200",
};

const TAG_STYLES = {
  VIP: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Regular: "bg-blue-50 text-blue-700 border border-blue-200",
  New: "bg-orange-50 text-orange-700 border border-orange-200",
};

function currency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function CustomersCRMLoyalty() {
  const [query, setQuery] = useState("");

  const filteredCRM = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CRM_CUSTOMERS;
    return CRM_CUSTOMERS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.replace(/\s/g, "").includes(q)
    );
  }, [query]);

  const loyaltyById = useMemo(() => {
    const map = {};
    LOYALTY_CUSTOMERS.forEach((l) => (map[l.id] = l));
    return map;
  }, []);

  const filteredLoyalty = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOYALTY_CUSTOMERS;
    return LOYALTY_CUSTOMERS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.replace(/\s/g, "").includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F3F4F1] text-slate-800">
      {/* Page header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Customer profiles, visit history, and loyalty rewards in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or mobile number"
              className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            + Add Customer
          </button>
        </div>
      </div>

      <div className="space-y-8 px-6 py-6">
        {/* -------------------------- CRM table -------------------------- */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Customer Profiles (CRM)</h2>
                <p className="text-xs text-slate-500">Contact details, order history, and preferences</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{filteredCRM.length} customers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Orders</th>
                  <th className="px-5 py-3 font-medium">Total Spent</th>
                  <th className="px-5 py-3 font-medium">Avg Bill</th>
                  <th className="px-5 py-3 font-medium">Last Visit</th>
                  <th className="px-5 py-3 font-medium">Favorite Item</th>
                  <th className="px-5 py-3 font-medium">Tag</th>
                </tr>
              </thead>
              <tbody>
                {filteredCRM.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.id}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.mobile}</td>
                    <td className="px-5 py-3 text-slate-600">{c.orders}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{currency(c.totalSpent)}</td>
                    <td className="px-5 py-3 text-slate-600">{currency(c.avgBill)}</td>
                    <td className="px-5 py-3 text-slate-600">{c.lastVisit}</td>
                    <td className="px-5 py-3 text-slate-600">{c.favorite}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TAG_STYLES[c.tag]}`}>
                        {c.tag}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredCRM.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">
                      No customers match "{query}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------ Loyalty table ------------------------ */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Loyalty & Rewards</h2>
                <p className="text-xs text-slate-500">Points balance, membership tier, and redemption history</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{filteredLoyalty.length} members</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Points Balance</th>
                  <th className="px-5 py-3 font-medium">Earned (Lifetime)</th>
                  <th className="px-5 py-3 font-medium">Redeemed</th>
                  <th className="px-5 py-3 font-medium">Last Redemption</th>
                  <th className="px-5 py-3 font-medium">Expiring Soon</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoyalty.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-400">{l.mobile}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TIER_STYLES[l.tier]}`}>
                        <Star className="h-3 w-3" />
                        {l.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{l.pointsBalance} pts</td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        {l.pointsEarned} pts
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{l.pointsRedeemed} pts</td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {l.lastRedeemed}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {l.expiring > 0 ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 border border-rose-200">
                          {l.expiring} pts · 30 days
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLoyalty.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                      No members match "{query}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Linking hint: same customer id joins both tables */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-xs text-slate-400">
          <Tag className="h-3.5 w-3.5" />
          Both tables share the same customer ID (e.g. C-1042) — join on that field once this is wired to your API.
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}