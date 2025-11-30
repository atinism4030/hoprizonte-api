import { Document, ObjectId } from "mongoose";
import { EIndustries } from "./industries.types";
import { IService } from "./services.types";

export interface IAccount extends Document {
        name: string,
        address?: string,
        email: string,
        password: string,
        phone: string,
        description: string,
        industries?: EIndustries[],
        working_hours?: string[],
        nr_of_workers?: number,
        images?: string[],
        thumbnail?: string,
        services?: IService[],
        type: AccountType,
        fav_list?: IAccount[] | string[],
        credits?: number,
        social_media_links: [
        {
            facebook: string,
            instagram: string,
            tiktok: string,
            website: string,
        }
    ],
}

export type AccountType = "USER" | "COMPANY";
export enum EAccountType {
        USER = "USER",
        COMPANY = "COMPANY"
}