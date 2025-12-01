import { Document } from "mongoose";

export interface IIndustry extends Document {
    name: string,
    icon: string,
    parent_industry: string | IIndustry;
}
