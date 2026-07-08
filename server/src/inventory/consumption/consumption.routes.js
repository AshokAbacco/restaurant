// server/src/inventory/consumption/consumption.routes.js
import { Router } from "express";
import * as consumptionController from "./consumption.controller.js";

const router = Router();

router.post("/", consumptionController.consume);

export default router;