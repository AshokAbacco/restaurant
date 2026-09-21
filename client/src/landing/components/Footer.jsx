// ==============================================
// src/landing/components/Footer.jsx
// ==============================================
//

import { Link } from "react-router-dom";

import Wordmark from "./Wordmark";

// public/images/small-img.png  ->  /images/small-img.png
const BG_IMAGE = "/images/small-img.png";

// ------------------------------------------------
// Content (manual data)
// ------------------------------------------------

const BRAND = {
  name: "Abacco Technolog",
  email: "info@abaccotech.com",
  phone: "+91 80 4718 2200",
  address: "Vidyaranyapura, Bengaluru, Karnataka 560097",
};

// Update the `to` paths to match your router.
const FOOTER_COLUMNS = [
  {
    heading: "Company",
    links: [
      { label: "Home", to: "/" },
      { label: "Pricing", to: "/pricing" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create an account", to: "/pricing" },
      { label: "Help centre", to: "/help" },
    ],
  },
];

const FOOTER_LEGAL = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

// ------------------------------------------------
// Component
// ------------------------------------------------

const Footer = () => (
  <footer className="relative isolate overflow-hidden bg-[#171C17] text-[#9CA8A0]">
    {/* ==========================================
        GROUND
    ========================================== */}

    {/* The photograph. Desaturated and held far back — it is a surface,
        not a subject, and it never competes with the links. */}
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-30 bg-cover bg-center bg-no-repeat opacity-[0.22] [filter:grayscale(0.35)]"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    />

    {/* The scrim: dark at the bottom where the legal line sits, slightly
        open at the top so the image is still perceptible. */}
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-20"
    />

    {/* One warm spot of green behind the wordmark, so the eye lands on
        the brand first and the rest of the block reads as a footer. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-24 -top-28 -z-10 h-80 w-80 rounded-full bg-[#3FA34D] opacity-[0.16] blur-[110px]"
    />

    {/* A single lit edge along the top, replacing the usual flat rule. */}
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-px  "
    />

    <div className="relative mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        {/* ==========================================
            BRAND
        ========================================== */}

        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <Wordmark tone="light" />

          <p className="mt-5 max-w-[24rem] text-[14.5px] leading-[1.65]">
            One system for the floor, the kitchen, the counter and the
            back office. Built for independent restaurants and small
            chains in India.
          </p>
        </div>

        {/* ==========================================
            LINK COLUMNS
        ========================================== */}

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="text-[13px] font-semibold text-[#F3F5EE]">
              {column.heading}
            </h2>

            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[14px] transition-colors hover:text-[#F3F5EE]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* ==========================================
            CONTACT US — sits beside Support
        ========================================== */}

        <div className="col-span-2 sm:col-span-1">
          <h2 className="text-[13px] font-semibold text-[#F3F5EE]">
            Contact us
          </h2>

          <address className="mt-4 space-y-2.5 text-[14px] not-italic">
            <a
              href={`mailto:${BRAND.email}`}
              className="block break-words transition-colors hover:text-[#F3F5EE]"
            >
              {BRAND.email}
            </a>

            <a
              href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
              className="lp-nums block transition-colors hover:text-[#F3F5EE]"
            >
              {BRAND.phone}
            </a>

            <span className="block">{BRAND.address}</span>
          </address>
        </div>
      </div>

      {/* ==========================================
          BOTTOM BAR
      ========================================== */}

      <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="lp-nums text-[13px]">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>

        <ul className="flex gap-6">
          {FOOTER_LEGAL.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className="text-[13px] transition-colors hover:text-[#F3F5EE]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;