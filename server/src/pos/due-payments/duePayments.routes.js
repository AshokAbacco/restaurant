// server/src/pos/due-payments/duePayments.routes.js
import { Router } from "express";
import * as duePaymentsController from "./duePayments.controller.js";

const router = Router();

router.get("/", duePaymentsController.getDuePayments);
router.get("/customers/:customerId", duePaymentsController.getDuePaymentsForCustomer);
router.get("/:id", duePaymentsController.getDuePayment);
router.post("/:id/settle", duePaymentsController.settleDuePayment);

export default router;