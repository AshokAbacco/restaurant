// ==============================================
// src/landing/landing.config.js
// ==============================================
//
// Every word and image on the public site lives here, so marketing copy
// can be changed without opening a component. The sections read from this
// file only — none of them hardcode a headline.
//
// Rename the product in ONE place: BRAND.name below.

// ==============================================
// IMAGES
// ==============================================
//
// Imported rather than referenced by string path so Vite fingerprints and
// compresses them at build time. These are the same dishes the kiosk uses,
// re-exported here at web sizes: the marketing site and the product show
// the same food on purpose.

// Story-section photographs. Rectangular, with their own backgrounds —
// they fill a frame, so they want the setting in shot.
import fire from "./images/image-2.jpg";
import served from "./images/image-3.jpg";
import plated from "./images/image-5.jpg";

// Hero carousel. Cut-outs with transparent backgrounds, because these
// stand on the cream disc rather than filling a frame.
import dishFriedrice from "./images/dish-friedrice.png";
import dishPasta from "./images/dish-pasta.png";
import dishNicoise from "./images/dish-nicoise.png";
import dishCaprese from "./images/dish-caprese.png";

// Orbit pool. More cut-outs than there are places on the ring, which is
// what lets the chips change as well as travel.
import curry from "./images/curry.png";
import salad from "./images/salad.png";
import friedrice from "./images/friedrice.png";
import sushi from "./images/sushi.png";
import steak from "./images/steak.png";
import stirfry from "./images/stirfry.png";
import burger from "./images/burger.png";
import ramen from "./images/ramen.png";
import pasta from "./images/pasta.png";
import tenders from "./images/tenders.png";
import croissant from "./images/croissant.png";
import cake from "./images/cake.png";

// ==============================================
// BRAND
// ==============================================

export const BRAND = {
  name: "Abacco",
  tag: "Restaurant ERP",
  email: "info@abaccotech.com",
  phone: "+91 80 4718 2200",
  address: "Vidyaranyapura, Bengaluru, Karnataka 560097",
};

export const HERO = {
  headline: ["Run the whole floor", "from one screen."],
  // Where the reference puts $24.00 in red. A trial length is the
  // closest honest equivalent — it's the number an owner is actually
  // weighing at this point on the page.
  figure: "Free for 14 days",
  intro:
    "Orders, kitchen tickets, tables, billing and stock in a single system built for Indian restaurants. It keeps taking orders when the internet drops.",
  primaryCta: { label: "Start free trial", to: "/register" },
  secondaryCta: { label: "Sign in", to: "/login" },
  corner: ["Works offline.", "Syncs when you're back."],

  // ==========================================
  // CAROUSEL
  // ==========================================
  //
  // Four dishes on a loop. There are no controls — the reference just
  // runs, and a hero that waits to be clicked is a hero most visitors
  // never see past the first slide. The headline and buttons hold still
  // between slides because they're the product's claim, not the dish's
  // name; what moves is the bowl and the ticket beside it.

  // Each ticket lists what's in the bowl beside it. Cheap to get right,
  // and a visitor who notices the mismatch has just been told the
  // screenshots are staged.

  slides: [
    {
      id: "dinein",
      photo: { src: dishFriedrice, alt: "Bowl of vegetable fried rice" },
      ticket: {
        table: "Table 12",
        covers: "4 covers",
        items: [
          { qty: 2, name: "Veg fried rice" },
          { qty: 1, name: "Chilli paneer" },
          { qty: 4, name: "Butter naan" },
        ],
        timer: "2:14",
        state: "Fired to kitchen",
      },
    },
    {
      id: "kitchen",
      photo: { src: dishPasta, alt: "Bowl of penne in tomato sauce" },
      ticket: {
        table: "Table 07",
        covers: "2 covers",
        items: [
          { qty: 1, name: "Penne arrabbiata" },
          { qty: 2, name: "Garlic bread" },
        ],
        timer: "0:38",
        state: "Ready to pick up",
      },
    },
    {
      id: "counter",
      photo: { src: dishNicoise, alt: "Plate of salad niçoise" },
      ticket: {
        table: "Counter 1",
        covers: "Takeaway",
        items: [
          { qty: 1, name: "Niçoise salad" },
          { qty: 2, name: "Iced lemon tea" },
        ],
        timer: "₹640",
        state: "Settled on UPI",
      },
    },
    {
      id: "reserved",
      photo: { src: dishCaprese, alt: "Caprese salad on a round plate" },
      ticket: {
        table: "Table 19",
        covers: "6 covers",
        items: [
          { qty: 2, name: "Caprese salad" },
          { qty: 1, name: "Bruschetta" },
        ],
        timer: "8:30 pm",
        state: "Reserved tonight",
      },
    },
  ],

  // ==========================================
  // ORBIT
  // ==========================================
  //
  // The small round dishes on the dashed arc.
  //
  // The ring holds six at a time — enough to read as a ring without
  // crowding it, and roughly what the reference shows on the visible
  // part of the curve. This list is longer than six on purpose: the
  // chips cycle through it as they travel, so the arc keeps turning up
  // dishes you haven't seen rather than looping the same six forever.
  //
  // ORBIT_SLOTS in Hero.jsx decides how many are on the ring. Keep this
  // list comfortably longer than that number.

  orbit: [
    { src: curry, alt: "Curry" },
    { src: salad, alt: "Garden salad" },
    { src: friedrice, alt: "Fried rice" },
    { src: sushi, alt: "Sushi" },
    { src: steak, alt: "Steak" },
    { src: stirfry, alt: "Stir fry" },
    { src: burger, alt: "Burger" },
    { src: ramen, alt: "Ramen" },
    { src: pasta, alt: "Pasta" },
    { src: tenders, alt: "Chicken tenders" },
    { src: croissant, alt: "Croissant" },
    { src: cake, alt: "Cake" },
  ],
};

// ==============================================
// LIVE RAIL
// ==============================================
//
// A thin ticker under the hero. Shows the product's world — what the
// system is doing on an ordinary Friday — instead of vanity statistics.

export const RAIL_EVENTS = [
  "Table 12 · KOT 2 fired",
  "Counter 1 · ₹1,840 settled on UPI",
  "Kitchen · Butter naan ×4 ready",
  "Table 07 · bill split three ways",
  "Stock · paneer down to 2.4 kg",
  "Table 19 · reserved for 8:30 pm",
  "Kiosk · self-order placed, ₹620",
  "Shift · Ravi clocked in",
];

// ==============================================
// SERVICE STORY
// ==============================================
//
// Three steps, pinned image, advanced by scroll. Numbered because this
// genuinely is a sequence — an order can't be settled before it's fired.

export const STORY = {
  title: "One order, start to settled",
  intro:
    "The same ticket moves through every screen. Nobody retypes it, and nobody walks it to the kitchen.",
  steps: [
    {
      id: "taken",
      index: "01",
      title: "The order is taken",
      body: "A waiter takes it on a tablet at the table, or a guest orders from the QR menu. Modifiers, portion sizes and kitchen notes are attached to the item, not shouted across the pass.",
      meta: "Point of sale · QR menu · Kiosk",
      image: { src: plated, alt: "Paneer butter masala served with naan" },
    },
    {
      id: "fired",
      index: "02",
      title: "The kitchen fires it",
      body: "The ticket appears on the kitchen display the moment it's sent, split by station. Each item is marked ready as it leaves the pass, so the floor knows what to pick up without asking.",
      meta: "Kitchen display · Station routing",
      image: { src: fire, alt: "A dish being finished on the pass" },
    },
    {
      id: "settled",
      index: "03",
      title: "The bill settles",
      body: "Split it by guest or by item, take UPI, card or cash, and the GST invoice prints on the printer already at your counter. Stock and the day's numbers update as it closes.",
      meta: "Billing · UPI & card · GST invoice",
      image: { src: served, alt: "A finished plate leaving the kitchen" },
    },
  ],
};

// ==============================================
// FEATURE SECTIONS
// ==============================================

export const MENU_SECTION = {
  eyebrow: "Menu and ordering",
  title: "Change a price once, everywhere",
  body: "Your menu lives in one place. Edit an item and the change reaches the waiter's tablet, the kiosk and the QR menu before the next order is taken — no second menu to keep in sync.",
  points: [
    {
      title: "Items, variants and add-ons",
      body: "Half and full, spice levels, extra cheese. Priced individually and carried through to the kitchen ticket.",
    },
    {
      title: "Sold out in one tap",
      body: "Mark an item unavailable and it disappears from every ordering screen instantly, including guests' phones.",
    },
    {
      title: "Menus that follow the clock",
      body: "Breakfast until 11, bar menu after 6. Set the window once and the right menu shows itself.",
    },
  ],
  // A miniature of the ordering screen, drawn in markup rather than
  // screenshotted — it stays sharp on any display and never goes stale.
  ticket: {
    heading: "Table 12 · Order",
    lines: [
      {
        qty: 2,
        name: "Paneer butter masala",
        note: "Less spicy",
        price: "₹640",
      },
      { qty: 4, name: "Butter naan", note: null, price: "₹280" },
      { qty: 1, name: "Jeera rice", note: "Pack separately", price: "₹180" },
    ],
    total: "₹1,100",
  },
};

export const TABLES_SECTION = {
  eyebrow: "Tables and reservations",
  title: "See the floor without walking it",
  body: "Every table on one plan, colour-coded by what it's doing. Assign a waiter, move a party, merge two tops for a group of six — all from the counter.",
  points: [
    {
      title: "Live floor plan",
      body: "Free, seated, ordered, bill printed. The colour changes the moment the state does.",
    },
    {
      title: "Reservations on the same plan",
      body: "Tonight's bookings sit on the tables they're held for, so nobody seats a walk-in on a reserved four-top.",
    },
    {
      title: "Waiter sections",
      body: "Assign tables to staff and each waiter's tablet shows only their own.",
    },
  ],
  // Floor-plan miniature. `state` drives the swatch colour.
  floor: [
    { label: "T1", state: "free", seats: 2 },
    { label: "T2", state: "seated", seats: 4 },
    { label: "T3", state: "ordered", seats: 4 },
    { label: "T4", state: "free", seats: 2 },
    { label: "T5", state: "billed", seats: 6 },
    { label: "T6", state: "seated", seats: 2 },
    { label: "T7", state: "ordered", seats: 4 },
    { label: "T8", state: "reserved", seats: 8 },
    { label: "T9", state: "free", seats: 4 },
    { label: "T10", state: "seated", seats: 4 },
    { label: "T11", state: "free", seats: 2 },
    { label: "T12", state: "ordered", seats: 4 },
  ],
  legend: [
    { state: "free", label: "Free" },
    { state: "seated", label: "Seated" },
    { state: "ordered", label: "Ordered" },
    { state: "billed", label: "Bill printed" },
    { state: "reserved", label: "Reserved" },
  ],
};

// ==============================================
// MODULES
// ==============================================
//
// The rest of the system. These are the modules that actually ship —
// keeping this list honest is the point of putting it on the page.

export const MODULES = {
  title: "The rest of the restaurant",
  intro:
    "Everything a floor manager opens in a day, under one login and one set of numbers.",
  items: [
    {
      icon: "ticket",
      title: "Orders and kitchen",
      body: "Tickets that fire to the right station, with modifiers and notes attached. Each item is marked ready as it leaves the pass",
    },
    {
      icon: "printer",
      title: "Billing and GST",
      body: "Tax-compliant invoices, split bills, discounts and rounding, printed on the thermal printer you already have.",
    },
    {
      icon: "box",
      title: "Inventory",
      body: "Recipe-linked stock that draws down as dishes sell, with low-stock alerts before the paneer runs out mid-service.",
    },
    {
      icon: "users",
      title: "Staff and payroll",
      body: "Shifts, attendance, leave, incentives and salaries for the whole team, without a second spreadsheet.",
    },
    {
      icon: "trending",
      title: "Reports and P&L",
      body: "Counter summaries at close, item-level sales, and a profit and loss view that reads the same numbers.",
    },
    {
      icon: "monitor",
      title: "Self-order kiosk",
      body: "A guest-facing screen for queues at the counter. Orders land on the same kitchen display as everything else.",
    },
    {
      icon: "wallet",
      title: "Expenses",
      body: "Daily purchases, vendor payments and petty cash logged against the outlet they belong to.",
    },
    // {
    //   icon: "wifi",
    //   title: "Works offline",
    //   body: "Service doesn't stop when the connection does. Orders and bills queue on the device and sync when it's back.",
    // },
    {
      icon: "layers",
      title: "Multiple outlets",
      body: "Run several branches from one account, with menus and prices that can differ per outlet.",
    },
  ],
};

// ==============================================
// CLOSING CALL TO ACTION
// ==============================================

export const CTA = {
  title: "Put it on the counter tonight",
  body: "Set up your menu and tables in an afternoon. We'll import your existing item list and stay on a call through your first dinner service.",
  primary: { label: "Start free trial", to: "/register" },
  secondary: { label: "Talk to us", to: "/contact" },
};

// ==============================================
// FOOTER
// ==============================================

export const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Point of sale", to: "/services" },
      { label: "Kitchen display", to: "/services" },
      { label: "Tables", to: "/services" },
      { label: "Inventory", to: "/services" },
      { label: "Reports", to: "/services" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Pricing", to: "/pricing" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create an account", to: "/register" },
      { label: "Help centre", to: "/contact" },
    ],
  },
];

export const FOOTER_LEGAL = [
  { label: "Privacy", to: "/contact" },
  { label: "Terms", to: "/contact" },
];