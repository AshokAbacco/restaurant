// ==============================================
// src/reports/ReportsDashboard.jsx
// ==============================================

import React, { useState } from "react";
import {
  FiBarChart2,
  FiDownload,
  FiPrinter,
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiBox,
  FiTrendingUp,
  FiCreditCard,
  FiPieChart,
  FiActivity,
  FiSearch,
  FiArrowUp,
  FiArrowDownRight,
  FiClock,
  FiTruck,
  FiCoffee,
  FiAlertTriangle,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";

const ReportsDashboard = () => {
  const [dateRange, setDateRange] = useState("Today");

  const kpis = [
    {
      title: "Today's Sales",
      value: "₹75,250",
      change: "+12.4%",
      trend: "up",
      icon: FiDollarSign,
      bg: "from-emerald-500 to-green-600",
    },
    {
      title: "Total Orders",
      value: "210",
      change: "+18",
      trend: "up",
      icon: FiShoppingCart,
      bg: "from-blue-500 to-indigo-600",
    },
    {
      title: "Net Profit",
      value: "₹29,850",
      change: "+8.6%",
      trend: "up",
      icon: FiTrendingUp,
      bg: "from-violet-500 to-purple-600",
    },
    {
      title: "Average Bill",
      value: "₹358",
      change: "+3.4%",
      trend: "up",
      icon: FiCreditCard,
      bg: "from-amber-500 to-orange-600",
    },
  ];

  const secondaryKpis = [
    { title: "Customers", value: "154", change: "+11%", trend: "up", icon: FiUsers },
    { title: "Inventory Value", value: "₹8.42L", change: "-2%", trend: "down", icon: FiBox },
    { title: "Expenses", value: "₹18,450", change: "-4%", trend: "down", icon: FiActivity },
    { title: "GST Collected", value: "₹6,820", change: "+9%", trend: "up", icon: FiPieChart },
  ];

  const topSelling = [
    { item: "Chicken Biryani", qty: 1250, revenue: "₹3,75,000", profit: "₹1,45,000", pct: 100 },
    { item: "Veg Biryani", qty: 940, revenue: "₹2,82,000", profit: "₹98,000", pct: 75 },
    { item: "Pizza", qty: 730, revenue: "₹2,60,000", profit: "₹88,000", pct: 69 },
    { item: "Burger", qty: 620, revenue: "₹1,74,000", profit: "₹63,000", pct: 46 },
    { item: "Fried Rice", qty: 560, revenue: "₹1,40,000", profit: "₹48,000", pct: 37 },
  ];

  const categoryData = [
    { category: "Biryani", orders: 820, revenue: "₹3,80,000", pct: 100, color: "bg-green-500" },
    { category: "Pizza", orders: 610, revenue: "₹2,60,000", pct: 68, color: "bg-blue-500" },
    { category: "Chinese", orders: 470, revenue: "₹1,95,000", pct: 51, color: "bg-orange-500" },
    { category: "Desserts", orders: 290, revenue: "₹82,000", pct: 22, color: "bg-pink-500" },
    { category: "Beverages", orders: 210, revenue: "₹54,000", pct: 14, color: "bg-purple-500" },
  ];

  const paymentData = [
    { name: "UPI", value: "41%", amount: "₹30,852", color: "bg-green-500", pct: 41 },
    { name: "Cash", value: "32%", amount: "₹24,080", color: "bg-blue-500", pct: 32 },
    { name: "Card", value: "22%", amount: "₹16,555", color: "bg-amber-500", pct: 22 },
    { name: "Wallet", value: "5%", amount: "₹3,763", color: "bg-purple-500", pct: 5 },
  ];

  const expenses = [
    { name: "Salary", amount: "₹5,60,000", pct: 58, color: "bg-red-500" },
    { name: "Rent", amount: "₹1,50,000", pct: 15, color: "bg-orange-500" },
    { name: "Electricity", amount: "₹85,000", pct: 9, color: "bg-amber-500" },
    { name: "Marketing", amount: "₹65,000", pct: 7, color: "bg-blue-500" },
    { name: "Gas", amount: "₹42,000", pct: 4, color: "bg-gray-500" },
    { name: "Others", amount: "₹18,000", pct: 2, color: "bg-gray-400" },
  ];

  const employees = [
    { name: "Rahul", role: "Captain", orders: 145, sales: "₹82,500", avatar: "R" },
    { name: "Ajay", role: "Cashier", orders: 136, sales: "₹76,800", avatar: "A" },
    { name: "Kiran", role: "Server", orders: 118, sales: "₹69,100", avatar: "K" },
    { name: "Arjun", role: "Server", orders: 95, sales: "₹52,300", avatar: "Ar" },
    { name: "Vinay", role: "Server", orders: 88, sales: "₹46,000", avatar: "V" },
  ];

  const transactions = [
    { invoice: "INV-1001", customer: "Rahul Sharma", type: "Dine In", payment: "UPI", amount: "₹860", status: "Paid", time: "2:34 PM" },
    { invoice: "INV-1002", customer: "Ajay Kumar", type: "Takeaway", payment: "Cash", amount: "₹540", status: "Paid", time: "2:18 PM" },
    { invoice: "INV-1003", customer: "Kiran Reddy", type: "Delivery", payment: "Card", amount: "₹1,260", status: "Paid", time: "1:55 PM" },
    { invoice: "INV-1004", customer: "Arjun Patel", type: "Dine In", payment: "UPI", amount: "₹780", status: "Paid", time: "1:32 PM" },
    { invoice: "INV-1005", customer: "Vinay Rao", type: "Delivery", payment: "Cash", amount: "₹640", status: "Pending", time: "1:10 PM" },
  ];

  const inventoryAlerts = [
    { item: "Cheese", stock: "0 Kg", status: "Out of Stock", severity: "critical" },
    { item: "Tomato", stock: "4 Kg", status: "Low Stock", severity: "high" },
    { item: "Butter", stock: "3 Kg", status: "Low Stock", severity: "high" },
    { item: "Chicken", stock: "8 Kg", status: "Running Low", severity: "medium" },
    { item: "Cooking Oil", stock: "6 L", status: "Running Low", severity: "medium" },
  ];

  const getSeverityStyle = (severity) => {
    const styles = {
      critical: "bg-red-50 text-red-700 border-red-200",
      high: "bg-orange-50 text-orange-700 border-orange-200",
      medium: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return styles[severity] || styles.medium;
  };

  const getOrderTypeIcon = (type) => {
    switch (type) {
      case "Dine In": return <FiCoffee className="w-4 h-4" />;
      case "Takeaway": return <FiShoppingCart className="w-4 h-4" />;
      case "Delivery": return <FiTruck className="w-4 h-4" />;
      default: return null;
    }
  };

  const getOrderTypeStyle = (type) => {
    switch (type) {
      case "Dine In": return "bg-emerald-50 text-emerald-700";
      case "Takeaway": return "bg-blue-50 text-blue-700";
      case "Delivery": return "bg-purple-50 text-purple-700";
      default: return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 bg-[#F3F5EE] min-h-screen -m-6 p-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Restaurant business intelligence dashboard"
        icon={<FiBarChart2 />}
      />

      {/* ================= FILTER BAR ================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Type</label>
            <select className="mt-1.5 w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
              <option>All Types</option>
              <option>Dine In</option>
              <option>Takeaway</option>
              <option>Delivery</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</label>
            <select className="mt-1.5 w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
              <option>All Methods</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
            <select className="mt-1.5 w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
              <option>All Categories</option>
              <option>Biryani</option>
              <option>Pizza</option>
              <option>Chinese</option>
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search</label>
            <div className="relative mt-1.5">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                placeholder="Invoice or customer..."
                className="w-full border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition shadow-sm shadow-green-600/20">
              <FiDownload className="w-4 h-4" />
              Export
            </button>
            <button className="border border-gray-200 hover:bg-gray-50 rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition">
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* ================= PRIMARY KPIs ================= */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    card.trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  }`}>
                    {card.trend === "up" ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
                    {card.change}
                  </div>
                </div>
                <h3 className="text-sm text-gray-500 mt-4 font-medium">{card.title}</h3>
                <h2 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{card.value}</h2>
              </div>
              <div className="h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition" style={{
                backgroundImage: card.bg.includes("emerald") 
                  ? "linear-gradient(to right, #10b981, #16a34a)" 
                  : card.bg.includes("blue") 
                  ? "linear-gradient(to right, #3b82f6, #4f46e5)" 
                  : card.bg.includes("violet") 
                  ? "linear-gradient(to right, #8b5cf6, #9333ea)" 
                  : "linear-gradient(to right, #f59e0b, #ea580c)"
              }} />
            </div>
          );
        })}
      </div>

      {/* ================= SECONDARY KPIs ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryKpis.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                card.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{card.title}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-bold text-gray-900 truncate">{card.value}</span>
                  <span className={`text-xs font-semibold ${card.trend === "up" ? "text-green-600" : "text-red-500"}`}>
                    {card.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= CHARTS ROW ================= */}
      <div className="grid xl:grid-cols-5 gap-5">
        {/* Sales Trend - Wider */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sales Trend</h2>
              <p className="text-sm text-gray-500 mt-0.5">Revenue over time</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {["Daily", "Weekly", "Monthly"].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    tab === "Daily" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 mt-4 rounded-xl bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-transparent border border-green-100/50 flex items-center justify-center">
            <div className="text-center">
              <FiBarChart2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-green-600 font-bold text-lg">LINE CHART</p>
              <p className="text-green-500/70 text-sm mt-1">Integrate with Recharts/Chart.js</p>
            </div>
          </div>
        </div>

        {/* Revenue by Order Type */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-1">
            <h2 className="text-lg font-bold text-gray-900">By Order Type</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revenue distribution</p>
          </div>
          <div className="h-52 mt-4 rounded-xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-transparent border border-blue-100/50 flex items-center justify-center">
            <div className="text-center">
              <FiPieChart className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-blue-600 font-bold text-lg">DONUT CHART</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Dine In", value: "52%", color: "bg-emerald-500" },
              { label: "Takeaway", value: "28%", color: "bg-blue-500" },
              { label: "Delivery", value: "20%", color: "bg-purple-500" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color} mx-auto mb-1.5`} />
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CATEGORY + PAYMENT ================= */}
      <div className="grid xl:grid-cols-5 gap-5">
        {/* Category Performance */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Category Performance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Orders and revenue by category</p>
            </div>
            <button className="text-green-600 text-sm font-semibold hover:text-green-700 transition">View All</button>
          </div>
          <div className="space-y-4">
            {categoryData.map((item, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                    <span className="font-semibold text-gray-800 text-sm">{item.category}</span>
                    <span className="text-xs text-gray-400">{item.orders} orders</span>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{item.revenue}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Distribution */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payments</h2>
              <p className="text-sm text-gray-500 mt-0.5">Method distribution</p>
            </div>
            <FiCreditCard className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {paymentData.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 text-sm">{item.value}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.amount}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <FiTrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">UPI leads payments</span>
            </div>
            <p className="text-xs text-green-600/70">UPI transactions grew 15% compared to last period</p>
          </div>
        </div>
      </div>

      {/* ================= TOP SELLING + EXPENSES ================= */}
      <div className="grid xl:grid-cols-5 gap-5">
        {/* Top Selling Items */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Top Selling Items</h2>
              <p className="text-sm text-gray-500 mt-0.5">Best performers by quantity</p>
            </div>
            <button className="text-green-600 text-sm font-semibold hover:text-green-700 transition">View All</button>
          </div>
          <div className="space-y-3">
            {topSelling.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-gray-100 text-gray-600" : index === 2 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{item.item}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.qty} sold · Profit {item.profit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">{item.revenue}</p>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Expenses</h2>
              <p className="text-sm text-gray-500 mt-0.5">Cost breakdown</p>
            </div>
            <FiDollarSign className="w-5 h-5 text-gray-400" />
          </div>

          <div className="h-44 rounded-xl bg-gradient-to-br from-red-50/80 via-orange-50/50 to-transparent border border-red-100/50 flex items-center justify-center mb-5">
            <div className="text-center">
              <FiPieChart className="w-10 h-10 text-red-300 mx-auto mb-2" />
              <p className="text-red-400 font-bold">PIE CHART</p>
            </div>
          </div>

          <div className="space-y-3">
            {expenses.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.amount}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total</span>
            <span className="text-base font-bold text-gray-900">₹9,20,000</span>
          </div>
        </div>
      </div>

      {/* ================= CUSTOMER + EMPLOYEE ================= */}
      <div className="grid xl:grid-cols-5 gap-5">
        {/* Customer Analytics */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customers</h2>
              <p className="text-sm text-gray-500 mt-0.5">Segmentation overview</p>
            </div>
            <FiUsers className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { title: "New", value: "48", color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Returning", value: "106", color: "text-green-600", bg: "bg-green-50" },
              { title: "Loyal", value: "62", color: "text-purple-600", bg: "bg-purple-50" },
              { title: "Inactive", value: "18", color: "text-red-500", bg: "bg-red-50" },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} rounded-xl p-3.5 text-center`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-600 mt-1 font-medium">{item.title}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Top Customer</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">RS</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">Rahul Sharma</h4>
                <p className="text-xs text-gray-500">82 orders · Loyal Member</p>
              </div>
              <p className="font-bold text-green-600 text-sm">₹28,400</p>
            </div>
          </div>
        </div>

        {/* Employee Performance */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Employee Performance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Orders handled and sales generated</p>
            </div>
            <FiActivity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {employees.map((emp, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {emp.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm">{emp.name}</h4>
                  <p className="text-xs text-gray-500">{emp.role}</p>
                </div>
                <div className="text-center px-4">
                  <p className="font-bold text-gray-900 text-sm">{emp.orders}</p>
                  <p className="text-xs text-gray-500">orders</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="font-bold text-green-600 text-sm">{emp.sales}</p>
                </div>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(emp.orders / 145) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= INVENTORY + KITCHEN ================= */}
      <div className="grid xl:grid-cols-5 gap-5">
        {/* Inventory Alerts */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Inventory Alerts</h2>
              <p className="text-sm text-gray-500 mt-0.5">Items needing attention</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FiAlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="space-y-2.5">
            {inventoryAlerts.map((item, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${getSeverityStyle(item.severity)}`}>
                <div>
                  <h4 className="font-semibold text-sm">{item.item}</h4>
                  <p className="text-xs opacity-70 mt-0.5">Remaining: {item.stock}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen Performance */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Kitchen Performance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Today's kitchen metrics</p>
            </div>
            <FiClock className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Prepared", value: "182", color: "text-green-600", bg: "bg-green-50" },
              { label: "Pending", value: "18", color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Avg Time", value: "14m", color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Cancelled", value: "4", color: "text-red-500", bg: "bg-red-50" },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="h-36 rounded-xl bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-transparent border border-green-100/50 flex items-center justify-center">
            <div className="text-center">
              <FiBarChart2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-500 font-bold text-sm">KITCHEN THROUGHPUT CHART</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RECENT TRANSACTIONS ================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-sm text-gray-500 mt-0.5">Latest sales activity</p>
            </div>
            <button className="text-green-600 text-sm font-semibold hover:text-green-700 transition">View All →</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((item, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      {item.invoice}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.customer}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${getOrderTypeStyle(item.type)}`}>
                      {getOrderTypeIcon(item.type)}
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">{item.payment}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">{item.time}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{item.amount}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                      item.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BUSINESS SUMMARY ================= */}
      <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative flex flex-col lg:flex-row justify-between gap-8">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold">Business Summary</h2>
            <p className="mt-2 text-green-100 text-sm leading-relaxed">
              Restaurant performance overview generated from sales, inventory, customers, employees and financial data.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            {[
              { label: "Best Item", value: "Chicken Biryani" },
              { label: "Best Category", value: "Biryani" },
              { label: "Refunds", value: "₹8,250" },
              { label: "Discounts", value: "₹18,600" },
              { label: "Net Margin", value: "38.4%" },
              { label: "Growth", value: "12.8%", icon: true },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-green-200 text-xs font-medium">{item.label}</p>
                <p className="font-bold mt-0.5 flex items-center gap-1.5">
                  {item.icon && <FiArrowUp className="w-4 h-4" />}
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;