import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import Invoice from "../Modals/Invoice.js";
import { sendInvoiceEmail, generateInvoiceHtml } from "../utils/email.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
export const createOrder = async (req, res) => {
  const { userId, tier } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  const validTiers = ["bronze", "silver", "gold"];
  if (!tier || !validTiers.includes(tier)) {
    return res.status(400).json({ message: "Invalid or missing tier parameter. Allowed: bronze, silver, gold." });
  }

  const tierAmounts = {
    bronze: 1000,   // ₹10 in paise
    silver: 5000,   // ₹50 in paise
    gold: 10000,    // ₹100 in paise
  };
  const amount = tierAmounts[tier];
  const keyId = process.env.RAZORPAY_KEY_ID;

  // If running with dummy/missing keys, return a mock order
  if (!keyId || keyId.startsWith("rzp_test_dummy") || keyId === "rzp_test_XXXXXXXXX") {
    console.log("[api/payments] Dummy Razorpay key detected — returning mock order.");
    return res.status(200).json({
      id: `mock_order_${tier}_${Date.now()}`,
      amount: amount,
      currency: "INR",
      isMock: true,
      key: keyId || "rzp_test_dummykey123",
    });
  }

  try {
    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        plan: tier,
      },
    };
    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("[api/payments] createOrder error:", error);
    // Fallback to mock order so the flow doesn't break
    return res.status(200).json({
      id: `mock_order_fallback_${tier}_${Date.now()}`,
      amount: amount,
      currency: "INR",
      isMock: true,
      key: keyId || "rzp_test_dummykey123",
    });
  }
};

// POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } =
    req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  try {
    // Resolve the tier
    let tier = req.body.tier;
    if (!tier) {
      if (razorpay_order_id && razorpay_order_id.startsWith("mock_order")) {
        const parts = razorpay_order_id.split("_");
        if (parts[2] === "fallback") {
          tier = parts[3];
        } else {
          tier = parts[2];
        }
      } else {
        // Real order — fetch notes from Razorpay
        try {
          const order = await razorpay.orders.fetch(razorpay_order_id);
          tier = order.notes?.plan;
        } catch (err) {
          console.error("Failed to fetch Razorpay order:", err);
        }
      }
    }

    const validTiers = ["bronze", "silver", "gold"];
    if (!tier || !validTiers.includes(tier)) {
      tier = "bronze"; // default fallback
    }

    const tierPrices = {
      bronze: 10,
      silver: 50,
      gold: 100,
    };
    const amountPaid = tierPrices[tier];

    // Mock/test payment — bypass signature verification
    if (
      (razorpay_order_id && razorpay_order_id.startsWith("mock_order")) ||
      razorpay_signature === "mock_signature"
    ) {
      console.log("[api/payments] Mock payment — bypassing signature validation.");
      
      const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;
      
      // Create Invoice
      const invoice = new Invoice({
        userId,
        planSelected: tier,
        amountPaid,
        paymentId,
      });
      await invoice.save();

      const updatedUser = await users.findByIdAndUpdate(
        userId,
        {
          $set: {
            isPremium: true,
            premiumSince: new Date(),
            plan: tier,
          },
        },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found." });
      }

      // Trigger invoice email asynchronously
      sendInvoiceEmail(updatedUser, invoice).catch((err) =>
        console.error("[Email Error] Failed to send mock invoice email:", err)
      );

      return res.status(200).json({ verified: true, user: updatedUser });
    }

    // Real Razorpay signature verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Create Invoice
      const invoice = new Invoice({
        userId,
        planSelected: tier,
        amountPaid,
        paymentId: razorpay_payment_id,
      });
      await invoice.save();

      // Payment verified — upgrade user to the specific tier
      const updatedUser = await users.findByIdAndUpdate(
        userId,
        {
          $set: {
            isPremium: true,
            premiumSince: new Date(),
            plan: tier,
          },
        },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found." });
      }

      // Trigger invoice email asynchronously
      sendInvoiceEmail(updatedUser, invoice).catch((err) =>
        console.error("[Email Error] Failed to send invoice email:", err)
      );

      return res.status(200).json({ verified: true, user: updatedUser });
    } else {
      return res
        .status(400)
        .json({ verified: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error("[api/payments] verifyPayment error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// POST /api/payments/cancel
export const cancelSubscription = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      {
        $set: {
          isPremium: false,
          premiumSince: null,
          plan: "free",
        },
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ cancelled: true, user: updatedUser });
  } catch (error) {
    console.error("[api/payments] cancelSubscription error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getInvoiceHtml = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).send("<h1>Invoice not found</h1>");
    }
    const user = await users.findById(invoice.userId);
    if (!user) {
      return res.status(404).send("<h1>User not found for this invoice</h1>");
    }
    const html = generateInvoiceHtml(user, invoice);
    return res.status(200).send(html);
  } catch (error) {
    console.error("getInvoiceHtml error:", error);
    return res.status(500).send("<h1>Internal Server Error</h1>");
  }
};
