// server/src/employees/attendance/attendance.controller.js
import * as attendanceService from "./attendance.service.js";

export async function checkIn(req, res) {
  try {
    const { employeeId } = req.body;
    const attendance = await attendanceService.checkIn(employeeId, {
      ipAddress: req.ip,
      device: req.headers["user-agent"],
    }, req.tenant.outletId);
    res.status(201).json(attendance);
  } catch (err) {
    res.status(400).json({ message: "Check-in failed", error: err.message });
  }
}

export async function checkOut(req, res) {
  try {
    const { employeeId } = req.body;
    const attendance = await attendanceService.checkOut(employeeId, {
      ipAddress: req.ip,
      device: req.headers["user-agent"],
    }, req.tenant.outletId);
    res.json(attendance);
  } catch (err) {
    res.status(400).json({ message: "Check-out failed", error: err.message });
  }
}

export async function recordBreak(req, res) {
  try {
    const { employeeId, type } = req.body; // type: BREAK_START | BREAK_END
    const log = await attendanceService.recordBreak(employeeId, type, {
      ipAddress: req.ip,
      device: req.headers["user-agent"],
    }, req.tenant.outletId);
    res.status(201).json(log);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to record break", error: err.message });
  }
}

export async function getAttendance(req, res) {
  try {
    const result = await attendanceService.listAttendance(req.query, req.tenant.outletId);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: err.message });
  }
}

export async function getEmployeeLogs(req, res) {
  try {
    const logs = await attendanceService.getEmployeeAttendanceLogs(
      req.params.employeeId,
      req.query,
      req.tenant.outletId,
    );
    res.json(logs);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch attendance logs", error: err.message });
  }
}

export async function markStatus(req, res) {
  try {
    const { employeeId, date, status } = req.body; // e.g. mark HOLIDAY or manual ABSENT
    const attendance = await attendanceService.markStatus(
      employeeId,
      date,
      status,
      req.tenant.outletId,
    );
    res.json(attendance);
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to update attendance status",
        error: err.message,
      });
  }
}

// CHANGED: triggers the end-of-day sweep that marks every ACTIVE employee
// without an attendance row for the given date (defaults to today) as ABSENT.
export async function closeDayAttendance(req, res) {
  try {
    const { date } = req.body;
    const result = await attendanceService.markAbsentees(date, req.tenant.outletId);
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to close attendance for the day",
        error: err.message,
      });
  }
}