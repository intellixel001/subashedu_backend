import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    sentBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sentByModel: {
      type: String,
      required: true,
      enum: ["Admin", "Staff", "Student"],
    },
    sentTo: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sentToModel: {
      type: String,
      required: true,
      enum: ["Admin", "Staff", "Student"],
    },
    message: {
      type: String,
      required: true,
    },
    readReceipt: {
      type: Boolean,
      default: false,
    },
    deletedBySender: {
      type: Boolean,
      default: false,
    },
    deletedByRecipient: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);