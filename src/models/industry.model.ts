import mongoose from "mongoose";

export const IndustrySchema = new mongoose.Schema({
    name: {type:String,required:true},
    icon: {type:String,required:true},
    parent_industry: {type:mongoose.Schema.Types.ObjectId, ref: "Industry", required: false},
});
