import mongoose from "mongoose";

export const InvoiceSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, unique: true },

    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    client_name: { type: String, required: true },
    client_email: { type: String },
    client_address: { type: String },

    title: { type: String },
    description: { type: String },

    items: [
      {
        name: { type: String },
        quantity: { type: String },
        unit_price: { type: String },
        total_price: { type: String },
      },
    ],

    subtotal: { type: String, required: true },
    tax_percent: { type: Number, default: 18 },
    tax_amount: { type: String },
    total_amount: { type: String, required: true },

    advance_paid: { type: String, default: "0" },
    amount_due: { type: String },

    currency: { type: String, default: "MKD" },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PAID", "CANCELLED"],
      default: "DRAFT",
    },

    issued_at: { type: Date, default: Date.now },
    due_date: { type: Date },

    notes: { type: String },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model("Invoice", InvoiceSchema);
