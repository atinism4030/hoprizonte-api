import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MetaGraphService } from './meta-graph.service';

@Injectable()
export class ContentScheduleService {
    constructor(
        @InjectModel('ContentSchedule') private readonly scheduleModel: Model<any>,
        @InjectModel('Account') private readonly accountModel: Model<any>,
        private readonly metaGraphService: MetaGraphService,
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
            schedule_date?: string;
            description?: string;
            hashtags?: string;
            social_tags?: string;
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

        if (patch.schedule_date && patch.image_url && !patch.posted) {
            try {
                const account = await this.accountModel.findById(companyId);
                const socialTags = account?.social_tags || {};

                const fbTagLine = [
                    socialTags.facebook ? `@${socialTags.facebook}` : '',
                    socialTags.instagram ? `@${socialTags.instagram}` : '',
                    socialTags.tiktok ? `@${socialTags.tiktok}` : '',
                ].filter(Boolean).join(' ');

                const fbCaption = [
                    patch.description,
                    patch.hashtags,
                    fbTagLine,
                ].filter(Boolean).join('\n\n');

                const igTagLine = [
                    socialTags.instagram ? `@${socialTags.instagram}` : '',
                    socialTags.facebook ? `@${socialTags.facebook}` : '',
                    socialTags.tiktok ? `@${socialTags.tiktok}` : '',
                ].filter(Boolean).join(' ');

                const igCaption = [
                    patch.description,
                    patch.hashtags,
                    igTagLine,
                ].filter(Boolean).join('\n\n');

                const result = await this.metaGraphService.scheduleToAll(
                    '926800267191806', // horizonte.mk Page ID
                    patch.image_url,
                    fbCaption,
                    igCaption,
                    patch.schedule_date,
                );

                const weekEntry = schedule.weeks.find(
                    (w: any) => new Date(w.week_start).toISOString().slice(0, 10) === weekStartDate.toISOString().slice(0, 10),
                );
                if (weekEntry && result.igContainerId) {
                    weekEntry.ig_container_id = result.igContainerId;
                    weekEntry.ig_publish_at = new Date(patch.schedule_date);
                    weekEntry.ig_published = false;
                }

                if (result.errors.length > 0) {
                    console.warn('Meta API partial errors:', result.errors);
                }

                console.log("ATY ATY META 12 12 rezulltatet ma tforta nzjarrin e altin kushrimit venis nebijes ene tetov shemshoves")

                console.log('Meta API results:', {
                    facebook: result.facebook?.id || 'FAILED',
                    igContainer: result.igContainerId || 'FAILED',
                    igScheduledFor: patch.schedule_date,
                });
            } catch (err: any) {
                console.error("Meta Graph API Integration Error:", JSON.stringify(err.response?.data || err.message));
            }
        }

        await schedule.save();
        return schedule;
    }
}
