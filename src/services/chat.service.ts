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

    async getAllSessions(): Promise<IChatSession[]> {
        return this.chatSessionModel
            .find({ isActive: true })
            .populate('userId', 'name email thumbnail')
            .sort({ lastMessageAt: -1 })
            .lean();
    }

    async getSessionById(sessionId: string): Promise<IChatSession> {
        const session = await this.chatSessionModel
            .findById(sessionId)
            .populate('userId', 'name email thumbnail')
            .lean();
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

    async getGlobalAnalytics(): Promise<any> {
        try {
            const sessions = await this.chatSessionModel.find({ isActive: true }).populate('userId', 'name email').lean();

            if (!sessions || sessions.length === 0) {
                return {
                    summary: { totalSessions: 0, totalTokens: 0, totalMessages: 0, conversionRate: '0%', avgMessagesPerSession: '0', avgTokensPerMessage: '0' },
                    activityTrend: [],
                    topUsers: [],
                    commonQuestions: [],
                    topKeywords: [],
                    topCompanies: []
                };
            }

            const totalSessions = sessions.length;
            const totalTokens = sessions.reduce((acc, s) => acc + (s.totalTokens || 0), 0);
            const totalMessages = sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0);

            const conversionCount = sessions.filter(s => s.messages.some(m => m.savedAsProject)).length;
            const conversionRate = totalSessions > 0 ? (conversionCount / totalSessions) * 100 : 0;

            const activityTrend: { date: string; sessions: number; messages: number }[] = [];
            for (let i = 13; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const daySessions = sessions.filter(s => {
                    const createdAt = (s as any).createdAt || s.lastMessageAt;
                    return createdAt >= date && createdAt < nextDate;
                }).length;

                const dayMessages = sessions.reduce((acc, s) => {
                    const msgs = s.messages.filter(m => {
                        const createdAt = (m as any).createdAt || (s as any).createdAt;
                        return createdAt >= date && createdAt < nextDate;
                    }).length;
                    return acc + msgs;
                }, 0);

                activityTrend.push({
                    date: date.toLocaleDateString('sq-AL', { month: 'short', day: 'numeric' }),
                    sessions: daySessions,
                    messages: dayMessages
                });
            }

            const userStats = new Map();
            const messageFrequencies = new Map();
            const keywordsFreq = new Map();
            const companyFreq = new Map();
            const stopWords = new Set(['si', 'te', 'me', 'ne', 'per', 'një', 'në', 'i', 'e', 'të', 'më', 'nuk', 'është', 'dhe', 'ose', 'the', 'and', 'how', 'what', 'can', 'you', 'for', 'për', 'me', 'nga', 'tek', 'ka', 'u', 'të', 'tij', 'saj', 'tyre']);

            sessions.forEach(s => {
                const user = s.userId as any;
                if (user) {
                    const stats = userStats.get(user._id.toString()) || { name: user.name, email: user.email, sessions: 0, messages: 0, tokens: 0 };
                    stats.sessions += 1;
                    stats.messages += s.messages.length;
                    stats.tokens += s.totalTokens;
                    userStats.set(user._id.toString(), stats);
                }

                s.messages.forEach(m => {
                    if (m.type === 'user' && m.text) {
                        const normalized = m.text.trim().toLowerCase().replace(/[?.,!]/g, '');
                        if (normalized.length > 5) {
                            messageFrequencies.set(normalized, (messageFrequencies.get(normalized) || 0) + 1);
                        }

                        const words = normalized.split(/\s+/);
                        words.forEach(word => {
                            if (word.length > 3 && !stopWords.has(word)) {
                                keywordsFreq.set(word, (keywordsFreq.get(word) || 0) + 1);
                            }
                        });
                    }

                    // Extract companies from AI responses
                    if (m.type === 'ai' && m.sections) {
                        // Check if sections contain suggested companies
                        Object.entries(m.sections).forEach(([sectionKey, sectionValue]: [any, any]) => {
                            if (Array.isArray(sectionValue)) {
                                sectionValue.forEach(item => {
                                    if (item.name && (sectionKey.toLowerCase().includes('comp') || sectionKey.toLowerCase().includes('komp'))) {
                                        companyFreq.set(item.name, (companyFreq.get(item.name) || 0) + 1);
                                    }
                                });
                            }
                        });
                    }
                });
            });

            const topUsers = Array.from(userStats.values())
                .sort((a, b) => b.messages - a.messages)
                .slice(0, 5);

            const commonQuestions = Array.from(messageFrequencies.entries())
                .map(([text, count]) => ({ text, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            const topKeywords = Array.from(keywordsFreq.entries())
                .map(([text, count]) => ({ text, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            const topCompanies = Array.from(companyFreq.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6);

            return {
                summary: {
                    totalSessions,
                    totalTokens,
                    totalMessages,
                    conversionRate: conversionRate.toFixed(1) + '%',
                    avgMessagesPerSession: (totalMessages / totalSessions || 0).toFixed(1),
                    avgTokensPerMessage: (totalTokens / totalMessages || 0).toFixed(0)
                },
                activityTrend,
                topUsers,
                commonQuestions,
                topKeywords,
                topCompanies
            };
        } catch (error) {
            console.error('Error in getGlobalAnalytics:', error);
            return null;
        }
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
