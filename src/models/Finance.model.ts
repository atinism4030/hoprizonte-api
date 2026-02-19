import mongoose from "mongoose";

export const FinanceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        amount: { type: Number, required: true },
        currency: { type: String, enum: ["MKD", "EUR"], default: "MKD" },
        date: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: ["INCOME", "OUTCOME", "BANK"],
            required: true
        },
        category: { type: String }, // Optional: e.g. "Software", "Rent", "Salary"
    },
    { timestamps: true }
);

export interface Finance extends mongoose.Document {
    name: string;
    description: string;
    amount: number;
    currency: string;
    date: Date;
    type: "INCOME" | "OUTCOME" | "BANK";
    category?: string;
}
