import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { generateOtp, getOtpExpiry } from "../utils/otp.js";
import { sendOtpEmail, sendOtpSms } from "../utils/otpDispatch.js";

// ─────────────────────────────────────────────
//  Step 1: Initiate Login — sends OTP via the
//  appropriate channel based on user region
// ─────────────────────────────────────────────
export const initiateLogin = async (req, res) => {
  const { email, name, image, phone } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (phone) {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({ message: "Invalid phone number. Must be exactly 10 digits." });
    }
  }

  try {
    // Find or create the user first
    let user = await users.findOne({ email });

    // Determine channel from Phase 1 region middleware
    const isSouthIndia = req.geoInfo?.isSouthIndia ?? false;
    let channel = isSouthIndia ? "email" : "sms";

    // If SMS is needed, but we have no registered phone and no phone input
    if (channel === "sms" && (!user || !user.phone) && !phone) {
      return res.status(200).json({
        requirePhone: true,
        message: "A phone number is required to send the SMS OTP for your region.",
        region: req.geoInfo?.region || null,
        isSouthIndia,
      });
    }

    if (!user) {
      user = await users.create({ email, name, image, phone });
    } else {
      if (phone && !user.phone) {
        user.phone = phone;
      }
      if (name) user.name = name;
      if (image) user.image = image;
      await user.save();
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiry = getOtpExpiry();

    if (channel === "email") {
      await sendOtpEmail(email, otp, user.name);
    } else {
      const targetPhone = phone || user.phone;
      await sendOtpSms(targetPhone, otp);
    }

    // Persist OTP to user document
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpChannel = channel;
    await user.save();

    console.log(
      `[Auth] OTP sent via ${channel.toUpperCase()} to ${email} | Region: ${req.geoInfo?.region || "unknown"} | South India: ${isSouthIndia}`
    );

    return res.status(200).json({
      message: `OTP sent via ${channel}`,
      channel,
      // Mask details for security
      destination:
        channel === "email"
          ? maskEmail(email)
          : maskPhone(user.phone),
      region: req.geoInfo?.region || null,
      isSouthIndia,
    });
  } catch (error) {
    console.error("Login initiation error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─────────────────────────────────────────────
//  Step 2: Verify OTP — validates the code and
//  returns the authenticated user
// ─────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({ message: "No OTP was requested. Please initiate login first." });
    }

    // Check if OTP has expired
    if (new Date() > new Date(user.otpExpiry)) {
      // Clear stale OTP
      user.otp = null;
      user.otpExpiry = null;
      user.otpChannel = null;
      await user.save();
      return res.status(410).json({ message: "OTP has expired. Please request a new one." });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // OTP is valid — clear it and return user
    const verifiedChannel = user.otpChannel;
    user.otp = null;
    user.otpExpiry = null;
    user.otpChannel = null;
    await user.save();

    console.log(
      `[Auth] OTP verified for ${email} via ${verifiedChannel?.toUpperCase()}`
    );

    return res.status(200).json({
      message: "OTP verified successfully",
      channel: verifiedChannel,
      result: user,
      isSouthIndia: req.geoInfo?.isSouthIndia ?? false,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─────────────────────────────────────────────
//  Original login (kept for backward compat)
// ─────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    const isSouthIndia = req.geoInfo?.isSouthIndia ?? false;

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser, isSouthIndia });
    } else {
      return res.status(200).json({ result: existingUser, isSouthIndia });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─────────────────────────────────────────────
//  Update Profile
// ─────────────────────────────────────────────
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─────────────────────────────────────────────
//  Helpers — mask sensitive data in responses
// ─────────────────────────────────────────────
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return "****";
  return "****" + phone.slice(-4);
}

