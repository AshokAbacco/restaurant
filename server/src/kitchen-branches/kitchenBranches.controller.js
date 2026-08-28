// server/src/kitchen-branches/kitchenBranches.controller.js
import * as service from "./kitchenBranches.service.js";

// outletId comes from the verified access token (auth.middleware.js), never
// from the request body — same rule every other outlet-scoped route follows.
const outletOf = (req) => req.user.outletId;

export const list = async (req, res) => {
  try {
    const branches = await service.listKitchenBranches(outletOf(req), {
      includeInactive: req.query.includeInactive === "true",
    });
    res.json(branches);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const branch = await service.getKitchenBranchById(
      req.params.id,
      outletOf(req),
    );
    if (!branch) return res.status(404).json({ error: "Kitchen not found" });
    res.json(branch);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const branch = await service.createKitchenBranch(req.body, outletOf(req));
    res.status(201).json(branch);
  } catch (err) {
    // @@unique([outletId, name]) — two kitchens in one outlet can't share a
    // name, or the Send-to-Kitchen picker would show two identical options.
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "A kitchen with this name already exists at this branch" });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const branch = await service.updateKitchenBranch(
      req.params.id,
      req.body,
      outletOf(req),
    );
    if (!branch) return res.status(404).json({ error: "Kitchen not found" });
    res.json(branch);
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "A kitchen with this name already exists at this branch" });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const branch = await service.deactivateKitchenBranch(
      req.params.id,
      outletOf(req),
    );
    if (!branch) return res.status(404).json({ error: "Kitchen not found" });
    res.json({ success: true, message: "Kitchen deactivated" });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};