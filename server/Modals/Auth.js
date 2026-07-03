import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  phone: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date, default: null },
  plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },

  // OTP authentication fields
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpChannel: { type: String, enum: ["email", "sms", null], default: null },
});

export default mongoose.model("user", userschema);
