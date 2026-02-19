import mongoose from "mongoose";

const WeekEntrySchema = new mongoose.Schema({
    week_start: { type: Date, required: true },
    image_url: { type: String, default: null },
    image_public_id: { type: String, default: null },
    image_selected: { type: Boolean, default: false },
    image_edited: { type: Boolean, default: false },
    posted: { type: Boolean, default: false },
});

export const ContentScheduleSchema = new mongoose.Schema(
    {
        company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
        company_name: { type: String, required: true },
        weeks: [WeekEntrySchema],
    },
    { timestamps: true }
);

ContentScheduleSchema.index({ company_id: 1 }, { unique: true });
