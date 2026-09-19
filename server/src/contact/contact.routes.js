// server/src/contact/contact.routes.js
import { Router } from "express";

import {
  submitContactForm,
  listContactSubmissions,
} from "./contact.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Public — the marketing site's Contact page posts here. Like
// /api/pricing, no account exists at this point, so there's no
// requireAuth / requireOutletContext on this route.
router.post("/", submitContactForm);

// Internal reader. Deliberately no requireOutletContext: contact
// submissions are tenant-less (no outlet exists yet), so the outlet
// header check would reject the request. Remove this route if you're
// happy reading submissions from the inbox only.
router.get("/", requireAuth, requireRole("OWNER", "ADMIN"), listContactSubmissions);

export default router;