import mongoose from "mongoose";
import { EAccountType, IAccount } from "src/types/account.types";
import { EIndustries } from "src/types/industries.types";
import jwt from "jsonwebtoken";

export const AccountSchema = new mongoose.Schema({
    name: { type: String },
    address: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    description: { type: String },
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],
    working_hours: [{ type: String }],
    nr_of_workers: { type: Number },
    images: [{ type: String }],
    thumbnail: { type: String },
    services: [
        {
            name: { type: String },
            icon: { type: String },
            price: { type: String },
        }
    ],
    type: { type: String, enum: Object.values(EAccountType), required: true },
    fav_list: [{
        type: mongoose.Schema.Types.ObjectId, ref: "Account"
    }],
    credits: { type: Number },
    reviews:
    {
        number_of_reviewers: { type: Number },
        avg_score: { type: Number },
    },
    social_media_links: [
        {
            facebook: String,
            instagram: String,
            tiktok: String,
            website: String,
        }
    ],
    push_token: { type: String },
    map_url: { type: String },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpires: { type: Date },
    is_active: { type: Boolean, default: true },
    is_hiring: { type: Boolean, default: false },
}, { timestamps: true })

AccountSchema.methods.generateAuthToken = function (data: Partial<IAccount>) {
    data.password = undefined;
    return jwt.sign({ data }, process.env.ACCESS_TOKEN_SECRET);
}