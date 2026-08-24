// server/src/pos/cash-drawer/cashDrawer.routes.js
import { Router } from "express";
import * as cashDrawerController from "./cashDrawer.controller.js";

const router = Router();

// "current"/"sessions" (list) must come before "/:sessionId" — same
// literal-before-param ordering convention used throughout this codebase
// (see tables.routes.js).
router.get("/current", cashDrawerController.getCurrentSession);
router.get("/sessions", cashDrawerController.getSessions);
router.post("/open", cashDrawerController.openSession);

router.get("/:sessionId", cashDrawerController.getSession);
router.post("/:sessionId/withdraw", cashDrawerController.withdraw);
router.post("/:sessionId/top-up", cashDrawerController.topUp);
router.post("/:sessionId/currency-conversion", cashDrawerController.convertCurrency);
router.post("/:sessionId/close", cashDrawerController.closeSession);

export default router;