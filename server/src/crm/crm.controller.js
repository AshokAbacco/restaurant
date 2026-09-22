// server/src/crm/crm.controller.js
//
// Thin HTTP layer over crm.service.js. outletId always comes from
// req.tenant (set by requireOutletContext from the verified access token).
import * as crm from "./crm.service.js";

// Wraps a handler so every error becomes a consistent JSON response in the
// { message, error } shape the rest of this API (and posApi.js) expects.
const handle = (fn, fallbackMessage, successStatus = 200) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(successStatus).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error(`[crm] ${fallbackMessage}:`, err);
    res.status(status).json({
      message: fallbackMessage,
      error: status >= 500 ? "Something went wrong. Please try again." : err.message,
      ...(err.existingCustomer ? { existingCustomer: err.existingCustomer } : {}),
    });
  }
};

const outlet = (req) => req.tenant.outletId;

export const getConfig = handle((req) => crm.getConfig(outlet(req)), "Failed to load CRM settings");
export const getOverview = handle((req) => crm.getOverview(outlet(req)), "Failed to load CRM overview");

// Customers
export const listCustomers = handle((req) => crm.listCustomers(outlet(req), req.query), "Failed to load customers");
export const searchCustomers = handle((req) => crm.searchCustomers(outlet(req), req.query.q), "Failed to search customers");
export const lookupCustomer = handle(async (req) => ({ customer: await crm.lookupByMobile(outlet(req), req.query.mobile) }), "Failed to look up customer");
export const getCustomer = handle((req) => crm.getCustomerProfile(outlet(req), req.params.id), "Failed to load customer");
export const createCustomer = handle((req) => crm.createCustomer(outlet(req), req.body, req.user), "Failed to add customer", 201);
export const updateCustomer = handle((req) => crm.updateCustomer(outlet(req), req.params.id, req.body, req.user), "Failed to update customer");
export const deleteCustomer = handle((req) => crm.deleteCustomer(outlet(req), req.params.id), "Failed to delete customer");
export const listCustomerOrders = handle((req) => crm.listCustomerOrders(outlet(req), req.params.id, req.query), "Failed to load purchase history");
export const getTimeline = handle((req) => crm.getTimeline(outlet(req), req.params.id, req.query), "Failed to load customer history");

// POS order link
export const linkOrderCustomer = handle(
  (req) => crm.linkOrderCustomer(outlet(req), req.params.orderId, req.body?.customerId ?? null, req.user),
  "Failed to link customer to order",
);

// Tags / groups
export const listTags = handle((req) => crm.listTags(outlet(req)), "Failed to load groups");
export const createTag = handle((req) => crm.createTag(outlet(req), req.body), "Failed to create group", 201);
export const updateTag = handle((req) => crm.updateTag(outlet(req), req.params.tagId, req.body), "Failed to update group");
export const deleteTag = handle((req) => crm.deleteTag(outlet(req), req.params.tagId), "Failed to delete group");

// Notes
export const listNotes = handle((req) => crm.listNotes(outlet(req), req.params.id), "Failed to load notes");
export const addNote = handle((req) => crm.addNote(outlet(req), req.params.id, req.body, req.user), "Failed to add note", 201);
export const updateNote = handle((req) => crm.updateNote(outlet(req), req.params.id, req.params.noteId, req.body), "Failed to update note");
export const deleteNote = handle((req) => crm.deleteNote(outlet(req), req.params.id, req.params.noteId), "Failed to delete note");

// Communication history
export const listCommunications = handle((req) => crm.listCommunications(outlet(req), req.params.id), "Failed to load communication history");
export const addCommunication = handle((req) => crm.addCommunication(outlet(req), req.params.id, req.body, req.user), "Failed to log communication", 201);

// Feedback & complaints
export const listFeedback = handle((req) => crm.listFeedback(outlet(req), req.query), "Failed to load feedback");
export const listCustomerFeedback = handle((req) => crm.listFeedback(outlet(req), { ...req.query, customerId: req.params.id }), "Failed to load feedback");
export const addFeedback = handle((req) => crm.addFeedback(outlet(req), req.params.id, req.body, req.user), "Failed to save feedback", 201);
export const updateFeedback = handle((req) => crm.updateFeedback(outlet(req), req.params.feedbackId, req.body, req.user), "Failed to update feedback");

// Follow-up reminders
export const listReminders = handle((req) => crm.listReminders(outlet(req), req.query), "Failed to load reminders");
export const listCustomerReminders = handle((req) => crm.listReminders(outlet(req), { ...req.query, customerId: req.params.id }), "Failed to load reminders");
export const addReminder = handle((req) => crm.addReminder(outlet(req), req.params.id, req.body, req.user), "Failed to add reminder", 201);
export const updateReminder = handle((req) => crm.updateReminder(outlet(req), req.params.reminderId, req.body), "Failed to update reminder");