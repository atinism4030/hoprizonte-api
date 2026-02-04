import mongoose from "mongoose";

export const DeletionReportSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    reason: { type: String, default: "Business account deletion request" },
    accountDetails: { type: Object }, // Store a snapshot of account details
}, { timestamps: true });
