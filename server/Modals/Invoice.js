import mongoose from "mongoose";

const invoiceSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  planSelected: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("invoice", invoiceSchema);
