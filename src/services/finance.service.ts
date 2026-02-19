import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Finance } from '../models/Finance.model';

@Injectable()
export class FinanceService {
    constructor(
        @InjectModel('Finance') private readonly financeModel: Model<Finance>,
    ) { }

    async create(data: any): Promise<Finance> {
        const record = new this.financeModel(data);
        return await record.save();
    }

    async findAll(): Promise<Finance[]> {
        return await this.financeModel.find().sort({ date: -1 }).exec();
    }

    async findOne(id: string): Promise<Finance | null> {
        return await this.financeModel.findById(id).exec();
    }

    async update(id: string, data: any): Promise<Finance | null> {
        return await this.financeModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<any> {
        return await this.financeModel.findByIdAndDelete(id).exec();
    }

    async getSummary() {
        const records = await this.financeModel.find().exec();
        const summary = {
            total_income_mkd: 0,
            total_income_eur: 0,
            total_outcome_mkd: 0,
            total_outcome_eur: 0,
            bank_balance_mkd: 0,
            bank_balance_eur: 0,
        };

        records.forEach((record) => {
            if (record.type === 'INCOME') {
                if (record.currency === 'MKD') summary.total_income_mkd += record.amount;
                else summary.total_income_eur += record.amount;
            } else if (record.type === 'OUTCOME') {
                if (record.currency === 'MKD') summary.total_outcome_mkd += record.amount;
                else summary.total_outcome_eur += record.amount;
            } else if (record.type === 'BANK') {
                if (record.currency === 'MKD') summary.bank_balance_mkd += record.amount;
                else summary.bank_balance_eur += record.amount;
            }
        });

        // Calculate Cash On Hand (Money we have without the ones in bank)
        // Cash = (Total Income - Total Outcome) - Bank Balance
        const cash_on_hand_mkd = (summary.total_income_mkd - summary.total_outcome_mkd) - summary.bank_balance_mkd;
        const cash_on_hand_eur = (summary.total_income_eur - summary.total_outcome_eur) - summary.bank_balance_eur;

        // Calculate Total Balance (Cash + Bank)
        const total_balance_mkd = cash_on_hand_mkd + summary.bank_balance_mkd;
        const total_balance_eur = cash_on_hand_eur + summary.bank_balance_eur;

        return {
            ...summary,
            cash_on_hand_mkd,
            cash_on_hand_eur,
            total_balance_mkd,
            total_balance_eur
        };
    }
}
