import fetch from "node-fetch";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import users from "./Modals/Auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function runTest() {
  console.log("=========================================");
  console.log(" 🧪 Running Automated OTP Flow Test...");
  console.log("=========================================\n");

  const email = "developer@example.com";
  
  // 1. Connect to MongoDB to read the generated OTP directly
  const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube_clone";
  await mongoose.connect(DBURL);
  
  try {
    // 2. Step 1: Initiate Login via API
    console.log(`[1/3] Initiating login for: ${email}...`);
    const initResponse = await fetch("http://localhost:5000/user/initiate-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: "Developer User",
        phone: "+919876543210"
      })
    });
    
    const initData = await initResponse.json();
    console.log("👉 Response:", JSON.stringify(initData, null, 2));
    console.log("-----------------------------------------");

    // 3. Step 2: Fetch the generated OTP directly from MongoDB
    console.log("[2/3] Retrieving generated OTP from MongoDB...");
    const userDoc = await users.findOne({ email });
    if (!userDoc || !userDoc.otp) {
      throw new Error("Could not find generated OTP in the database.");
    }
    const generatedOtp = userDoc.otp;
    console.log(`🔑 Retrieved OTP from DB: ${generatedOtp}`);
    console.log("-----------------------------------------");

    // 4. Step 3: Call Verify OTP via API
    console.log(`[3/3] Verifying OTP: ${generatedOtp}...`);
    const verifyResponse = await fetch("http://localhost:5000/user/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp: generatedOtp
      })
    });
    
    const verifyData = await verifyResponse.json();
    console.log("🏆 Verification Response:", JSON.stringify(verifyData, null, 2));

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n=========================================");
    console.log(" ✅ Test execution complete.");
    console.log("=========================================");
  }
}

runTest();
