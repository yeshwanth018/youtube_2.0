import express from "express";
import { createOrder, verifyPayment, cancelSubscription, getInvoiceHtml } from "../controllers/payment.js";

const routes = express.Router();
routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.post("/cancel", cancelSubscription);
routes.get("/invoice/:invoiceId/html", getInvoiceHtml);
export default routes;
