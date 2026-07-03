import express from "express";
import { login, updateprofile, initiateLogin, verifyOtp } from "../controllers/auth.js";
const routes = express.Router();

// Original login (backward compatible)
routes.post("/login", login);

// Two-step OTP login
routes.post("/initiate-login", initiateLogin);
routes.post("/verify-otp", verifyOtp);

routes.patch("/update/:id", updateprofile);
export default routes;

