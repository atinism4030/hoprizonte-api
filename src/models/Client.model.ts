import mongoose from "mongoose";

// ki modeli o per te invoices kur e kerkojn klientin kopmanit :)))

export const ClientSchema = new mongoose.Schema(
    {
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        email: { type: String },
        address: { type: String },
    },
    { timestamps: true }
);

ClientSchema.index({ company_id: 1, name: 1 }, { unique: true });
