// server/src/employees/activity-logs/activityLogs.controller.js
import * as activityLogsService from "./activityLogs.service.js";

export async function getActivityLogs(req, res) {
  try {
    res.json(await activityLogsService.listActivityLogs(req.query, req.tenant.outletId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch activity logs", error: err.message });
  }
}

export async function createActivityLog(req, res) {
  try {
    const { employeeId, action } = req.body;
    const log = await activityLogsService.logActivity({
      employeeId,
      action,
      ipAddress: req.ip,
      device: req.headers["user-agent"],
    }, req.tenant.outletId);
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ message: "Failed to record activity log", error: err.message });
  }
}