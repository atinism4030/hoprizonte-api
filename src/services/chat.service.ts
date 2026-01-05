import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddMessageDto, CreateChatSessionDto, IChatSession, IMessage } from 'src/types/chat.types';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        @InjectModel('ChatSession') private chatSessionModel: Model<IChatSession>
    ) { }

    estimateTokens(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    async createSession(dto: CreateChatSessionDto): Promise<IChatSession> {
        const session = new this.chatSessionModel({
            userId: dto.userId,
            title: dto.title || 'New Chat',
            messages: [],
            totalTokens: 0,
            tokenLimit: 8000,
            isActive: true,
            lastMessageAt: new Date()
        });
        return session.save();
    }

    async getUserSessions(userId: string): Promise<IChatSession[]> {
        return this.chatSessionModel
            .find({ userId, isActive: true })
            .sort({ lastMessageAt: -1 })
            .select('title totalTokens tokenLimit lastMessageAt createdAt messages')
            .lean();
    }

    async getSessionById(sessionId: string): Promise<IChatSession> {
        const session = await this.chatSessionModel.findById(sessionId).lean();
        if (!session) {
            throw new NotFoundException('Chat session not found');
        }
        return session;
    }

    async addMessage(dto: AddMessageDto): Promise<{ session: IChatSession; tokenLimitReached: boolean }> {
        const session = await this.chatSessionModel.findById(dto.sessionId);
        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        const textContent = dto.text || (dto.sections ? JSON.stringify(dto.sections) : '');
        const tokenCount = dto.tokenCount || this.estimateTokens(textContent);

        const message: IMessage = {
            type: dto.type,
            text: dto.text,
            sections: dto.sections,
            tokenCount,
            createdAt: new Date()
        };

        session.messages.push(message as any);
        session.totalTokens += tokenCount;
        session.lastMessageAt = new Date();

        if (session.messages.length === 1 && dto.type === 'user') {
            session.title = dto.text.slice(0, 50) + (dto.text.length > 50 ? '...' : '');
        }

        await session.save();

        const tokenLimitReached = session.totalTokens >= session.tokenLimit;

        return { session: session.toObject(), tokenLimitReached };
    }

    async updateSessionTitle(sessionId: string, title: string): Promise<IChatSession> {
        const session = await this.chatSessionModel.findByIdAndUpdate(
            sessionId,
            { title },
            { new: true }
        ).lean();

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        return session;
    }

    async deleteSession(sessionId: string): Promise<void> {
        const result = await this.chatSessionModel.findByIdAndUpdate(
            sessionId,
            { isActive: false },
            { new: true }
        );

        if (!result) {
            throw new NotFoundException('Chat session not found');
        }
    }

    async permanentlyDeleteSession(sessionId: string): Promise<void> {
        const result = await this.chatSessionModel.findByIdAndDelete(sessionId);
        if (!result) {
            throw new NotFoundException('Chat session not found');
        }
    }

    async getSessionTokenInfo(sessionId: string): Promise<{ totalTokens: number; tokenLimit: number; remainingTokens: number }> {
        const session = await this.chatSessionModel.findById(sessionId).select('totalTokens tokenLimit').lean();
        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        return {
            totalTokens: session.totalTokens,
            tokenLimit: session.tokenLimit,
            remainingTokens: Math.max(0, session.tokenLimit - session.totalTokens)
        };
    }

    async markMessageAsSavedProject(sessionId: string, messageIndex: number): Promise<IChatSession> {
        const session = await this.chatSessionModel.findById(sessionId);
        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        if (messageIndex >= 0 && messageIndex < session.messages.length) {
            session.messages[messageIndex].savedAsProject = true;
            await session.save();
        }

        return session.toObject();
    }
}
