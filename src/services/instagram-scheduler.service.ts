import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { MetaGraphService } from './meta-graph.service';

@Injectable()
export class InstagramSchedulerService {
    private readonly logger = new Logger(InstagramSchedulerService.name);
    private readonly PAGE_ID = '926800267191806';

    constructor(
        @InjectModel('ContentSchedule') private readonly scheduleModel: Model<any>,
        private readonly metaGraphService: MetaGraphService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handlePendingInstagramPosts() {
        const now = new Date();

        const schedules = await this.scheduleModel.find({
            'weeks.ig_container_id': { $ne: null },
            'weeks.ig_published': false,
            'weeks.ig_publish_at': { $lte: now },
        });

        if (schedules.length === 0) return;

        const igAccountId = await this.metaGraphService.getInstagramAccountId(this.PAGE_ID);
        if (!igAccountId) {
            this.logger.warn('No Instagram Business Account found. Skipping IG publish cycle.');
            return;
        }

        for (const schedule of schedules) {
            for (const week of schedule.weeks) {
                if (
                    week.ig_container_id &&
                    !week.ig_published &&
                    week.ig_publish_at &&
                    new Date(week.ig_publish_at) <= now
                ) {
                    try {
                        this.logger.log(`Publishing IG container ${week.ig_container_id} for company ${schedule.company_name}`);
                        const result = await this.metaGraphService.publishInstagramContainer(
                            igAccountId,
                            week.ig_container_id,
                        );
                        week.ig_published = true;
                        this.logger.log(`IG post published successfully: ${result.id} for ${schedule.company_name}`);
                    } catch (error) {
                        this.logger.error(
                            `Failed to publish IG container ${week.ig_container_id}: ${JSON.stringify(error?.response?.data || error.message)}`
                        );
                    }
                }
            }
            await schedule.save();
        }
    }
}
