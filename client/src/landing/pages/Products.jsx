// ==============================================
// src/landing/pages/Products.jsx
// ==============================================
//
// Public product catalogue: scanners, printers, cash drawers and POS
// terminals.
//
// Layout, top to bottom:
//   1. Hero, with a receipt-style index. Every line on the receipt is a
//      category shortcut that filters the catalogue.
//   2. A sticky filter bar (category chips + search).
//   3. The catalogue, grouped by category.
//   4. A help strip.
//   Opening a product shows a detail dialog: gallery, features and the
//   full spec table, with Call and WhatsApp always in view.
//
// All data, copy, images and the enquiry number live in
// ../products.config.js (images are registered in ../products.images.js).
// There are no prices on this page, on purpose.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiArchive,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiMaximize,
  FiMonitor,
  FiPhone,
  FiPrinter,
  FiSearch,
  FiSmartphone,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { BRAND } from "../landing.config";
import {
  PRODUCTS,
  PRODUCT_CATEGORIES,
  PRODUCT_CONTACT,
  PRODUCTS_PAGE,
  callLink,
  categoryLabel,
  whatsappLink,
} from "../products.config";

// ==============================================
// SHARED BITS
// ==============================================

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FA34D]";

const CATEGORY_ICONS = {
  scanners: FiMaximize,
  printers: FiPrinter,
  "mobile-printers": FiSmartphone,
  drawers: FiArchive,
  pos: FiMonitor,
};

// "mj 2818" should find "MJ 2818D" and "MJ2818", so compare without
// spaces and hyphens.
const normalise = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "");

const scrollToCatalogue = () => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById("catalogue")
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

const WhatsAppButton = ({ href, children, className = "" }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#3FA34D] px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(63,163,77,0.95)] transition-transform duration-200 hover:-translate-y-px ${FOCUS} ${className}`}
  >
    <FaWhatsapp size={18} aria-hidden="true" />
    {children}
  </a>
);

const CallButton = ({ children, className = "" }) => (
  <a
    href={callLink}
    className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#171C17]/20 bg-white px-5 py-3 text-[14.5px] font-semibold text-[#171C17] transition-colors hover:border-[#171C17]/50 ${FOCUS} ${className}`}
  >
    <FiPhone size={16} aria-hidden="true" />
    {children}
  </a>
);

// Product photos usually sit on a white background. Multiplying the
// image into the cream panel makes that white disappear, so photos look
// cut out instead of boxed. Transparent PNGs and the sample images are
// unaffected.
const ProductImage = ({ src, alt, className = "" }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    draggable={false}
    className={`h-full w-full object-contain mix-blend-multiply ${className}`}
  />
);

// ==============================================
// HERO RECEIPT
// ==============================================
//
// The catalogue index, drawn as a till receipt. Each line filters the
// catalogue to that category and scrolls down to it.

const TEAR_EDGE = {
  height: 14,
  background:
    "linear-gradient(135deg, #fff 33.33%, transparent 33.33%) -7px 0, linear-gradient(225deg, #fff 33.33%, transparent 33.33%) -7px 0",
  backgroundSize: "14px 14px",
};

const BARCODE = {
  height: 38,
  backgroundImage:
    "repeating-linear-gradient(90deg, #171C17 0 2px, transparent 2px 4px, #171C17 4px 5px, transparent 5px 9px, #171C17 9px 12px, transparent 12px 14px)",
};

const Receipt = ({ counts, onPick }) => (
  <div className="mx-auto w-full max-w-[22rem] rotate-[1.2deg] drop-shadow-[0_28px_40px_rgba(23,28,23,0.16)] lg:mx-0 lg:ml-auto">
    <div className="bg-white px-6 pb-5 pt-7 font-mono text-[#171C17]">
      <p className="text-center text-[15px] font-bold">
        {PRODUCT_CONTACT.company}
      </p>
      <p className="mt-0.5 text-center text-[12.5px] text-[#6B7280]">
        POS hardware catalogue
      </p>

      <div className="my-4 border-t border-dashed border-[#171C17]/35" />

      <ul className="space-y-0.5">
        {PRODUCT_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.id] ?? FiGrid;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                className={`group -mx-2 flex w-[calc(100%+1rem)] items-baseline gap-2 rounded-md px-2 py-2 text-left text-[13.5px] transition-colors hover:bg-[#3FA34D]/10 ${FOCUS}`}
              >
                <Icon
                  size={14}
                  aria-hidden="true"
                  className="relative top-[2px] shrink-0 text-[#3FA34D]"
                />
                <span className="shrink-0">{c.label}</span>
                <span
                  aria-hidden="true"
                  className="min-w-4 flex-1 border-b border-dotted border-[#171C17]/35"
                />
                <span className="shrink-0 font-bold tabular-nums">
                  {counts[c.id]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="my-4 border-t border-dashed border-[#171C17]/35" />

      <button
        type="button"
        onClick={() => onPick("all")}
        className={`-mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between rounded-md px-2 py-1.5 text-[14px] font-bold transition-colors hover:bg-[#3FA34D]/10 ${FOCUS}`}
      >
        <span>All products</span>
        <span className="tabular-nums">{counts.all}</span>
      </button>

      <div aria-hidden="true" className="mt-5" style={BARCODE} />
      <p className="mt-2 text-center text-[12px] text-[#6B7280]">
        Tap a line to browse. Enquire for availability.
      </p>
    </div>
    <div aria-hidden="true" style={TEAR_EDGE} />
  </div>
);

// ==============================================
// PRODUCT CARD
// ==============================================

const ProductCard = ({ product, onOpen }) => (
  <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#e0e4d8] bg-white transition-[border-color,box-shadow] duration-200 hover:border-[#3FA34D]/60 hover:shadow-[0_18px_36px_-24px_rgba(23,28,23,0.35)]">
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View details of ${product.name}, ${product.model}`}
      className={`relative block aspect-[4/3] w-full overflow-hidden bg-[#F3F5EE] ${FOCUS}`}
    >
      <ProductImage
        src={product.images[0]}
        alt={`${product.name}, model ${product.model}`}
        className="transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-[#2f7d3b] backdrop-blur">
        {categoryLabel(product.category)}
      </span>
    </button>

    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md border border-[#171C17]/15 px-2 py-0.5 font-mono text-[12px] font-medium text-[#171C17]">
          {product.model}
        </span>
        <span className="text-[13px] text-[#6B7280]">{product.brand}</span>
      </div>

      <h3 className="lp-title mt-3 text-[18px] leading-snug text-[#171C17]">
        {product.name}
      </h3>
      <p className="mt-2 text-[14.5px] leading-[1.6] text-[#4b5563]">
        {product.tagline}
      </p>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {product.highlights.map((item) => (
          <li
            key={item}
            className="rounded-full bg-[#F3F5EE] px-2.5 py-1 text-[12px] font-medium text-[#4b5563]"
          >
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex gap-2 pt-5">
        <button
          type="button"
          onClick={onOpen}
          className={`flex-1 rounded-full border border-[#171C17]/20 bg-white px-4 py-2.5 text-[14px] font-semibold text-[#171C17] transition-colors hover:border-[#171C17]/50 ${FOCUS}`}
        >
          Read more
        </button>

        <a
          href={whatsappLink(product)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enquire about ${product.name} on WhatsApp`}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#3FA34D] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-px ${FOCUS}`}
        >
          <FaWhatsapp size={16} aria-hidden="true" />
          Enquire
        </a>
      </div>
    </div>
  </article>
);

// ==============================================
// DETAIL VIEW
// ==============================================
//
// Mounted with `key={product.id}`, so the gallery always starts on the
// first photo.

const ProductModal = ({ product, onClose }) => {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef(null);
  const total = product.images.length;

  const step = useCallback(
    (direction) => setIndex((i) => (i + direction + total) % total),
    [total],
  );

  // Lock the page behind the dialog; Escape closes, arrows flip photos.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };

    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, step]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#171C17]/60 backdrop-blur-[2px] md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes pdOpen {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: none; }
        }
        .pd-open { animation: pdOpen 0.22s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .pd-open { animation: none; }
        }
      `}</style>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-title"
        tabIndex={-1}
        className="pd-open relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white outline-none md:max-h-[90vh] md:max-w-5xl md:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-[#e0e4d8] bg-white text-[#171C17] ${FOCUS}`}
        >
          <FiX size={18} />
        </button>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-8 p-5 pt-16 md:grid-cols-[1.05fr_1fr] md:gap-10 md:p-8 md:pt-8">
            {/* ==========================================
                GALLERY
            ========================================== */}

            <div className="min-w-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#F3F5EE]">
                <ProductImage
                  src={product.images[index]}
                  alt={`${product.name}, photo ${index + 1} of ${total}`}
                />

                {total > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label="Previous photo"
                      className={`absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#171C17] shadow-sm ${FOCUS}`}
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label="Next photo"
                      className={`absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#171C17] shadow-sm ${FOCUS}`}
                    >
                      <FiChevronRight size={20} />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#171C17]/75 px-2.5 py-1 text-[12px] font-medium text-white">
                      {index + 1} of {total}
                    </span>
                  </>
                )}
              </div>

              {total > 1 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((src, i) => (
                    <li key={i} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={`Show photo ${i + 1}`}
                        aria-current={i === index}
                        className={`block h-16 w-20 overflow-hidden rounded-lg border-2 bg-[#F3F5EE] ${FOCUS} ${
                          i === index
                            ? "border-[#3FA34D]"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <ProductImage src={src} alt="" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ==========================================
                DETAILS
            ========================================== */}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="rounded-full bg-[#3FA34D]/12 px-2.5 py-1 font-medium text-[#2f7d3b]">
                  {categoryLabel(product.category)}
                </span>
                <span className="text-[#6B7280]">{product.brand}</span>
              </div>

              <h2
                id="pd-title"
                className="lp-display mt-3 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight text-[#171C17]"
              >
                {product.name}
              </h2>
              <p className="mt-2 inline-block rounded-md border border-[#171C17]/15 px-2 py-0.5 font-mono text-[13px] font-medium text-[#171C17]">
                {product.model}
              </p>

              <p className="mt-4 max-w-[34rem] text-[15.5px] leading-[1.7] text-[#4b5563]">
                {product.summary}
              </p>

              <h3 className="lp-title mt-7 text-[16px] text-[#171C17]">
                What it does
              </h3>
              <ul className="mt-3 space-y-2">
                {product.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-[#4b5563]"
                  >
                    <FiCheck
                      size={16}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[#3FA34D]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ==========================================
              FULL SPECIFICATIONS
          ========================================== */}

          <div className="border-t border-[#e0e4d8] bg-[#F3F5EE]/60 px-5 py-7 md:px-8">
            <h3 className="lp-title text-[18px] text-[#171C17]">
              Specifications
            </h3>

            <dl className="mt-4 overflow-hidden rounded-2xl border border-[#e0e4d8] bg-white">
              {product.specs.map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-[#e0e4d8] px-4 py-3 last:border-b-0 even:bg-[#F3F5EE]/50 sm:grid-cols-[13rem_1fr] sm:gap-6"
                >
                  <dt className="text-[14px] font-medium text-[#171C17]">
                    {label}
                  </dt>
                  <dd className="text-[14px] leading-[1.55] text-[#4b5563]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ==========================================
            ENQUIRY BAR — always in view
        ========================================== */}

        <div className="flex flex-col gap-2.5 border-t border-[#e0e4d8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p className="hidden text-[14px] text-[#6B7280] md:block">
            Ask us about {product.model}. We'll reply with availability and
            details.
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <CallButton>Call {PRODUCT_CONTACT.phoneDisplay}</CallButton>
            <WhatsAppButton href={whatsappLink(product)}>
              Enquire on WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// PAGE
// ==============================================

const Products = () => {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const openerRef = useRef(null);

  useEffect(() => {
    document.title = `Products — ${BRAND.name}`;
  }, []);

  const counts = useMemo(() => {
    const result = { all: PRODUCTS.length };
    PRODUCT_CATEGORIES.forEach((c) => {
      result[c.id] = PRODUCTS.filter((p) => p.category === c.id).length;
    });
    return result;
  }, []);

  const visible = useMemo(() => {
    const needle = normalise(query);

    return PRODUCTS.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (!needle) return true;

      return normalise(
        `${product.name} ${product.model} ${product.brand} ${product.tagline}`,
      ).includes(needle);
    });
  }, [category, query]);

  // The catalogue reads as sections: one heading per category that still
  // has products after filtering.
  const groups = useMemo(
    () =>
      PRODUCT_CATEGORIES.map((c) => ({
        ...c,
        items: visible.filter((p) => p.category === c.id),
      })).filter((g) => g.items.length > 0),
    [visible],
  );

  const open = (product) => {
    openerRef.current = document.activeElement;
    setSelected(product);
  };

  // Hand focus back to the card that opened the dialog.
  const close = useCallback(() => {
    setSelected(null);
    openerRef.current?.focus?.();
  }, []);

  const pickFromReceipt = (id) => {
    setCategory(id);
    setQuery("");
    // Wait a frame so the grid has re-rendered before scrolling to it.
    requestAnimationFrame(scrollToCatalogue);
  };

  const chips = [{ id: "all", label: "All products" }, ...PRODUCT_CATEGORIES];

  return (
    <>
      {/* ==========================================
          HERO
      ========================================== */}

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(23,28,23,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, #000 40%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, #000 40%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-[#3FA34D]/15 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pb-20 lg:pt-16">
          <div>
            <h1 className="lp-display max-w-[40rem] text-[clamp(2.2rem,5.5vw,3.8rem)] leading-[1.05] text-[#171C17]">
              {PRODUCTS_PAGE.title}
            </h1>
            <p className="mt-5 max-w-[36rem] text-[16.5px] leading-[1.7] text-[#4b5563]">
              {PRODUCTS_PAGE.intro}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WhatsAppButton href={whatsappLink(null)}>
                Chat on WhatsApp
              </WhatsAppButton>
              <CallButton>Call {PRODUCT_CONTACT.phoneDisplay}</CallButton>
            </div>

            <ul className="mt-8 flex flex-col gap-2 text-[14.5px] text-[#4b5563] sm:flex-row sm:flex-wrap sm:gap-x-6">
              {[
                "Full specs for every product",
                "Availability on request",
                "Advice on matching your setup",
              ].map((text) => (
                <li key={text} className="flex items-center gap-2">
                  <FiCheck
                    size={16}
                    aria-hidden="true"
                    className="text-[#3FA34D]"
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <Receipt counts={counts} onPick={pickFromReceipt} />
        </div>
      </section>

      {/* ==========================================
          FILTERS — stick under the navbar
      ========================================== */}

      <div className="sticky top-[72px] z-40 border-y border-[#e0e4d8] bg-[#F3F5EE]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-5 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Filter by category"
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:pb-0"
          >
            {chips.map((chip) => {
              const active = category === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategory(chip.id)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[14px] font-medium transition-colors ${FOCUS} ${
                    active
                      ? "border-[#171C17] bg-[#171C17] text-[#F3F5EE]"
                      : "border-[#171C17]/15 bg-white text-[#171C17] hover:border-[#171C17]/40"
                  }`}
                >
                  {chip.label}
                  <span
                    className={`ml-1.5 text-[12.5px] ${
                      active ? "text-[#9CA8A0]" : "text-[#6B7280]"
                    }`}
                  >
                    {counts[chip.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block w-full lg:w-72 lg:shrink-0">
            <span className="sr-only">Search products</span>
            <FiSearch
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={PRODUCTS_PAGE.searchPlaceholder}
              className={`w-full rounded-full border border-[#171C17]/15 bg-white py-2.5 pl-10 pr-4 text-[14.5px] text-[#171C17] placeholder:text-[#6B7280] ${FOCUS}`}
            />
          </label>
        </div>
      </div>

      {/* ==========================================
          CATALOGUE
      ========================================== */}

      <section
        id="catalogue"
        className="mx-auto w-full max-w-[1240px] scroll-mt-40 px-5 pb-20 pt-8 sm:px-8"
      >
        <p aria-live="polite" className="text-[14px] text-[#6B7280]">
          Showing {visible.length}{" "}
          {visible.length === 1 ? "product" : "products"}
        </p>

        {groups.length > 0 ? (
          <div className="mt-6 space-y-14">
            {groups.map((group) => {
              const Icon = CATEGORY_ICONS[group.id] ?? FiGrid;
              return (
                <div key={group.id}>
                  <div className="flex items-end justify-between gap-4 border-b border-[#171C17]/12 pb-4">
                    <div className="flex items-start gap-3.5">
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3FA34D]/12 text-[#2f7d3b]"
                      >
                        <Icon size={20} />
                      </span>
                      <div>
                        <h2 className="lp-title text-[22px] leading-tight text-[#171C17]">
                          {group.label}
                        </h2>
                        {group.blurb && (
                          <p className="mt-1 max-w-[34rem] text-[14.5px] text-[#6B7280]">
                            {group.blurb}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[14px] text-[#6B7280]">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "model" : "models"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpen={() => open(product)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 max-w-[34rem] rounded-2xl border border-[#e0e4d8] bg-white p-7">
            <p className="text-[15.5px] leading-[1.65] text-[#4b5563]">
              {PRODUCTS_PAGE.empty}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className={`rounded-full border border-[#171C17]/20 bg-white px-5 py-3 text-[14.5px] font-semibold text-[#171C17] ${FOCUS}`}
              >
                Clear search
              </button>
              <WhatsAppButton href={whatsappLink(null)}>
                Ask on WhatsApp
              </WhatsAppButton>
            </div>
          </div>
        )}

        {/* ==========================================
            HELP STRIP
        ========================================== */}

        <div className="relative mt-20 overflow-hidden rounded-3xl bg-[#171C17] p-7 text-[#F3F5EE] sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#3FA34D]/25 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[34rem]">
              <h2 className="lp-display text-[clamp(1.5rem,3vw,2rem)] leading-tight">
                {PRODUCTS_PAGE.helpTitle}
              </h2>
              <p className="mt-3 text-[15.5px] leading-[1.7] text-[#9CA8A0]">
                {PRODUCTS_PAGE.helpBody}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <WhatsAppButton href={whatsappLink(null)}>
                Chat on WhatsApp
              </WhatsAppButton>
              <a
                href={callLink}
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[14.5px] font-semibold text-[#F3F5EE] transition-colors hover:border-white/60 ${FOCUS}`}
              >
                <FiPhone size={16} aria-hidden="true" />
                Call {PRODUCT_CONTACT.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <ProductModal key={selected.id} product={selected} onClose={close} />
      )}
    </>
  );
};

export default Products;
