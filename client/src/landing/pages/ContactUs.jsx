import React, { useState } from "react";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  User,
  Store,
  MessageSquare,
} from "lucide-react";

const BRAND_GREEN = "#2F6E3B";

// Vite env; falls back to the local server in dev. If you already have a
// configured axios instance (like tableReservationApi.js), swap the fetch
// call in handleSubmit for it and drop this.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Full-length background that covers heading, form and map.
// File lives at client/public/images/contact.png
const BG_IMAGE = "/images/contact.png";

// Map embed (no API key needed). Change the query if the office moves.
const MAP_QUERY = "Vidyaranyapura, Bengaluru, Karnataka 560097";
// Map embed (no API key needed). Pinned to the exact office coordinates.
const MAP_LAT = 13.084575;
const MAP_LNG = 77.554506;
const MAP_SRC = `https://www.google.com/maps?q=${MAP_LAT},${MAP_LNG}&z=16&output=embed`;

// firstName / lastName are UI-only; they are joined into `fullName`
// on submit so the API payload stays exactly the same as before.
const EMPTY_FORM = {
  restaurantName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  message: "",
  company: "", // honeypot — hidden from real users, see contact.controller.js
};

const CONTACT_DETAILS = [
  {
    icon: Mail,
    label: "Email",
    values: [
      { text: "info@abaccotech.com", href: "mailto:info@abaccotech.com" },
      {
        text: "support@abaccotech.com",
        href: "mailto:support@abaccotech.com",
      },
    ],
  },
  {
    icon: Phone,
    label: "Phone",
    values: [{ text: "+91 98765 43210", href: "tel:+919876543210" }],
  },
  {
    icon: MapPin,
    label: "Office",
    values: [{ text: "Vidyaranyapura, Bengaluru, Karnataka 560097" }],
  },
  {
    icon: Clock,
    label: "Support Hours",
    values: [{ text: "Mon – Sat, 9:00 AM – 6:00 PM" }],
    note: "We usually reply within 24 hours.",
  },
];

const fieldClass =
  "mt-2 w-full rounded-xl border bg-white/80 py-3 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-transparent focus:ring-2";

function Field({
  label,
  name,
  error,
  hint,
  icon: Icon,
  as = "input",
  value,
  onChange,
  ...rest
}) {
  const Tag = as === "textarea" ? "textarea" : "input";

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
        {hint ? (
          <span className="ml-1 font-normal text-slate-400">{hint}</span>
        ) : null}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            className={`pointer-events-none absolute left-4 h-4 w-4 text-slate-500 ${
              as === "textarea" ? "top-[1.15rem]" : "top-1/2 mt-1 -translate-y-1/2"
            }`}
          />
        ) : null}
        <Tag
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${fieldClass} ${Icon ? "pl-11" : "pl-4"} ${
            error ? "border-red-300" : "border-slate-200"
          } ${as === "textarea" ? "resize-none" : ""}`}
          style={{ "--tw-ring-color": error ? "#DC2626" : BRAND_GREEN }}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // first/last name both feed the backend's `fullName` error
    const errKey =
      name === "firstName" || name === "lastName" ? "fullName" : name;
    setErrors((prev) =>
      prev[errKey] ? { ...prev, [errKey]: undefined } : prev,
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setErrors({});
    setFormError("");

    // Same payload shape the backend already expects.
    const payload = {
      restaurantName: form.restaurantName,
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      phone: form.phone,
      address: form.address,
      message: form.message,
      company: form.company,
    };

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFormError(
          data.message || "The message didn't go through. Try again in a moment.",
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#EEF6E9]"
      style={{
        backgroundImage: `url("${BG_IMAGE}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% auto",
        backgroundPosition: "center top",
        backgroundAttachment: "scroll",
      }}
    >
      {/* Heading */}
      <section className="px-6 pt-14 text-center sm:px-10 lg:px-16">
        <span
          className="inline-block rounded-full bg-[#DDEFD3] px-4 py-1.5 text-xs font-bold uppercase tracking-wide"
          style={{ color: BRAND_GREEN }}
        >
          Get in touch
        </span>

        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Let's talk about your
          <br />
          <span style={{ color: BRAND_GREEN }}>restaurant floor.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-600">
          Questions about setup, pricing, or migrating from your current system
          — our team is just a message away.
        </p>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 sm:px-10 lg:px-8 lg:pt-32">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Get in touch */}
          <div className="rounded-3xl bg-white/95 p-8 shadow-[0_20px_60px_-25px_rgba(47,110,59,0.3)] backdrop-blur sm:p-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Get in touch
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-500">
              Our team is here to help. Reach out via any of the channels below
              or send us a message.
            </p>

            <div className="mt-8 space-y-8">
              {CONTACT_DETAILS.map(({ icon: Icon, label, values, note }) => (
                <div key={label} className="flex items-start gap-5">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#E4F3DC" }}
                  >
                    <Icon className="h-6 w-6" style={{ color: BRAND_GREEN }} />
                  </div>
                  <div className="pt-0.5">
                    <div className="text-base font-bold text-slate-900">
                      {label}
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {values.map(({ text, href }) =>
                        href ? (
                          <a
                            key={text}
                            href={href}
                            className="block text-[15px] font-medium hover:underline"
                            style={{ color: BRAND_GREEN }}
                          >
                            {text}
                          </a>
                        ) : (
                          <div
                            key={text}
                            className="max-w-[16rem] text-[15px] leading-relaxed text-slate-600"
                          >
                            {text}
                          </div>
                        ),
                      )}
                    </div>
                    {note ? (
                      <p className="mt-1 text-sm text-slate-400">{note}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="rounded-3xl bg-white/95 p-8 shadow-[0_20px_60px_-25px_rgba(47,110,59,0.3)] backdrop-blur sm:p-10">
            {submitted ? (
              <div className="flex h-full min-h-[24rem] flex-col items-center justify-center text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#E4F3DC" }}
                >
                  <Send className="h-6 w-6" style={{ color: BRAND_GREEN }} />
                </div>
                <h2 className="mt-8 text-lg font-bold text-slate-900">
                  Message sent — thanks for reaching out!
                </h2>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Send us a message
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  Fill in the details below and we'll get back to you soon.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mt-6 space-y-5"
                  noValidate
                >
                  <Field
                    label="Restaurant name"
                    name="restaurantName"
                    icon={Store}
                    value={form.restaurantName}
                    onChange={handleChange}
                    error={errors.restaurantName}
                    placeholder="Spice Garden"
                    autoComplete="organization"
                    maxLength={120}
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label="First name"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      error={errors.fullName}
                      placeholder="John"
                      autoComplete="given-name"
                      maxLength={60}
                    />
                    <Field
                      label="Last name"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      autoComplete="family-name"
                      maxLength={60}
                    />
                  </div>

                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    icon={Mail}
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={160}
                  />

                  <Field
                    label="Phone number"
                    name="phone"
                    type="tel"
                    icon={Phone}
                    value={form.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    maxLength={20}
                  />

                  <Field
                    label="Address"
                    hint="(optional)"
                    name="address"
                    icon={MapPin}
                    value={form.address}
                    onChange={handleChange}
                    error={errors.address}
                    placeholder="Street, area, city"
                    autoComplete="street-address"
                    maxLength={300}
                  />

                  <Field
                    label="Message"
                    name="message"
                    as="textarea"
                    icon={MessageSquare}
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    error={errors.message}
                    placeholder="Tell us about your restaurant setup and how we can help..."
                    maxLength={5000}
                  />

                  {/* Honeypot — hidden from people, harvested by bots */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="company">Company</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.company}
                      onChange={handleChange}
                    />
                  </div>

                  {formError ? (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ backgroundColor: "#339A45" }}
                  >
                    {sending ? "Sending" : "Send message"}
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="relative h-[22rem] w-full overflow-hidden rounded-t-[2rem] sm:h-[26rem]">
        <iframe
          title="Abacco office location"
          src={MAP_SRC}
          className="h-full w-full border-0 grayscale-[35%]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-[120%] rounded-xl bg-white px-4 py-3 text-center shadow-lg">
          <div className="text-sm font-bold text-slate-900">Our Office</div>
          <div className="mt-0.5 text-xs leading-snug text-slate-600">
            Vidyaranyapura, Bengaluru
            <br />
            Karnataka 560097
          </div>
        </div>
      </section>
    </div>
  );
}