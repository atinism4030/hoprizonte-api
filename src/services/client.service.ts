import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class ClientService {
    constructor(
        @InjectModel("Client") private readonly clientModel: Model<any>
    ) { }

    async create(data: any, company: any) {
        const companyId = data.company_id || company?._id || company?.id;

        const existing = await this.clientModel.findOne({
            company_id: companyId,
            name: data.name,
        });

        if (existing) {
            if ((data.email && existing.email !== data.email) || (data.address && existing.address !== data.address)) {
                existing.email = data.email || existing.email;
                existing.address = data.address || existing.address;
                await existing.save();
            }
            return existing;
        }

        const client = new this.clientModel({
            ...data,
            company_id: companyId,
        });
        return client.save();
    }

    async search(query: string, company: any) {
        if (!query) return [];

        return this.clientModel.find({
            company_id: company._id,
            name: { $regex: query, $options: "i" },
        }).limit(10);
    }

    async getAll(company: any) {
        return this.clientModel.find({ company_id: company._id }).sort({ name: 1 });
    }
}
