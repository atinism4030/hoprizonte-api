import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetaGraphService {
    private readonly logger = new Logger(MetaGraphService.name);

    private readonly META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    private readonly GRAPH_API_VERSION = 'v25.0';
    private readonly BASE_URL = `https://graph.facebook.com/${this.GRAPH_API_VERSION}`;

    async getInstagramAccountId(pageId: string): Promise<string | null> {
        try {
            const res = await axios.get(`${this.BASE_URL}/${pageId}`, {
                params: {
                    fields: 'instagram_business_account',
                    access_token: this.META_ACCESS_TOKEN,
                }
            });
            const igId = res.data?.instagram_business_account?.id;
            if (igId) {
                this.logger.log(`Found Instagram Business Account: ${igId} for Page: ${pageId}`);
            } else {
                this.logger.warn(`No Instagram Business Account linked to Page: ${pageId}`);
            }
            return igId || null;
        } catch (error) {
            this.logger.error(`Failed to get IG account for Page ${pageId}: ${JSON.stringify(error?.response?.data || error.message)}`);
            return null;
        }
    }


    async postToFacebook(
        pageId: string,
        imageUrl: string,
        caption: string,
        scheduledDate: string,
    ): Promise<any> {
        const unixTime = Math.floor(new Date(scheduledDate).getTime() / 1000);
        const nowUnix = Math.floor(Date.now() / 1000);
        const shouldSchedule = (unixTime - nowUnix) > 600;

        this.logger.debug(`Facebook post at UNIX: ${unixTime} (ISO: ${scheduledDate}). Immediate: ${!shouldSchedule}`);

        const photoRes = await axios.post(`${this.BASE_URL}/${pageId}/photos`, null, {
            params: {
                url: imageUrl,
                published: false,
                access_token: this.META_ACCESS_TOKEN,
            }
        });
        const photoId = photoRes.data.id;
        this.logger.debug(`Uploaded unpublished photo: ${photoId}`);

        const feedParams: any = {
            message: caption,
            attached_media: JSON.stringify([{ media_fbid: photoId }]),
            access_token: this.META_ACCESS_TOKEN,
        };

        if (shouldSchedule) {
            feedParams.published = false;
            feedParams.scheduled_publish_time = unixTime;
        } else {
            feedParams.published = true;
        }

        const feedRes = await axios.post(`${this.BASE_URL}/${pageId}/feed`, null, {
            params: feedParams,
        });

        this.logger.log(`Facebook post created: ${feedRes.data.id} (Scheduled: ${shouldSchedule})`);
        return feedRes.data;
    }

    async createInstagramContainer(
        igAccountId: string,
        imageUrl: string,
        caption: string,
    ): Promise<string> {
        this.logger.debug(`Creating IG container for IG ID: ${igAccountId}`);

        const containerRes = await axios.post(`${this.BASE_URL}/${igAccountId}/media`, null, {
            params: {
                image_url: imageUrl,
                caption: caption,
                access_token: this.META_ACCESS_TOKEN,
            }
        });
        const containerId = containerRes.data.id;
        this.logger.log(`Created IG media container: ${containerId} (will be published later by scheduler)`);
        return containerId;
    }

    async publishInstagramContainer(
        igAccountId: string,
        containerId: string,
    ): Promise<any> {
        const publishRes = await axios.post(`${this.BASE_URL}/${igAccountId}/media_publish`, null, {
            params: {
                creation_id: containerId,
                access_token: this.META_ACCESS_TOKEN,
            }
        });
        this.logger.log(`Instagram post published: ${publishRes.data.id}`);
        return publishRes.data;
    }

    async scheduleToAll(
        pageId: string,
        imageUrl: string,
        fbCaption: string,
        igCaption: string,
        scheduledDate: string,
    ): Promise<{ facebook?: any; igContainerId?: string; igAccountId?: string; errors: string[] }> {
        if (!this.META_ACCESS_TOKEN) {
            this.logger.warn("META_ACCESS_TOKEN is missing. Mocking.");
            return {
                facebook: { id: `mock_fb_${Date.now()}` },
                igContainerId: `mock_ig_container_${Date.now()}`,
                igAccountId: 'mock_ig_account',
                errors: [],
            };
        }

        const results: { facebook?: any; igContainerId?: string; igAccountId?: string; errors: string[] } = { errors: [] };

        try {
            results.facebook = await this.postToFacebook(pageId, imageUrl, fbCaption, scheduledDate);
        } catch (error) {
            const msg = `Facebook error: ${JSON.stringify(error?.response?.data || error.message)}`;
            this.logger.error(msg);
            results.errors.push(msg);
        }

        try {
            const igAccountId = await this.getInstagramAccountId(pageId);
            if (igAccountId) {
                results.igAccountId = igAccountId;
                results.igContainerId = await this.createInstagramContainer(igAccountId, imageUrl, igCaption);
            } else {
                results.errors.push('No Instagram Business Account linked to this Facebook Page');
            }
        } catch (error) {
            const msg = `Instagram error: ${JSON.stringify(error?.response?.data || error.message)}`;
            this.logger.error(msg);
            results.errors.push(msg);
        }

        return results;
    }
}
