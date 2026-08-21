// server/src/employees/leaves/leaves.controller.js
import * as leavesService from "./leaves.service.js";

export async function getLeaves(req, res) {
  try {
    res.json(await leavesService.listLeaves(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leave requests", error: err.message });
  }
}

export async function createLeave(req, res) {
  try {
    res.status(201).json(await leavesService.createLeaveRequest(req.body, req.tenant.outletId));
  } catch (err) {
    res.status(400).json({ message: "Failed to create leave request", error: err.message });
  }
}

export async function approveLeave(req, res) {
  try {
    // FIX: was req.body.approvedById — same always-unsent-by-the-frontend
    // gap fixed elsewhere; the approver is whoever is actually logged in.
    res.json(
      await leavesService.decideLeaveRequest(
        req.params.id,
        { status: "APPROVED", approvedById: req.user?.employeeId },
        req.tenant.outletId,
      ),
    );
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: "Failed to approve leave request", error: err.message });
  }
}

export async function rejectLeave(req, res) {
  try {
    res.json(
      await leavesService.decideLeaveRequest(
        req.params.id,
        { status: "REJECTED", approvedById: req.user?.employeeId },
        req.tenant.outletId,
      ),
    );
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: "Failed to reject leave request", error: err.message });
  }
}