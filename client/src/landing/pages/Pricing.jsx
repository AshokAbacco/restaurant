import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------
   Abacco — Pricing (UI only, no backend)

   Razorpay: replace RAZORPAY_KEY with your publishable key id.
   While the key is still the placeholder below, the Pay button runs in
   demo mode (fake payment id) so the flow can be clicked through.
   For live payments you still need one backend call to create an
   order_id and one to verify the signature — see notes at the bottom.
------------------------------------------------------------------- */

const RAZORPAY_KEY = "rzp_test_XXXXXXXXXXXXXX";

const inr = (n) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

const BASE_FEATURES = [
  "Orders, KOT and table map",
  "Billing with GST invoices",
  "Works offline, syncs when you're back",
  "Menu and stock management",
];

const PLANS = {
  free: {
    id: "free",
    name: "Free One Month",
    sub: "30 days on the full system. No card, no commitment.",
    cta: "Start free trial",
    features: [
      ...BASE_FEATURES,
      "1 outlet, up to 5 users",
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
      custom: { label: "Custom", mrp: 1300, price: 1000 },
    },
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Zomato / Swiggy order sync",
      "Phone support, 9am–11pm",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Year",
    sub: "Pay once for twelve months and keep the lower rate.",
    cta: "Buy yearly plan",
    cycle: "year",
    ribbon: "Cheapest per seat",
    tiers: {
      standard: { label: "Standard", mrp: 650, price: 550 },
      custom: { label: "Custom", mrp: 1000, price: 800 },
    },
    features: [
      ...BASE_FEATURES,
      "Daily sales and item reports",
      "Zomato / Swiggy order sync",
      "Phone support, 9am–11pm",
      "Free onboarding and staff training",
    ],
  },
};

/* Add-ons shown only on the Custom tier */
const MODULES = [
  "Multi-outlet control",
  "Recipe costing and wastage",
  "Loyalty, CRM and campaigns",
  "API and third-party integrations",
  "Dedicated account manager",
  "Priority 24×7 support",
];

const emptyForm = {
  restaurant: "",
  name: "",
  email: "",
  phone: "",
  city: "",
  gstin: "",
  outlets: "1",
  notes: "",
};

export default function Pricing() {
  const [tier, setTier] = useState({ monthly: "standard", yearly: "standard" });
  const [seats, setSeats] = useState({ monthly: 10, yearly: 10 });
  const [modules, setModules] = useState([]);
  const [cart, setCart] = useState(null); // { planId, tierKey, seats, unit, total, cycle }

  const priceOf = (planId) => {
    const plan = PLANS[planId];
    if (!plan.tiers) return { unit: 0, mrp: 0, total: 0 };
    const t = plan.tiers[tier[planId]];
    const n = seats[planId];
    const months = planId === "yearly" ? 12 : 1;
    return { unit: t.price, mrp: t.mrp, total: t.price * n * months };
  };

  const setSeatCount = (planId, v) => {
    const n = Math.max(1, Math.min(500, Number(v) || 1));
    setSeats((s) => ({ ...s, [planId]: n }));
  };

  const toggleModule = (m) =>
    setModules((list) =>
      list.includes(m) ? list.filter((x) => x !== m) : [...list, m]
    );

  const openCheckout = (planId) => {
    const plan = PLANS[planId];
    if (planId === "free") {
      setCart({
        planId,
        planName: plan.name,
        tierKey: null,
        tierLabel: "Free trial",
        seats: 5,
        unit: 0,
        total: 0,
        cycle: "30 days",
        modules: [],
      });
      return;
    }
    const p = priceOf(planId);
    setCart({
      planId,
      planName: plan.name,
      tierKey: tier[planId],
      tierLabel: plan.tiers[tier[planId]].label,
      seats: seats[planId],
      unit: p.unit,
      total: p.total,
      cycle: planId === "yearly" ? "year" : "month",
      modules: tier[planId] === "custom" ? modules : [],
    });
  };

  return (
    <main className="ab-pricing">
      <Styles />

      <header className="ab-head">
        <p className="ab-kicker">Pricing</p>
        <h1>
          One price per user.
          <br />
          Every outlet, every screen.
        </h1>
        <p className="ab-lede">
          Counter, kitchen display, captain app and back office are all in the
          same licence. Start free for a month, then pick the cycle that suits
          your cash flow.
        </p>
      </header>

      <section className="ab-grid">
        {/* ---------------- Free ---------------- */}
        <article className="ab-card">
          <div className="ab-card-top">
            <h2>{PLANS.free.name}</h2>
            <p className="ab-card-sub">{PLANS.free.sub}</p>
          </div>

          <div className="ab-price">
            <span className="ab-amount">₹0</span>
            <span className="ab-per">for 30 days</span>
          </div>
          <p className="ab-total ab-total-quiet">
            Up to 5 users, 1 outlet. Card details are not asked for.
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
          seats={seats.monthly}
          onSeats={(v) => setSeatCount("monthly", v)}
          price={priceOf("monthly")}
          modules={modules}
          onModule={toggleModule}
          onBuy={() => openCheckout("monthly")}
        />

        {/* ---------------- Yearly ---------------- */}
        <PaidCard
          featured
          plan={PLANS.yearly}
          tierKey={tier.yearly}
          onTier={(k) => setTier((t) => ({ ...t, yearly: k }))}
          seats={seats.yearly}
          onSeats={(v) => setSeatCount("yearly", v)}
          price={priceOf("yearly")}
          modules={modules}
          onModule={toggleModule}
          onBuy={() => openCheckout("yearly")}
        />
      </section>

      <p className="ab-foot">
        Prices are per user and exclude 18% GST. Hardware, printers and one-time
        data migration are quoted separately.
      </p>

      {cart && <CheckoutModal cart={cart} onClose={() => setCart(null)} />}
    </main>
  );
}

/* ================= card ================= */

function PaidCard({
  plan,
  featured,
  tierKey,
  onTier,
  seats,
  onSeats,
  price,
  modules,
  onModule,
  onBuy,
}) {
  const isCustom = tierKey === "custom";
  const cycleWord = plan.cycle === "year" ? "year" : "month";

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
        <span className="ab-was">{inr(price.mrp)}</span>
        <span className="ab-amount">{inr(price.unit)}</span>
        <span className="ab-per">per user / month</span>
      </div>

      <div className="ab-seats">
        <label htmlFor={plan.id + "-seats"}>Users</label>
        <div className="ab-stepper">
          <button onClick={() => onSeats(seats - 1)} aria-label="Remove a user">
            –
          </button>
          <input
            id={plan.id + "-seats"}
            value={seats}
            inputMode="numeric"
            onChange={(e) => onSeats(e.target.value)}
          />
          <button onClick={() => onSeats(seats + 1)} aria-label="Add a user">
            +
          </button>
        </div>
      </div>

      {isCustom && (
        <fieldset className="ab-modules">
          <legend>Pick what you need</legend>
          {MODULES.map((m) => (
            <label key={m} className="ab-check">
              <input
                type="checkbox"
                checked={modules.includes(m)}
                onChange={() => onModule(m)}
              />
              <span>{m}</span>
            </label>
          ))}
        </fieldset>
      )}

      <p className="ab-total">
        <strong>{inr(price.total)}</strong> per {cycleWord} for {seats}{" "}
        {seats === 1 ? "user" : "users"}
        {plan.cycle === "year" && " (12 months paid together)"}
      </p>

      <button
        className={"ab-btn " + (featured ? "ab-btn-green" : "ab-btn-dark")}
        onClick={onBuy}
      >
        {plan.cta}
      </button>

      <FeatureList items={plan.features} extra={isCustom ? modules : []} />
    </article>
  );
}

function FeatureList({ items, extra = [] }) {
  return (
    <ul className="ab-features">
      {items.map((f) => (
        <li key={f}>
          <Tick />
          {f}
        </li>
      ))}
      {extra.map((f) => (
        <li key={f} className="ab-feature-added">
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

function CheckoutModal({ cart, onClose }) {
  const [step, setStep] = useState(1); // 1 details · 2 review+pay · 3 done
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const boxRef = useRef(null);

  const isFree = cart.planId === "free";
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
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.toUpperCase()))
      e.gstin = "A GSTIN is 15 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (isFree) {
      setPaymentId("trial");
      setStep(3);
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
    const demo = !ready || RAZORPAY_KEY.includes("XXXX");

    if (demo) {
      // No key / no backend yet: show the rest of the flow anyway.
      setTimeout(() => {
        setPaymentId("pay_demo_" + Math.random().toString(36).slice(2, 12));
        setPaying(false);
        setStep(3);
      }, 1100);
      return;
    }

    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY,
      amount: grand * 100, // paise
      currency: "INR",
      name: "Abacco",
      description: cart.planName + " · " + cart.tierLabel,
      // order_id: "<from your server>",
      prefill: {
        name: form.name,
        email: form.email,
        contact: form.phone,
      },
      notes: {
        restaurant: form.restaurant,
        plan: cart.planName,
        tier: cart.tierLabel,
        users: String(cart.seats),
        gstin: form.gstin,
      },
      theme: { color: "#1FA84F" },
      handler: (res) => {
        setPaymentId(res.razorpay_payment_id);
        setPaying(false);
        setStep(3);
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
                ? "30 days free · up to 5 users"
                : cart.tierLabel +
                  " · " +
                  cart.seats +
                  (cart.seats === 1 ? " user" : " users") +
                  " · " +
                  inr(cart.unit) +
                  " per user / month"}
            </p>
          </div>
          <button className="ab-x" onClick={onClose} aria-label="Close checkout">
            ×
          </button>
        </div>

        {step === 1 && (
          <div className="ab-modal-body">
            <h3>Where should we send the licence?</h3>
            <div className="ab-form">
              <Field
                label="Restaurant name"
                value={form.restaurant}
                onChange={set("restaurant")}
                error={errors.restaurant}
                placeholder="Anand Bhavan, Indiranagar"
              />
              <Field
                label="Your name"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
                placeholder="Rasul Abacco"
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
                label="Outlets"
                value={form.outlets}
                onChange={set("outlets")}
                placeholder="1"
              />
              <Field
                wide
                label="Anything we should know?"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Two counters, one cloud kitchen, Petpooja data to migrate"
              />
            </div>

            <div className="ab-modal-foot">
              <span className="ab-foot-amount">
                {isFree ? "Nothing to pay today" : inr(grand) + " including GST"}
              </span>
              <button className="ab-btn ab-btn-dark ab-btn-inline" onClick={next}>
                {isFree ? "Start free trial" : "Continue to payment"}
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
                  cart.seats +
                  " × " +
                  inr(cart.unit) +
                  (cart.cycle === "year" ? " × 12 months" : "")
                }
              />
              {cart.modules.length > 0 && (
                <Row k="Add-ons" v={cart.modules.join(", ")} />
              )}
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
                : "An invoice is on its way to " + form.email + ". Onboarding will call " + form.phone + " to move your menu and stock in."}
            </p>
            {!isFree && (
              <p className="ab-ref">
                Payment reference <code>{paymentId}</code>
              </p>
            )}
            <button className="ab-btn ab-btn-dark ab-btn-inline" onClick={onClose}>
              Done
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

.ab-modules{border:1px dashed var(--line);border-radius:14px;padding:14px 16px;margin:0 0 18px}
.ab-modules legend{padding:0 6px;font-size:13px;font-weight:600;color:var(--muted)}
.ab-check{display:flex;gap:9px;align-items:center;font-size:14px;padding:4px 0;cursor:pointer}
.ab-check input{width:16px;height:16px;accent-color:var(--green)}

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
.ab-feature-added{color:var(--green-dark);font-weight:600}
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

@media(prefers-reduced-motion:reduce){.ab-pricing *{transition:none!important}}
    `}</style>
  );
}

/* ------------------------------------------------------------------
   When you add the backend later, only two things change:
   1. POST /api/orders  -> returns { order_id }. Pass it as order_id in
      the Razorpay options object above (amount then comes from the order).
   2. POST /api/verify  -> send razorpay_payment_id, razorpay_order_id and
      razorpay_signature from the handler, activate the licence on success.
   The form data in `form` is the payload for step 1.
------------------------------------------------------------------- */