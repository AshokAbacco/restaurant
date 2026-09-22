import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPricingOrder,
  verifyPricingPayment,
} from "./pricingApi.js";

// The Key ID is meant to be public (it identifies the account to Razorpay's
// checkout widget, and is embedded in every Checkout.js call by design) —
// unlike the Key Secret, which stays server-only and is never sent to the
// browser. Set it in the frontend's .env as VITE_RAZORPAY_KEY_ID.
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

const inr = (n) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

/* ================= currency (display only) =================
   Plan prices are defined in INR and Razorpay still bills in INR. Picking
   another country only changes how the prices are SHOWN on the cards, using
   an approximate rate: FALLBACK_RATES below (units of currency per 1 INR),
   refreshed from a free public rates API on load when it is reachable.
   The first POPULAR_COUNT countries are what the dropdown lists before
   anyone types in the search box. */
const POPULAR_COUNT = 10;
const STORE_KEY = "ab_pricing_country";

const COUNTRIES = [
  ["India", "IN", "INR"],
  ["United States", "US", "USD"],
  ["United Kingdom", "GB", "GBP"],
  ["United Arab Emirates", "AE", "AED"],
  ["Canada", "CA", "CAD"],
  ["Australia", "AU", "AUD"],
  ["Singapore", "SG", "SGD"],
  ["Germany", "DE", "EUR"],
  ["Saudi Arabia", "SA", "SAR"],
  ["Qatar", "QA", "QAR"],
  // --- only reachable through search ---
  ["Kuwait", "KW", "KWD"],
  ["Bahrain", "BH", "BHD"],
  ["Oman", "OM", "OMR"],
  ["Malaysia", "MY", "MYR"],
  ["Thailand", "TH", "THB"],
  ["Indonesia", "ID", "IDR"],
  ["Philippines", "PH", "PHP"],
  ["Vietnam", "VN", "VND"],
  ["Japan", "JP", "JPY"],
  ["South Korea", "KR", "KRW"],
  ["China", "CN", "CNY"],
  ["Hong Kong", "HK", "HKD"],
  ["Sri Lanka", "LK", "LKR"],
  ["Nepal", "NP", "NPR"],
  ["Bangladesh", "BD", "BDT"],
  ["Pakistan", "PK", "PKR"],
  ["France", "FR", "EUR"],
  ["Italy", "IT", "EUR"],
  ["Spain", "ES", "EUR"],
  ["Netherlands", "NL", "EUR"],
  ["Ireland", "IE", "EUR"],
  ["Switzerland", "CH", "CHF"],
  ["Sweden", "SE", "SEK"],
  ["Norway", "NO", "NOK"],
  ["Denmark", "DK", "DKK"],
  ["Poland", "PL", "PLN"],
  ["Turkey", "TR", "TRY"],
  ["Israel", "IL", "ILS"],
  ["Egypt", "EG", "EGP"],
  ["South Africa", "ZA", "ZAR"],
  ["Nigeria", "NG", "NGN"],
  ["Kenya", "KE", "KES"],
  ["New Zealand", "NZ", "NZD"],
  ["Brazil", "BR", "BRL"],
  ["Mexico", "MX", "MXN"],
].map(([name, code, currency]) => ({ name, code, currency }));

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

// Units of each currency per 1 INR. Approximate; only used until (or
// unless) the live rates load.
const FALLBACK_RATES = {
  INR: 1, USD: 0.0114, GBP: 0.0085, EUR: 0.0097, AED: 0.0417, CAD: 0.0159,
  AUD: 0.0175, SGD: 0.0147, SAR: 0.0426, QAR: 0.0414, KWD: 0.0035,
  BHD: 0.00428, OMR: 0.00437, MYR: 0.0477, THB: 0.375, IDR: 186, PHP: 0.65,
  VND: 300, JPY: 1.7, KRW: 15.9, CNY: 0.0807, HKD: 0.0886, LKR: 3.4,
  NPR: 1.59, BDT: 1.39, PKR: 3.2, CHF: 0.0091, SEK: 0.107, NOK: 0.119,
  DKK: 0.0727, PLN: 0.0432, TRY: 0.466, ILS: 0.0415, EGP: 0.55, ZAR: 0.2,
  NGN: 17, KES: 1.47, NZD: 0.0193, BRL: 0.0625, MXN: 0.216,
};

const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "IDR"]);

// Best guess at where the visitor is. Timezone wins for India because many
// Indian browsers are set to en-US, which would otherwise show USD. Anything
// the visitor picks themselves is remembered and takes priority.
function detectCountry() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && COUNTRY_BY_CODE[saved]) return saved;
  } catch {
    /* storage blocked — carry on */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const l of langs) {
      const region = new Intl.Locale(l).region;
      if (region && COUNTRY_BY_CODE[region]) return region;
    }
  } catch {
    /* fall through to the default */
  }
  return "IN";
}

function makeMoney(currency, rates) {
  if (currency === "INR") return inr;
  const rate = rates[currency] || FALLBACK_RATES[currency];
  return (n) => {
    const v = n * rate;
    const digits = v === 0 || v >= 100 || ZERO_DECIMAL.has(currency) ? 0 : 2;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(v);
  };
}

function currencySymbol(code) {
  try {
    return (
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code
    );
  } catch {
    return code;
  }
}

let currencyNames;
function currencyName(code) {
  try {
    currencyNames =
      currencyNames || new Intl.DisplayNames(["en"], { type: "currency" });
    return currencyNames.of(code) || code;
  } catch {
    return code;
  }
}

const BASE_FEATURES = [
  "Login Access: owner, manager, cashier, kitchen, waiter",
  "Orders, KOT and table map",
  "Billing with GST invoices",
  // "Works offline, syncs when you're back",
  "Menu and stock management",
  "Employee management",
];

const PLANS = {
  free: {
    id: "free",
    name: "Free One Month",
    sub: "30 days on the full system. No card, no commitment.",
    cta: "Start free trial",
    features: [
      ...BASE_FEATURES,
      "1 branch included",
      "Email support",
    ],
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    sub: "Billed every month. Stop whenever you want.",
    cta: "Buy monthly plan",
    cycle: "month",
    tiers: {
      standard: { label: "Standard", mrp: 850, price: 650 },
      custom: { label: "Custom", mrp: 850, price: 650 },
    },
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Phone support, Email 24/7",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Year",
    sub: "Pay once for twelve months and keep the lower rate.",
    cta: "Buy yearly plan",
    cycle: "year",
    ribbon: "Cheapest per branch",
    tiers: {
      standard: { label: "Standard", mrp: 650, price: 550 },
      custom: { label: "Custom", mrp: 650, price: 550 },
    },
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Phone support, Email 24/7",
    ],
  },
};

const emptyForm = {
  restaurant: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  gstin: "",
  notes: "",
};

export default function Pricing() {
  const [tier, setTier] = useState({ monthly: "standard", yearly: "standard" });
  const [branches, setBranches] = useState({ monthly: 1, yearly: 1 });
  const [extraNeeds, setExtraNeeds] = useState({ monthly: "", yearly: "" });
  const [cart, setCart] = useState(null); // { planId, tierKey, branches, unit, total, cycle, extraNeeds }

  const [country, setCountry] = useState(detectCountry);
  const [rates, setRates] = useState(FALLBACK_RATES);
  const currency = COUNTRY_BY_CODE[country].currency;
  const rate = rates[currency] || FALLBACK_RATES[currency];
  const money = useMemo(() => makeMoney(currency, rates), [currency, rates]);

  const pickCountry = (code) => {
    setCountry(code);
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch {
      /* ignore */
    }
  };

  // Refresh the approximate rates. If this fails (offline, blocked), the
  // built-in fallback rates simply stay in use.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("https://open.er-api.com/v6/latest/INR", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d || !d.rates) return;
        const live = {};
        for (const code of Object.keys(FALLBACK_RATES)) {
          const v = Number(d.rates[code]);
          if (Number.isFinite(v) && v > 0) live[code] = v;
        }
        setRates((prev) => ({ ...prev, ...live }));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const priceOf = (planId) => {
    const plan = PLANS[planId];
    if (!plan.tiers) return { unit: 0, mrp: 0, total: 0 };
    const t = plan.tiers[tier[planId]];
    const n = branches[planId];
    const months = planId === "yearly" ? 12 : 1;
    return { unit: t.price, mrp: t.mrp, total: t.price * n * months };
  };

  const setBranchCount = (planId, v) => {
    const n = Math.max(1, Math.min(50, Number(v) || 1));
    setBranches((b) => ({ ...b, [planId]: n }));
  };

  const setNeeds = (planId, v) =>
    setExtraNeeds((x) => ({ ...x, [planId]: v }));

  const openCheckout = (planId) => {
    const plan = PLANS[planId];
    if (planId === "free") {
      setCart({
        planId,
        planName: plan.name,
        tierKey: null,
        tierLabel: "Free trial",
        branches: 1,
        unit: 0,
        total: 0,
        cycle: "30 days",
        extraNeeds: "",
      });
      return;
    }
    const p = priceOf(planId);
    setCart({
      planId,
      planName: plan.name,
      tierKey: tier[planId],
      tierLabel: plan.tiers[tier[planId]].label,
      branches: branches[planId],
      unit: p.unit,
      total: p.total,
      cycle: planId === "yearly" ? "year" : "month",
      extraNeeds: tier[planId] === "custom" ? extraNeeds[planId].trim() : "",
    });
  };

  return (
    <main className="ab-pricing">
      <Styles />

      <header className="ab-head">
        <p className="ab-kicker">Pricing</p>
        <h1>
          One price per branch.
          <br />
          Every outlet, every screen.
        </h1>
        <p className="ab-lede">
          Counter, kitchen display, captain app and back office are all in the
          same licence, for as many people on your team as you need. Start
          free for a month, then pick the cycle that suits your cash flow.
        </p>
      </header>

      <div className="ab-cur">
        <span className="ab-cur-label">Currency</span>
        <CurrencyPicker country={country} onPick={pickCountry} />
        {currency !== "INR" && (
          <span className="ab-cur-rate">
            1 {currency} ≈ ₹
            {(1 / rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}.
            Approximate. You are billed in INR.
          </span>
        )}
      </div>

      <section className="ab-grid">
        {/* ---------------- Free ---------------- */}
        <article className="ab-card">
          <div className="ab-card-top">
            <h2>{PLANS.free.name}</h2>
            <p className="ab-card-sub">{PLANS.free.sub}</p>
          </div>

          <div className="ab-price">
            <span className="ab-amount">{money(0)}</span>
            <span className="ab-per">for 30 days</span>
          </div>
          <p className="ab-total ab-total-quiet">
            1 branch included. Card details are not asked for.
          </p>

          <button className="ab-btn ab-btn-ghost" onClick={() => openCheckout("free")}>
            {PLANS.free.cta}
          </button>

          <FeatureList items={PLANS.free.features} />
        </article>

        {/* ---------------- Monthly ---------------- */}
        <PaidCard
          plan={PLANS.monthly}
          tierKey={tier.monthly}
          onTier={(k) => setTier((t) => ({ ...t, monthly: k }))}
          branches={branches.monthly}
          onBranches={(v) => setBranchCount("monthly", v)}
          price={priceOf("monthly")}
          needs={extraNeeds.monthly}
          onNeeds={(v) => setNeeds("monthly", v)}
          money={money}
          onBuy={() => openCheckout("monthly")}
        />

        {/* ---------------- Yearly ---------------- */}
        <PaidCard
          featured
          plan={PLANS.yearly}
          tierKey={tier.yearly}
          onTier={(k) => setTier((t) => ({ ...t, yearly: k }))}
          branches={branches.yearly}
          onBranches={(v) => setBranchCount("yearly", v)}
          price={priceOf("yearly")}
          needs={extraNeeds.yearly}
          onNeeds={(v) => setNeeds("yearly", v)}
          money={money}
          onBuy={() => openCheckout("yearly")}
        />
      </section>

      <p className="ab-foot">
        Prices are per branch and exclude 18% GST. Every branch gets
        unlimited users. Hardware, printers and one-time data migration are
        quoted separately.
        {currency !== "INR" &&
          " Amounts in " + currency + " are approximate. Orders are billed in INR."}
      </p>

      {cart && (
        <CheckoutModal
          cart={cart}
          money={money}
          currency={currency}
          onClose={() => setCart(null)}
        />
      )}
    </main>
  );
}

/* ================= currency picker ================= */

function CurrencyPicker({ country, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const current = COUNTRY_BY_CODE[country];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = query
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.currency.toLowerCase().includes(query) ||
          currencyName(c.currency).toLowerCase().includes(query),
      )
    : COUNTRIES.slice(0, POPULAR_COUNT);

  const choose = (c) => {
    onPick(c.code);
    setOpen(false);
    setQ("");
  };

  const chip = (code) => {
    const sym = currencySymbol(code);
    return (
      <span className={"ab-cur-chip" + (sym.length > 2 ? " ab-cur-chip-sm" : "")}>
        {sym}
      </span>
    );
  };

  return (
    <div className="ab-cur-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ab-cur-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {chip(current.currency)}
        <span>
          {current.name} · {current.currency}
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="ab-cur-caret">
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="ab-cur-pop">
          <input
            ref={inputRef}
            className="ab-cur-search"
            type="search"
            value={q}
            placeholder="Search country or currency"
            aria-label="Search country or currency"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                choose(results[0]);
              }
            }}
          />

          {results.length > 0 ? (
            <ul className="ab-cur-list" role="listbox" aria-label="Country">
              {results.map((c) => (
                <li key={c.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === country}
                    className={
                      "ab-cur-opt" + (c.code === country ? " is-on" : "")
                    }
                    onClick={() => choose(c)}
                  >
                    {chip(c.currency)}
                    <span>
                      <span className="ab-cur-opt-name">{c.name}</span>
                      <span className="ab-cur-opt-sub">
                        {c.currency} · {currencyName(c.currency)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ab-cur-empty">No country matches “{q.trim()}”.</p>
          )}

          {!query && (
            <p className="ab-cur-more">
              Showing {POPULAR_COUNT} of {COUNTRIES.length} countries. Type to
              search the rest.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= card ================= */

function PaidCard({
  plan,
  featured,
  tierKey,
  onTier,
  branches,
  onBranches,
  price,
  needs,
  onNeeds,
  money,
  onBuy,
}) {
  const isCustom = tierKey === "custom";
  const cycleWord = plan.cycle === "year" ? "year" : "month";
  const amount = money(price.unit);

  return (
    <article className={"ab-card" + (featured ? " ab-card-featured" : "")}>
      {plan.ribbon && <span className="ab-ribbon">{plan.ribbon}</span>}

      <div className="ab-card-top">
        <h2>{plan.name}</h2>
        <p className="ab-card-sub">{plan.sub}</p>
      </div>

      <div className="ab-tabs" role="tablist" aria-label={plan.name + " plan type"}>
        {Object.entries(plan.tiers).map(([key, t]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tierKey === key}
            className={"ab-tab" + (tierKey === key ? " is-on" : "")}
            onClick={() => onTier(key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ab-price">
        <span className="ab-was">{money(price.mrp)}</span>
        <span
          className={"ab-amount" + (amount.length > 8 ? " ab-amount-long" : "")}
        >
          {amount}
        </span>
        <span className="ab-per">per branch / month</span>
      </div>

      <div className="ab-seats">
        <label htmlFor={plan.id + "-branches"}>Branches</label>
        <div className="ab-stepper">
          <button onClick={() => onBranches(branches - 1)} aria-label="Remove a branch">
            –
          </button>
          <input
            id={plan.id + "-branches"}
            value={branches}
            inputMode="numeric"
            onChange={(e) => onBranches(e.target.value)}
          />
          <button onClick={() => onBranches(branches + 1)} aria-label="Add a branch">
            +
          </button>
        </div>
      </div>

      {isCustom && (
        <div className="ab-needs">
          <label htmlFor={plan.id + "-needs"}>
            Need something beyond Standard?
          </label>
          <textarea
            id={plan.id + "-needs"}
            rows={3}
            placeholder="Tell us what you need — e.g. loyalty program, a third-party integration, a dedicated account manager…"
            value={needs}
            onChange={(e) => onNeeds(e.target.value)}
          />
          <p className="ab-needs-hint">
            Everything in Standard is already included. Go ahead and pay —
            we'll email you to confirm what you asked for and take it from
            there.
          </p>
        </div>
      )}

      <p className="ab-total">
        <strong>{money(price.total)}</strong> per {cycleWord} for {branches}{" "}
        {branches === 1 ? "branch" : "branches"}
        {plan.cycle === "year" && " (12 months paid together)"}
      </p>

      <button
        className={"ab-btn " + (featured ? "ab-btn-green" : "ab-btn-dark")}
        onClick={onBuy}
      >
        {plan.cta}
      </button>

      <FeatureList items={plan.features} />
    </article>
  );
}

function FeatureList({ items }) {
  return (
    <ul className="ab-features">
      {items.map((f) => (
        <li key={f}>
          <Tick />
          {f}
        </li>
      ))}
    </ul>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="ab-tick">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================= checkout modal ================= */

function CheckoutModal({ cart, money, currency, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 details · 2 review+pay · 3 done
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentRecordId, setPaymentRecordId] = useState("");
  const boxRef = useRef(null);

  const isFree = cart.planId === "free";
  const hasNeeds = cart.extraNeeds && cart.extraNeeds.length > 0;
  const gst = Math.round(cart.total * 0.18);
  const grand = cart.total + gst;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    boxRef.current?.querySelector("input, button")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.restaurant.trim()) e.restaurant = "Tell us the restaurant name.";
    if (!form.name.trim()) e.name = "We need a name for the invoice.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      e.email = "Check the email address.";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "")))
      e.phone = "Enter a 10-digit mobile number.";
    if (!form.address.trim()) e.address = "We need an address for the invoice.";
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.toUpperCase()))
      e.gstin = "A GSTIN is 15 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildContact = () => ({
    restaurant: form.restaurant.trim(),
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.replace(/\D/g, ""),
    // Goes onto the invoice PDF and both invoice emails, so it's collected
    // here rather than left to the Register page.
    address: form.address.trim(),
    city: form.city.trim(),
    gstin: form.gstin.trim(),
    notes: form.notes.trim(),
    extraNeeds: cart.extraNeeds || "",
  });

  const next = async () => {
    if (!validate()) return;

    if (isFree) {
      setFailure("");
      setPaying(true);
      try {
        const result = await createPricingOrder({
          // FIX: cart.tierKey is null for the free plan (see openCheckout),
          // so the old cart.tierKey.toLowerCase() threw a TypeError and the
          // free trial never started at all.
          planId: cart.planId.toLowerCase(),
          tierKey: cart.tierKey ? cart.tierKey.toLowerCase() : null,
          branches: cart.branches,
          contact: buildContact(),
        });
        // A free trial has nothing to verify, so this IS the record id.
        setPaymentRecordId(result.paymentRecordId);
        setPaymentId("trial");
        setStep(3);
      } catch (err) {
        setFailure(err.message || "Could not start the free trial. Try again.");
      } finally {
        setPaying(false);
      }
      return;
    }

    setStep(2);
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const pay = async () => {
    setFailure("");
    setPaying(true);

    const ready = await loadRazorpay();
    if (!ready) {
      setPaying(false);
      setFailure("Could not load Razorpay. Check your connection and try again.");
      return;
    }

    // 1. Ask the backend for a real order — the amount charged is always
    //    computed server-side from planId/tierKey/branches, never taken
    //    from `grand` here, so nothing typed into devtools can change what
    //    gets billed.
    let order;
    try {
      order = await createPricingOrder({
        planId: cart.planId.toLowerCase(),
        tierKey: cart.tierKey ? cart.tierKey.toLowerCase() : null,
        branches: cart.branches,
        contact: buildContact(),
      });
    }catch (err) {
      console.log("❌ FULL ERROR:", err);   // 👈 ADD THIS
      console.log("❌ RESPONSE:", err?.response?.data); // 👈 ADD THIS

      setPaying(false);
      setFailure(
        err?.response?.data?.message || 
        err.message || 
        "Could not start checkout. Try again."
      );
      return;
    }

    // NOTE: deliberately no setPaymentRecordId(...) here. The backend no
    // longer writes a PricingPayment row at order-creation time, so there
    // is no record id to hold yet — and that's the point: an id handed over
    // before payment is a forgeable proof of purchase. It arrives from
    // verify-payment below, once the payment is real.

    // 2. Open Razorpay Checkout against that order.
    const rzp = new window.Razorpay({
      key: order.keyId || RAZORPAY_KEY,
      amount: order.amount, // paise, as returned by the backend
      currency: order.currency || "INR",
      order_id: order.orderId,
      name: "Abacco",
      description: cart.planName + " · " + cart.tierLabel,
      prefill: {
        name: form.name,
        email: form.email,
        contact: form.phone,
      },
      notes: {
        restaurant: form.restaurant,
        plan: cart.planName,
        tier: cart.tierLabel,
        branches: String(cart.branches),
        gstin: form.gstin,
        extra_needs: cart.extraNeeds || "",
      },
      theme: { color: "#1FA84F" },
      // 3. On success, verify the signature with the backend — the
      //    payment is only treated as real once /verify-payment confirms
      //    it, not the moment this callback fires.
      handler: async (res) => {
        try {
          const verification = await verifyPricingPayment({
            razorpay_order_id: res.razorpay_order_id,
            razorpay_payment_id: res.razorpay_payment_id,
            razorpay_signature: res.razorpay_signature,
          });
          setPaymentId(verification.razorpayPaymentId);
          setPaymentRecordId(verification.paymentRecordId);
          setPaying(false);
          setStep(3);
        } catch (err) {
          setPaying(false);
          setFailure(
            err.message ||
              "Payment went through but verification failed. Contact support with your payment id before retrying.",
          );
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });

    rzp.on("payment.failed", (res) => {
      setPaying(false);
      setFailure(
        res.error?.description || "The payment did not go through. Try again."
      );
    });

    rzp.open();
  };

  // Step 3 "Done": for a paid plan this is a genuine, verified payment; for
  // the free plan it's the trial signup record. Either way, hand off to
  // Register with enough context to prefill/link the account being created.
  const goToRegister = () => {
    // paymentId travels in the QUERY STRING, not only in router state:
    // state is lost the moment the user refreshes the Register page or
    // opens the link in a new tab, and losing it would strand a paying
    // customer on a form that can't be submitted. Register.jsx re-fetches
    // the payment from this id and treats the server's copy as
    // authoritative — the prefill below is only there to paint the fields
    // instantly while that request is in flight.
    const params = new URLSearchParams({
      paymentId: paymentRecordId || "",
      plan: cart.planId,
    });
    navigate(`/register?${params.toString()}`, {
      state: {
        paymentRecordId,
        planId: cart.planId,
        prefill: {
          restaurantName: form.restaurant,
          fullName: form.name,
          email: form.email,
          phone: form.phone,
          // The checkout now collects a full billing address (it goes on
          // the invoice); city remains the fallback for older flows.
          address: form.address || form.city,
        },
      },
    });
  };

  return (
    <div
      className="ab-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="ab-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        ref={boxRef}
      >
        <div className="ab-modal-head">
          <div>
            <p className="ab-modal-plan">{cart.planName}</p>
            <p className="ab-modal-meta">
              {isFree
                ? "30 days free · 1 branch"
                : cart.tierLabel +
                  " · " +
                  cart.branches +
                  (cart.branches === 1 ? " branch" : " branches") +
                  " · " +
                  inr(cart.unit) +
                  " per branch / month"}
            </p>
          </div>
          <button className="ab-x" onClick={onClose} aria-label="Close checkout">
            ×
          </button>
        </div>

        {!isFree && currency !== "INR" && step < 3 && (
          <p className="ab-cur-note">
            You'll be charged {inr(grand)} in INR, about {money(grand)} at
            today's rate. Your card issuer sets the final exchange rate.
          </p>
        )}

        {step === 1 && (
          <div className="ab-modal-body">
            <h3>Where should we send the licence?</h3>
            <div className="ab-form">
              <Field
                label="Restaurant name"
                value={form.restaurant}
                onChange={set("restaurant")}
                error={errors.restaurant}
                placeholder="Biryani restaurant"
              />
              <Field
                label="Your name"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
                placeholder="Ramesh Kumar"
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
                placeholder="owner@restaurant.com"
              />
              <Field
                label="Mobile"
                value={form.phone}
                onChange={set("phone")}
                error={errors.phone}
                placeholder="98765 43210"
              />
              <Field
                wide
                label="Billing address"
                value={form.address}
                onChange={set("address")}
                error={errors.address}
                placeholder="12 MG Road, Indiranagar, Bengaluru 560038"
              />
              <Field
                label="City"
                value={form.city}
                onChange={set("city")}
                placeholder="Bengaluru"
              />
              <Field
                label="GSTIN (optional)"
                value={form.gstin}
                onChange={set("gstin")}
                error={errors.gstin}
                placeholder="29ABCDE1234F1Z5"
              />
              <Field
                wide
                label="Anything we should know?"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Two counters, one cloud kitchen"
              />
            </div>

            {failure && <p className="ab-error-banner">{failure}</p>}

            <div className="ab-modal-foot">
              <span className="ab-foot-amount">
                {isFree ? "Nothing to pay today" : inr(grand) + " including GST"}
              </span>
              <button
                className="ab-btn ab-btn-dark ab-btn-inline"
                onClick={next}
                disabled={paying}
              >
                {isFree
                  ? paying
                    ? "Starting trial…"
                    : "Start free trial"
                  : "Continue to payment"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ab-modal-body">
            <h3>Check the order</h3>

            <dl className="ab-summary">
              <Row k="Restaurant" v={form.restaurant} />
              <Row k="Billing to" v={form.name + " · " + form.email} />
              <Row k="Mobile" v={form.phone} />
              {form.gstin && <Row k="GSTIN" v={form.gstin.toUpperCase()} />}
              <Row
                k={cart.planName + " · " + cart.tierLabel}
                v={
                  cart.branches +
                  " × " +
                  inr(cart.unit) +
                  (cart.cycle === "year" ? " × 12 months" : "")
                }
              />
              {hasNeeds && <Row k="Extra features requested" v={cart.extraNeeds} />}
              <Row k="Subtotal" v={inr(cart.total)} />
              <Row k="GST 18%" v={inr(gst)} />
              <Row k="Payable now" v={inr(grand)} strong />
            </dl>

            {failure && <p className="ab-error-banner">{failure}</p>}

            <div className="ab-modal-foot">
              <button className="ab-back" onClick={() => setStep(1)}>
                Edit details
              </button>
              <button
                className="ab-btn ab-btn-pay ab-btn-inline"
                onClick={pay}
                disabled={paying}
              >
                {paying ? "Opening Razorpay…" : "Pay " + inr(grand) + " with Razorpay"}
              </button>
            </div>
            <p className="ab-secure">
              Cards, UPI, net banking and wallets. Abacco never stores your card.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="ab-modal-body ab-done">
            <div className="ab-done-mark">
              <Tick />
            </div>
            <h3>
              {isFree
                ? "Trial is on. Check your email."
                : "Payment received. You're live."}
            </h3>
            <p className="ab-done-copy">
              {isFree
                ? "Login details for " + form.email + " are on their way. Someone from onboarding will call " + form.phone + " today to set up your menu."
                : "Your invoice and PDF receipt are on their way to " + form.email + ". Onboarding will call " + form.phone + " to move your menu and stock in."}
            </p>
            {hasNeeds && (
              <p className="ab-done-copy">
                We've also got your note about what extra you need — expect a
                follow-up email so you can confirm exactly what to add.
              </p>
            )}
            {!isFree && (
              <p className="ab-ref">
                Payment reference <code>{paymentId}</code>
              </p>
            )}
            <button
              className="ab-btn ab-btn-dark ab-btn-inline"
              onClick={goToRegister}
              // Step 3 is only reached after a verified payment or a free
              // trial, both of which set this — but sending someone to
              // /register with an empty paymentId would silently downgrade
              // them to a 1-branch account, so refuse rather than guess.
              disabled={!paymentRecordId}
            >
              Continue to registration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, wide, type = "text", ...rest }) {
  return (
    <label className={"ab-field" + (wide ? " ab-field-wide" : "")}>
      <span>{label}</span>
      <input type={type} aria-invalid={!!error} {...rest} />
      {error && <em>{error}</em>}
    </label>
  );
}

function Row({ k, v, strong }) {
  return (
    <div className={"ab-row" + (strong ? " ab-row-strong" : "")}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/* ================= styles ================= */

function Styles() {
  return (
    <style>{`
.ab-pricing{
  --bg:#F1F2EA; --ink:#121212; --muted:#5F6459; --line:#E0E2D6;
  --green:#1FA84F; --green-dark:#18863F; --card:#FFFFFF;
  background:var(--bg); color:var(--ink);
  font-family:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  padding:72px 24px 96px; min-height:100%;
}
.ab-pricing *{box-sizing:border-box}

.ab-head{max-width:760px;margin:0 auto 56px}
.ab-kicker{margin:0 0 14px;font-size:14px;color:var(--green);font-weight:600}
.ab-head h1{
  margin:0 0 18px;font-size:clamp(38px,5.4vw,62px);line-height:1.02;
  letter-spacing:-.035em;font-weight:800;
}
.ab-lede{margin:0;max-width:62ch;font-size:17px;line-height:1.6;color:var(--muted)}

.ab-grid{
  display:grid;gap:22px;max-width:1160px;margin:0 auto;
  grid-template-columns:repeat(3,1fr);align-items:start;
}
@media(max-width:1000px){.ab-grid{grid-template-columns:1fr;max-width:520px}}

.ab-card{
  position:relative;background:var(--card);border:1px solid var(--line);
  border-radius:22px;padding:30px 28px 32px;display:flex;flex-direction:column;
}
.ab-card-featured{border:1.5px solid var(--green);box-shadow:0 18px 40px -28px rgba(31,168,79,.55)}
.ab-ribbon{
  position:absolute;top:-12px;left:28px;background:var(--green);color:#fff;
  font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;
}
.ab-card-top h2{margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-.02em}
.ab-card-sub{margin:0 0 22px;font-size:14.5px;line-height:1.5;color:var(--muted)}

.ab-tabs{display:flex;gap:6px;background:#F3F4EE;border-radius:12px;padding:4px;margin-bottom:22px}
.ab-tab{
  flex:1;border:0;background:transparent;padding:9px 10px;border-radius:9px;
  font:inherit;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;
}
.ab-tab.is-on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.1)}

.ab-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.ab-was{font-size:17px;color:#9AA093;text-decoration:line-through}
.ab-amount{font-size:46px;font-weight:800;letter-spacing:-.04em;line-height:1}
.ab-per{font-size:14px;color:var(--muted)}

.ab-seats{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.ab-seats label{font-size:14.5px;font-weight:600}
.ab-stepper{display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.ab-stepper button{
  width:36px;height:36px;border:0;background:#F7F8F3;font-size:18px;line-height:1;
  cursor:pointer;color:var(--ink);
}
.ab-stepper button:hover{background:#EDEFE6}
.ab-stepper input{
  width:52px;height:36px;border:0;border-left:1px solid var(--line);
  border-right:1px solid var(--line);text-align:center;font:inherit;font-weight:600;
}
.ab-stepper input:focus-visible{outline:2px solid var(--green);outline-offset:-2px}

.ab-needs{border:1px dashed var(--line);border-radius:14px;padding:14px 16px;margin:0 0 18px}
.ab-needs label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px}
.ab-needs textarea{
  width:100%;resize:vertical;min-height:64px;padding:10px 12px;border:1px solid var(--line);
  border-radius:10px;font:inherit;font-size:14px;background:#FCFDF9;
}
.ab-needs textarea:focus{outline:2px solid var(--green);outline-offset:-1px;background:#fff}
.ab-needs-hint{margin:8px 0 0;font-size:12.5px;line-height:1.5;color:var(--muted)}

.ab-total{margin:0 0 20px;font-size:14.5px;color:var(--muted)}
.ab-total strong{color:var(--ink);font-size:16px}
.ab-total-quiet{margin-top:-4px}

.ab-btn{
  width:100%;padding:15px 20px;border:0;border-radius:12px;font:inherit;
  font-size:15.5px;font-weight:600;cursor:pointer;transition:background .15s,transform .1s;
}
.ab-btn:active{transform:translateY(1px)}
.ab-btn:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.ab-btn-dark{background:#111;color:#fff}
.ab-btn-dark:hover{background:#2b2b2b}
.ab-btn-green{background:var(--green);color:#fff}
.ab-btn-green:hover{background:var(--green-dark)}
.ab-btn-ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.ab-btn-ghost:hover{background:#F7F8F3}
.ab-btn-pay{background:var(--green);color:#fff}
.ab-btn-pay:hover{background:var(--green-dark)}
.ab-btn-pay[disabled]{opacity:.65;cursor:progress}
.ab-btn-inline{width:auto}

.ab-features{list-style:none;margin:26px 0 0;padding:22px 0 0;border-top:1px solid var(--line)}
.ab-features li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45;padding:7px 0}
.ab-tick{width:18px;height:18px;flex:none;margin-top:1px;color:var(--green)}

.ab-foot{max-width:1160px;margin:34px auto 0;font-size:13.5px;color:var(--muted)}

/* modal */
.ab-overlay{
  position:fixed;inset:0;background:rgba(18,20,16,.55);backdrop-filter:blur(3px);
  display:flex;align-items:center;justify-content:center;padding:20px;z-index:60;
}
.ab-modal{
  width:min(680px,100%);max-height:92vh;overflow:auto;background:#fff;
  border-radius:20px;font-family:inherit;
}
.ab-modal-head{
  display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
  padding:24px 26px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;
}
.ab-modal-plan{margin:0 0 4px;font-size:18px;font-weight:700}
.ab-modal-meta{margin:0;font-size:13.5px;color:var(--muted)}
.ab-x{border:0;background:#F3F4EE;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1}
.ab-x:hover{background:#E7E9DE}
.ab-modal-body{padding:24px 26px 26px}
.ab-modal-body h3{margin:0 0 18px;font-size:17px;font-weight:700}

.ab-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:560px){.ab-form{grid-template-columns:1fr}}
.ab-field{display:flex;flex-direction:column;gap:6px;font-size:13.5px}
.ab-field-wide{grid-column:1/-1}
.ab-field span{font-weight:600}
.ab-field input{
  padding:11px 13px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:15px;background:#FCFDF9;
}
.ab-field input:focus{outline:2px solid var(--green);outline-offset:-1px;background:#fff}
.ab-field input[aria-invalid="true"]{border-color:#C8402F}
.ab-field em{font-style:normal;font-size:12.5px;color:#C8402F}

.ab-summary{margin:0}
.ab-row{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.ab-row dt{color:var(--muted);margin:0}
.ab-row dd{margin:0;text-align:right;font-weight:600}
.ab-row-strong{border-bottom:0;font-size:17px;padding-top:14px}
.ab-row-strong dt{color:var(--ink);font-weight:700}

.ab-error-banner{margin:16px 0 0;padding:11px 14px;border-radius:10px;background:#FDECE9;color:#992A1B;font-size:14px}

.ab-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px;flex-wrap:wrap}
.ab-foot-amount{font-size:14.5px;color:var(--muted)}
.ab-back{border:0;background:none;font:inherit;font-size:14.5px;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0}
.ab-secure{margin:14px 0 0;font-size:12.5px;color:var(--muted);text-align:right}

.ab-done{text-align:center;padding-top:34px}
.ab-done-mark{width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:#E8F6EC;display:grid;place-items:center}
.ab-done-mark .ab-tick{width:28px;height:28px}
.ab-done h3{font-size:21px;margin-bottom:10px}
.ab-done-copy{margin:0 auto 16px;max-width:46ch;font-size:14.5px;line-height:1.55;color:var(--muted)}
.ab-ref{font-size:13px;color:var(--muted);margin:0 0 22px}
.ab-ref code{background:#F3F4EE;padding:3px 7px;border-radius:6px}

/* currency picker */
.ab-cur{max-width:1160px;margin:0 auto 26px;display:flex;align-items:center;flex-wrap:wrap;gap:12px 14px}
.ab-cur-label{font-size:14px;font-weight:600}
.ab-cur-rate{font-size:13px;color:var(--muted)}
.ab-cur-wrap{position:relative}
.ab-cur-btn{
  display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border:1px solid var(--line);
  background:#fff;border-radius:12px;font:inherit;font-size:14.5px;font-weight:600;color:var(--ink);cursor:pointer;
}
.ab-cur-btn:hover{border-color:#C9CCBC}
.ab-cur-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.ab-cur-chip{
  width:28px;height:28px;flex:none;border-radius:50%;background:#E8F6EC;color:var(--green-dark);
  display:grid;place-items:center;font-size:13px;font-weight:700;
}
.ab-cur-chip-sm{font-size:10px;letter-spacing:-.02em}
.ab-cur-caret{width:14px;height:14px;color:var(--muted)}
.ab-cur-pop{
  position:absolute;top:calc(100% + 8px);left:0;z-index:30;width:min(340px,calc(100vw - 48px));
  background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px;
  box-shadow:0 24px 48px -20px rgba(18,20,16,.35);
}
.ab-cur-search{
  width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;
  font:inherit;font-size:14.5px;background:#FCFDF9;
}
.ab-cur-search:focus{outline:2px solid var(--green);outline-offset:-1px;background:#fff}
.ab-cur-list{list-style:none;margin:8px 0 0;padding:0;max-height:320px;overflow:auto}
.ab-cur-opt{
  width:100%;display:flex;align-items:center;gap:10px;padding:8px;border:0;background:transparent;
  border-radius:10px;font:inherit;text-align:left;cursor:pointer;color:var(--ink);
}
.ab-cur-opt:hover,.ab-cur-opt.is-on{background:#F3F4EE}
.ab-cur-opt:focus-visible{outline:2px solid var(--green);outline-offset:-2px}
.ab-cur-opt-name{display:block;font-size:14.5px;font-weight:600}
.ab-cur-opt-sub{display:block;font-size:12.5px;color:var(--muted)}
.ab-cur-empty,.ab-cur-more{margin:10px 4px 2px;font-size:13px;color:var(--muted)}
.ab-cur-note{
  margin:0;padding:11px 26px;background:#F7F8F3;border-bottom:1px solid var(--line);
  font-size:13px;line-height:1.5;color:var(--muted);
}
.ab-amount-long{font-size:34px}

@media(prefers-reduced-motion:reduce){.ab-pricing *{transition:none!important}}
    `}</style>
  );
}