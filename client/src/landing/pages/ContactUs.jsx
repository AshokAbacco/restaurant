import React, { useState } from "react";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
} from "lucide-react";

/**
 * Contact us — matched to the "Smart Restaurant Management" landing
 * page palette: deep green accent (#2F6E3B), black display type,
 * a soft green gradient backdrop, and pill-shaped controls.
 *
 * Posts to POST /api/contact, which stores the submission and sends the
 * confirmation + internal notification emails.
 */

const BRAND_GREEN = "#2F6E3B";

// Vite env; falls back to the local server in dev. If you already have a
// configured axios instance (like tableReservationApi.js), swap the fetch
// call in handleSubmit for it and drop this.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const EMPTY_FORM = {
  restaurantName: "",
  fullName: "",
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
    value: "info@abaccotech.com",
    href: "mailto:info@abaccotech.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Vidyaranyapura, Bengaluru, Karnataka 560097",
    href: null,
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon–Sat, 9:30 AM – 6:30 PM IST",
    href: null,
  },
];

const fieldClass =
  "mt-2 w-full rounded-xl border bg-[#FAFCF8] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-transparent focus:ring-2";

function Field({
  label,
  name,
  error,
  hint,
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
      <Tag
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${fieldClass} ${
          error ? "border-red-300" : "border-slate-200"
        } ${as === "textarea" ? "resize-none" : ""}`}
        style={{ "--tw-ring-color": error ? "#DC2626" : BRAND_GREEN }}
        {...rest}
      />
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
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setErrors({});
    setFormError("");

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <div className="min-h-screen bg-[#EEF6E9]">
      {/* Hero-style intro */}
      <div className="relative overflow-hidden px-6 pt-10 sm:px-10 lg:px-16">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: "#BFE3B0" }}
        />
        <div
          className="pointer-events-none absolute -right-16 top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: "#8FCB7A" }}
        />

        <div className="relative mx-auto max-w-5xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow-sm"
            style={{ color: BRAND_GREEN }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: BRAND_GREEN }}
            />
            We reply within a day
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Let's talk about your
            <br />
            <span style={{ color: BRAND_GREEN }}>restaurant floor.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600">
            Questions about setup, pricing, or migrating from your current
            system — our team is one message away.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-14 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Form card */}
          <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_-20px_rgba(47,110,59,0.25)] sm:p-10">
            {submitted ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#E4F3DC" }}
                >
                  <Send className="h-5 w-5" style={{ color: BRAND_GREEN }} />
                </div>
                <h2 className="mt-8 text-lg font-bold text-slate-900">
                  Message sent — thanks for reaching out!
                </h2>
                {/* <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                  Thanks, {form.fullName.split(" ")[0] || "there"} — we've got
                  your message and will get back to you within 24 hours. A
                  confirmation is on its way to {form.email}.
                </p> */}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field
                    label="Restaurant name"
                    name="restaurantName"
                    value={form.restaurantName}
                    onChange={handleChange}
                    error={errors.restaurantName}
                    placeholder="Spice Garden"
                    autoComplete="organization"
                    maxLength={120}
                  />
                  <Field
                    label="Full name"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                    placeholder="Your name"
                    autoComplete="name"
                    maxLength={120}
                  />
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="you@restaurant.com"
                    autoComplete="email"
                    maxLength={160}
                  />
                  <Field
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    maxLength={20}
                  />
                </div>

                <Field
                  label="Address"
                  hint="(optional)"
                  name="address"
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
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  error={errors.message}
                  placeholder="Tell us a bit about your kitchen setup and what you need help with."
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
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  {sending ? "Sending" : "Send message"}
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact details */}
          <div className="space-y-4">
            {CONTACT_DETAILS.map(({ icon: Icon, label, value, href }) => (
              <div
                key={label}
                className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_-15px_rgba(47,110,59,0.2)]"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "#E4F3DC" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </div>
                </div>
                {href ? (
                  <a
                    href={href}
                    className="mt-2.5 block text-sm font-medium text-slate-800 hover:text-slate-900"
                  >
                    {value}
                  </a>
                ) : (
                  <div className="mt-2.5 text-sm font-medium text-slate-800">
                    {value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}