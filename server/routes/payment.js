import express from "express";
import { createOrder, verifyPayment, cancelSubscription } from "../controllers/payment.js";

const routes = express.Router();
routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.post("/cancel", cancelSubscription);
export default routes;
