// server/src/crm/crm.routes.js
//
// Mounted at /api/crm in index.js behind requireAuth + requireOutletContext
// + requireRole(OWNER, ADMIN, MANAGER, CASHIER, WAITER) — the same roles
// that can take orders on the POS, since staff need to find and add
// customers while ordering. Destructive or outlet-wide configuration
// actions are narrowed to managers below.
import { Router } from "express";
import { requireRole } from "../auth/auth.middleware.js";
import { requireCrmEnabled } from "./crm.middleware.js";
import * as c from "./crm.controller.js";
import * as l from "./loyalty.controller.js";

const router = Router();
const managers = requireRole("OWNER", "ADMIN", "MANAGER");

// Readable even when CRM is off — this is how the POS finds out.
router.get("/config", c.getConfig);

router.use(requireCrmEnabled);

router.get("/overview", c.getOverview);

// Customers — static paths before /:id
router.get("/customers", c.listCustomers);
router.get("/customers/search", c.searchCustomers);
router.get("/customers/lookup", c.lookupCustomer);
router.post("/customers", c.createCustomer);
router.get("/customers/:id", c.getCustomer);
router.put("/customers/:id", c.updateCustomer);
router.delete("/customers/:id", managers, c.deleteCustomer);
router.get("/customers/:id/orders", c.listCustomerOrders);
router.get("/customers/:id/timeline", c.getTimeline);

router.get("/customers/:id/notes", c.listNotes);
router.post("/customers/:id/notes", c.addNote);
router.patch("/customers/:id/notes/:noteId", c.updateNote);
router.delete("/customers/:id/notes/:noteId", managers, c.deleteNote);

router.get("/customers/:id/communications", c.listCommunications);
router.post("/customers/:id/communications", c.addCommunication);

router.get("/customers/:id/feedback", c.listCustomerFeedback);
router.post("/customers/:id/feedback", c.addFeedback);
router.get("/feedback", c.listFeedback);
router.patch("/feedback/:feedbackId", c.updateFeedback);

router.get("/customers/:id/reminders", c.listCustomerReminders);
router.post("/customers/:id/reminders", c.addReminder);
router.get("/reminders", c.listReminders);
router.patch("/reminders/:reminderId", c.updateReminder);

// Customer groups / tags
router.get("/tags", c.listTags);
router.post("/tags", managers, c.createTag);
router.put("/tags/:tagId", managers, c.updateTag);
router.delete("/tags/:tagId", managers, c.deleteTag);

// Loyalty (Settings -> Loyalty). The service answers 403 when it's off.
router.get("/loyalty/overview", l.overview);
router.get("/loyalty/transactions", l.transactions);
router.get("/loyalty/vouchers", l.listVouchers);
router.patch("/loyalty/vouchers/:voucherId/cancel", managers, l.cancelVoucher);
router.get("/loyalty/campaigns", l.listCampaigns);
router.post("/loyalty/campaigns", managers, l.createCampaign);
router.put("/loyalty/campaigns/:campaignId", managers, l.updateCampaign);
router.delete("/loyalty/campaigns/:campaignId", managers, l.deleteCampaign);
router.get("/loyalty/coupons", l.listCoupons);
router.post("/loyalty/coupons", managers, l.createCoupon);
router.put("/loyalty/coupons/:couponId", managers, l.updateCoupon);
router.get("/customers/:id/loyalty", l.customerLoyalty);
router.post("/customers/:id/loyalty/adjust", managers, l.adjust);
router.post("/customers/:id/vouchers", l.createVoucher);

// Attach / detach a customer on an existing POS order
router.patch("/orders/:orderId/customer", c.linkOrderCustomer);

export default router;