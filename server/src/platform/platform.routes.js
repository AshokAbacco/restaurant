// ==============================================
// server/src/platform/platform.routes.js
// Everything under /api/platform. Login is public; every other route needs
// a platform session (requirePlatformAuth) and the matching permission.
// ==============================================

import { Router } from "express";
import * as auth from "./platform.auth.js";
import * as dashboard from "./dashboard.controller.js";
import * as restaurants from "./restaurants.controller.js";
import * as renewals from "./renewals.controller.js";
import * as messages from "./messages.controller.js";
import * as followUps from "./followups.controller.js";
import * as plans from "./plans.controller.js";
import * as payments from "./payments.controller.js";
import * as activity from "./activity.controller.js";
import * as webhooks from "./webhooks.controller.js";
import * as enquiries from "./enquiries.controller.js";
import * as team from "./team.controller.js";
import * as settings from "./settings.controller.js";
import * as health from "./health.controller.js";
import * as reports from "./reports.controller.js";

const { can } = auth;
const router = Router();

// ---- auth ----
router.post("/auth/login", auth.loginLimiter, auth.login);
router.use(auth.requirePlatformAuth);
router.get("/auth/me", auth.me);
router.get("/badges", messages.badges);
router.patch("/auth/me", auth.updateMe);
router.post("/auth/change-password", auth.changePassword);

// ---- dashboard ----
router.get("/dashboard", can("dashboard.read"), dashboard.overview);

// ---- restaurants ----
router.get("/restaurants", can("restaurants.read"), restaurants.list);
router.get("/restaurants/options", restaurants.options);
router.get("/restaurants/export", can("restaurants.read"), restaurants.exportCsv);
router.get("/restaurants/:id", can("restaurants.read"), restaurants.detail);
router.get("/restaurants/:id/usage", can("restaurants.read", "activity.read"), restaurants.usage);
router.patch("/restaurants/:id", can("restaurants.write"), restaurants.update);
router.post("/restaurants/:id/suspend", can("restaurants.write"), restaurants.suspend);
router.post("/restaurants/:id/reactivate", can("restaurants.write"), restaurants.reactivate);
router.post("/restaurants/:id/users/:userId/toggle", can("restaurants.write"), restaurants.toggleUser);

// ---- renewals ----
router.get("/renewals", can("renewals.read"), renewals.list);
router.get("/renewals/quote", can("renewals.read"), renewals.quote);
router.get("/renewals/events", can("renewals.read"), renewals.events);
router.post("/renewals/:orgId/renew", can("renewals.write"), renewals.renew);
router.post("/renewals/:orgId/extend", can("renewals.write"), renewals.extend);
router.post("/renewals/:orgId/expiry", can("renewals.write"), renewals.setExpiry);
router.post("/renewals/:orgId/remind", can("renewals.write", "messages.write"), renewals.remind);

// ---- messages ----
router.get("/messages", can("messages.read"), messages.list);
router.get("/messages/unread-count", messages.unreadCount);
router.post("/messages", can("messages.write"), messages.create);
router.post("/messages/broadcast", can("messages.write"), messages.broadcast);
router.get("/messages/:id", can("messages.read"), messages.get);
router.post("/messages/:id/messages", can("messages.write"), messages.reply);
router.patch("/messages/:id", can("messages.write"), messages.update);

// ---- follow-ups ----
router.get("/follow-ups", can("followups.read"), followUps.list);
router.post("/follow-ups", can("followups.write"), followUps.create);
router.get("/follow-ups/:id", can("followups.read"), followUps.get);
router.patch("/follow-ups/:id", can("followups.write"), followUps.update);
router.post("/follow-ups/:id/complete", can("followups.write"), followUps.complete);
router.post("/follow-ups/:id/activities", can("followups.write"), followUps.logActivity);
router.post("/follow-ups/:id/message", can("followups.write"), followUps.sendMessage);
router.delete("/follow-ups/:id", can("followups.write"), followUps.remove);

// ---- plans ----
router.get("/plans", can("plans.read", "renewals.read"), plans.list);
router.post("/plans", can("plans.write"), plans.create);
router.get("/plans/:id", can("plans.read"), plans.get);
router.patch("/plans/:id", can("plans.write"), plans.update);
router.post("/plans/:id/active", can("plans.write"), plans.setActive);
router.post("/plans/:id/duplicate", can("plans.write"), plans.duplicate);
router.delete("/plans/:id", can("plans.write"), plans.remove);

// ---- payments ----
router.get("/payments", can("payments.read"), payments.list);
router.get("/payments/export", can("payments.read"), payments.exportCsv);
router.post("/payments", can("payments.write"), payments.record);
router.get("/payments/:id", can("payments.read"), payments.get);

// ---- activity ----
router.get("/activity/usage", can("activity.read"), activity.usage);
router.get("/activity/feed", can("activity.read"), activity.feed);

// ---- webhooks ----
router.get("/webhooks", can("webhooks.read"), webhooks.list);
router.get("/webhooks/:id", can("webhooks.read"), webhooks.get);

// ---- enquiries ----
router.get("/enquiries", can("enquiries.read"), enquiries.list);
router.get("/enquiries/export", can("enquiries.read"), enquiries.exportCsv);
router.get("/enquiries/:id", can("enquiries.read"), enquiries.get);
router.patch("/enquiries/:id", can("enquiries.write"), enquiries.update);
router.post("/enquiries/:id/reply", can("enquiries.write"), enquiries.reply);
router.post("/enquiries/:id/follow-up", can("enquiries.write"), enquiries.toFollowUp);
router.delete("/enquiries/:id", can("enquiries.write"), enquiries.remove);

// ---- team ----
router.get("/team/meta", team.meta);
router.get("/team/options", team.options);
router.get("/team", can("team.read"), team.list);
router.post("/team", can("team.write"), team.create);
router.patch("/team/:id", can("team.write"), team.update);
router.post("/team/:id/reset-password", can("team.write"), team.resetPassword);
router.delete("/team/:id", can("team.write"), team.remove);

// ---- settings ----
router.get("/settings", can("settings.read"), settings.get);
router.put("/settings/:section", can("settings.write"), settings.update);
router.post("/settings/run-automations", can("settings.write"), settings.runNow);

// ---- health ----
router.get("/health", can("health.read"), health.overview);
router.get("/health/ping", can("health.read"), health.ping);
router.get("/health/errors", can("health.read"), health.errors);
router.post("/health/errors/resolve-all", can("health.write"), health.resolveAll);
router.post("/health/errors/:id/resolve", can("health.write"), health.resolveError);

// ---- reports ----
router.get("/reports", can("reports.read"), reports.report);
router.get("/reports/export", can("reports.read"), reports.exportCsv);

export default router;
