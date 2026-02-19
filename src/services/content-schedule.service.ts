import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ContentScheduleService {
    constructor(
        @InjectModel('ContentSchedule') private readonly scheduleModel: Model<any>,
    ) { }

    async getAllSchedules() {
        return this.scheduleModel.find().lean();
    }

    async getScheduleByCompany(companyId: string) {
        return this.scheduleModel.findOne({ company_id: new Types.ObjectId(companyId) }).lean();
    }

    async upsertWeekEntry(
        companyId: string,
        companyName: string,
        weekStart: string,
        patch: {
            image_url?: string | null;
            image_public_id?: string | null;
            image_selected?: boolean;
            image_edited?: boolean;
            posted?: boolean;
        },
    ) {
        const weekStartDate = new Date(weekStart);

        let schedule = await this.scheduleModel.findOne({ company_id: new Types.ObjectId(companyId) });

        if (!schedule) {
            schedule = await this.scheduleModel.create({
                company_id: new Types.ObjectId(companyId),
                company_name: companyName,
                weeks: [],
            });
        }

        const existingWeek = schedule.weeks.find(
            (w: any) => new Date(w.week_start).toISOString().slice(0, 10) === weekStartDate.toISOString().slice(0, 10),
        );

        if (existingWeek) {
            Object.assign(existingWeek, patch);
        } else {
            schedule.weeks.push({ week_start: weekStartDate, ...patch });
        }

        await schedule.save();
        return schedule;
    }
}
