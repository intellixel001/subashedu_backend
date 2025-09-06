// models/MaterialPayment.model.js
import mongoose, { Schema } from "mongoose";

const PaymentSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum : ["bkash", "nagad"],
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    termsAccepted: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const MaterialPayment =
  mongoose.models.MaterialPayment || mongoose.model("MaterialPayment", PaymentSchema);