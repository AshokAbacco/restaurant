// server/src/reservations/reservations.controller.js
import * as reservationsService from "./reservations.service.js";

// requireOutletContext (mounted ahead of this router in index.js) populates
// req.tenant with the outlet resolved for this session — same pattern used
// by every other module scoped to an outlet. There is no "store" concept on
// TableReservation; it's scoped by outletId.
const outletOf = (req) => req.tenant?.outletId;

// ==============================================
// LIST / GET
// ==============================================

export async function getReservations(req, res) {
  try {
    const { date, status, tableId, customer, phone } = req.query;
    const reservations = await reservationsService.listReservations(
      outletOf(req),
      { date, status, tableId, customer, phone },
    );
    res.json(reservations);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch reservations", error: err.message });
  }
}

export async function getReservationById(req, res) {
  try {
    const reservation = await reservationsService.getReservationById(
      req.params.id,
      outletOf(req),
    );
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.json(reservation);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch reservation", error: err.message });
  }
}

// ==============================================
// CREATE / UPDATE
// ==============================================

export async function createReservation(req, res) {
  try {
    const reservation = await reservationsService.createReservation({
      ...req.body,
      outletId: outletOf(req),
      createdBy: req.user?.employeeId,
    });

    res.status(201).json(reservation);
  } catch (err) {
    console.error("CREATE RESERVATION ERROR:", err);

    res.status(400).json({
      message: "Failed to create reservation",
      error: err.message,
    });
  }
}

export async function updateReservation(req, res) {
  try {
    const reservation = await reservationsService.updateReservation(
      req.params.id,
      outletOf(req),
      req.body,
    );
    res.json(reservation);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update reservation", error: err.message });
  }
}

// ==============================================
// STATUS TRANSITIONS
// ==============================================

export async function seatReservation(req, res) {
  try {
    const reservation = await reservationsService.seatReservation(
      req.params.id,
      outletOf(req),
    );
    res.json(reservation);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to seat reservation", error: err.message });
  }
}

export async function cancelReservation(req, res) {
  try {
    const reservation = await reservationsService.cancelReservation(
      req.params.id,
      outletOf(req),
    );
    res.json(reservation);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to cancel reservation", error: err.message });
  }
}

export async function noShowReservation(req, res) {
  try {
    const reservation = await reservationsService.noShowReservation(
      req.params.id,
      outletOf(req),
    );
    res.json(reservation);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to mark as no-show", error: err.message });
  }
}

export async function completeReservation(req, res) {
  try {
    const reservation = await reservationsService.completeReservation(
      req.params.id,
      outletOf(req),
    );
    res.json(reservation);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to complete reservation", error: err.message });
  }
}