// ==============================================
// src/landing/ComingSoon.jsx
// ==============================================
//
// A holding page for About, Services, Pricing and Contact until each one
// is built.
//
// It exists because of how App.jsx ends: any unmatched path falls through
// to `<Route path="*" element={<Navigate to="/dashboard" />} />`, which
// then bounces an anonymous visitor to /login. So leaving those four
// routes undefined wouldn't produce a 404 — it would throw someone who
// clicked "Pricing" onto a sign-in form, which reads as a broken site.
//
// An empty screen is an invitation to act, so this one says what's
// missing and points at the two things that do work.

import { Link } from "react-router-dom";

import { BRAND } from "./landing.config";

const ComingSoon = ({ title, note }) => (
  <section className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8 lg:py-36">
    <div className="max-w-[34rem]">
      <h1 className="lp-display text-[clamp(2.4rem,6vw,4rem)] text-[#171C17]">
        {title}
      </h1>

      <p className="mt-5 text-[16.5px] leading-[1.7] text-[#4b5563]">
        {note ||
          `This page is still being written. In the meantime you can start a free trial, or email us at ${BRAND.email} and we'll answer whatever you were about to ask.`}
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          to="/register"
          className="rounded-full bg-[#3FA34D] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
        >
          Start free trial
        </Link>

        <Link
          to="/"
          className="rounded-full border border-[#171C17]/15 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#171C17] transition-colors hover:border-[#171C17]/40"
        >
          Back to home
        </Link>
      </div>
    </div>
  </section>
);

export default ComingSoon;
