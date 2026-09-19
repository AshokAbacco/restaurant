// server/src/stores/stores.controller.js
import * as outletsService from "./stores.service.js";

// NOTE: reads req.tenant.organizationId here, not req.tenant.outletId —
// see the header comment in stores.service.js for why. This is deliberately
// the one module in the app where the meaningful scope is "everything my
// organization owns," not "my current outlet."

export const getAllStores = async (req, res) => {
  try {
    const outlets = await outletsService.getAllOutlets(req.tenant.organizationId);
    res.json(outlets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const outlet = await outletsService.getOutletById(req.params.id, req.tenant.organizationId);
    if (!outlet) return res.status(404).json({ error: "Outlet not found" });
    res.json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/stores/usage
// How many branches the plan allows vs how many are live. The Branches page
// reads this to show "2 of 3 used" and to hide the Add Branch button once
// the plan is full. Registered BEFORE /:id in stores.routes.js — otherwise
// Express matches "usage" as an outlet id and this never runs.
export const getBranchUsage = async (req, res) => {
  try {
    const usage = await outletsService.getBranchUsage(req.tenant.organizationId);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Outlet name is required" });
    }
    const result = await outletsService.createOutlet(req.body, req.tenant.organizationId);

    // Plan limit reached. 403 rather than 400: the request is perfectly
    // well-formed, it's the plan that doesn't permit it. `usage` goes back
    // with it so the UI can update its counter from the same response
    // instead of firing a second request to find out why it was refused.
    if (result.limitReached) {
      return res.status(403).json({
        error: `Your plan includes ${result.usage.limit} branch${
          result.usage.limit === 1 ? "" : "es"
        }, and you're already using ${result.usage.used}. Upgrade your plan to add another branch.`,
        code: "BRANCH_LIMIT_REACHED",
        usage: result.usage,
      });
    }

    res.status(201).json(result.outlet);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An outlet with this name already exists in your organization" });
    }
    res.status(400).json({ error: err.message });
  }
};

export const updateStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Outlet name is required" });
    }
    const updated = await outletsService.updateOutlet(req.params.id, req.body, req.tenant.organizationId);
    if (!updated) return res.status(404).json({ error: "Outlet not found" });

    // Restoring a deactivated branch would put the organization over its
    // plan limit — same refusal as createStore, since it's the same act.
    if (updated.limitReached) {
      return res.status(403).json({
        error: `Your plan includes ${updated.usage.limit} branch${
          updated.usage.limit === 1 ? "" : "es"
        }, and you're already using ${updated.usage.used}. Deactivate another branch first, or upgrade your plan.`,
        code: "BRANCH_LIMIT_REACHED",
        usage: updated.usage,
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const result = await outletsService.deleteOutlet(req.params.id, req.tenant.organizationId);
    if (!result) return res.status(404).json({ error: "Outlet not found" });
    res.json({ message: "Outlet deactivated", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};