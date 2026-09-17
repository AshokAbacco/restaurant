import React, { useState } from "react";
import {
  Leaf,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
} from "lucide-react";

/**
 * Contact us — matched to the "Smart Restaurant Management" landing
 * page palette: deep green accent (#2F6E3B), black display type,
 * a soft green gradient backdrop, and pill-shaped controls.
 */

const BRAND_GREEN = "#2F6E3B";


const CONTACT_DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@restauranterp.com",
    href: "mailto:hello@restauranterp.com",
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
    value: "4th Floor, Prestige Tech Park, Bengaluru, India",
    href: null,
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon–Sat, 9:30 AM – 6:30 PM IST",
    href: null,
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: replace with your real submit call, e.g.
    // await fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })
    setSubmitted(true);
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
                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  Message sent
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                  Thanks, {form.name.split(" ")[0] || "there"} — we've got your
                  message and will get back to you within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-[#FAFCF8] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": BRAND_GREEN }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@restaurant.com"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-[#FAFCF8] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": BRAND_GREEN }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Message
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us a bit about your kitchen setup and what you need help with."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-[#FAFCF8] px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": BRAND_GREEN }}
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  Send message
                  <ArrowRight className="h-4 w-4" />
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