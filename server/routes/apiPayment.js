import express from "express";
import { createOrder, verifyPayment, cancelSubscription } from "../controllers/apiPayment.js";

const routes = express.Router();

// POST /api/payments/create-order
routes.post("/create-order", createOrder);

// POST /api/payments/verify
routes.post("/verify", verifyPayment);

// POST /api/payments/cancel
routes.post("/cancel", cancelSubscription);

export default routes;
