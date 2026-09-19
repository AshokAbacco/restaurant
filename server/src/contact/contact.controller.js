// server/src/contact/contact.controller.js
// The shared client the rest of the app uses (pricing.service.js and
// friends import the same one), so this module doesn't open a second pool.
import prisma from "../../prisma/client.js";

import {
  sendContactConfirmation,
  sendContactNotification,
} from "./contact.mailer.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/;

const LIMITS = {
  restaurantName: 120,
  fullName: 120,
  email: 160,
  phone: 20,
  address: 300,
  message: 5000,
};

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates + normalises the payload. Returns { data } or { errors },
 * where errors is a { field: message } map the form can render inline.
 */
function validate(body) {
  const data = {
    restaurantName: clean(body.restaurantName),
    fullName: clean(body.fullName),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    address: clean(body.address),
    message: clean(body.message),
  };

  const errors = {};

  if (!data.restaurantName) errors.restaurantName = "Restaurant name is required.";
  if (!data.fullName) errors.fullName = "Full name is required.";

  if (!data.email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(data.email)) errors.email = "Enter a valid email address.";

  if (!data.phone) errors.phone = "Phone number is required.";
  else if (!PHONE_RE.test(data.phone)) errors.phone = "Enter a valid phone number.";

  if (!data.message) errors.message = "Message is required.";
  else if (data.message.length < 10)
    errors.message = "Please tell us a little more (at least 10 characters).";

  // Address is optional — see the note on ContactSubmission in schema.prisma.
  for (const [field, max] of Object.entries(LIMITS)) {
    if (data[field] && data[field].length > max) {
      errors[field] = `Please keep this under ${max} characters.`;
    }
  }

  if (Object.keys(errors).length) return { errors };

  return { data: { ...data, address: data.address || null } };
}

// ---- Crude per-IP throttle -------------------------------------------------
// In-memory and therefore per-process: fine for a single Node instance, swap
// for express-rate-limit (or a Redis store) if you scale horizontally.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // opportunistic cleanup so the map can't grow unbounded
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }

  return false;
}

// ==============================================
// POST /api/contact   (public)
// ==============================================
export async function submitContactForm(req, res, next) {
  try {
    const body = req.body || {};

    // Honeypot: real users never see this field, bots fill everything.
    // Respond like a success so the bot doesn't retry.
    if (clean(body.company)) {
      return res.status(201).json({ success: true, message: "Message received." });
    }

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (rateLimited(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many messages from this device. Please try again later.",
      });
    }

    const { data, errors } = validate(body);
    if (errors) {
      return res.status(400).json({
        success: false,
        message: "Please check the highlighted fields.",
        errors,
      });
    }

    const submission = await prisma.contactSubmission.create({ data });

    // Emails are best-effort: the enquiry is already safely in the database,
    // so an SMTP hiccup shouldn't show the visitor a failure. Both are sent
    // in parallel and any failure is logged for follow-up.
    const [confirmation, notification] = await Promise.allSettled([
      sendContactConfirmation(submission),
      sendContactNotification(submission),
    ]);

    if (confirmation.status === "rejected") {
      console.error(
        `[contact] confirmation email failed for ${submission.id}:`,
        confirmation.reason,
      );
    }
    if (notification.status === "rejected") {
      console.error(
        `[contact] notification email failed for ${submission.id}:`,
        notification.reason,
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Thanks — we've received your message and will get back to you within 24 hours.",
      data: { id: submission.id, createdAt: submission.createdAt },
    });
  } catch (err) {
    return next(err);
  }
}

// ==============================================
// GET /api/contact   (protected — see contact.routes.js)
// ==============================================
// Simple paginated list so the team can read submissions from an admin
// screen instead of the inbox. Drop this (and its route) if you don't need it.
export async function listContactSubmissions(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const search = clean(req.query.search);

    const where = search
      ? {
          OR: [
            { restaurantName: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      success: true,
      data: items,
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return next(err);
  }
}