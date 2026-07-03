import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import users from "./Modals/Auth.js";
import Invoice from "./Modals/Invoice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube_clone";

async function reset() {
  await mongoose.connect(DBURL);
  
  const email = "developer@example.com";
  console.log(`Connecting to DB and finding user: ${email}...`);
  
  const user = await users.findOne({ email });
  if (!user) {
    console.log(`User ${email} not found. Please log in on the site first to create it.`);
    process.exit(1);
  }

  // Reset plan
  user.isPremium = false;
  user.premiumSince = null;
  user.plan = "free";
  await user.save();
  console.log(`Successfully reset user ${email} to FREE tier (isPremium: false, plan: "free")`);

  // Clear invoices for clean logs
  const deletedInvoices = await Invoice.deleteMany({ userId: user._id });
  console.log(`Deleted ${deletedInvoices.deletedCount} old invoice logs.`);

  process.exit(0);
}

reset().catch(err => {
  console.error(err);
  process.exit(1);
});
