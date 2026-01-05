import { Controller, Get, Post, Put, Delete, Query, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from 'src/services/chat.service';
import type { AddMessageDto, CreateChatSessionDto, UpdateSessionTitleDto } from 'src/types/chat.types';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('sessions')
    async createSession(@Body() dto: CreateChatSessionDto) {
        try {
            const session = await this.chatService.createSession(dto);
            return { success: true, session };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('sessions')
    async getUserSessions(@Query('userId') userId: string) {
        if (!userId) {
            throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        try {
            const sessions = await this.chatService.getUserSessions(userId);
            return { success: true, sessions };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('sessions/:sessionId')
    async getSession(@Param('sessionId') sessionId: string) {
        try {
            const session = await this.chatService.getSessionById(sessionId);
            return { success: true, session };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }

    @Post('sessions/:sessionId/messages')
    async addMessage(
        @Param('sessionId') sessionId: string,
        @Body() body: { type: 'user' | 'ai'; text: string; sections?: Record<string, any>; tokenCount?: number }
    ) {
        try {
            const result = await this.chatService.addMessage({
                sessionId,
                ...body
            });
            return {
                success: true,
                session: result.session,
                tokenLimitReached: result.tokenLimitReached,
                tokenInfo: {
                    totalTokens: result.session.totalTokens,
                    tokenLimit: result.session.tokenLimit,
                    remainingTokens: Math.max(0, result.session.tokenLimit - result.session.totalTokens)
                }
            };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('sessions/:sessionId/title')
    async updateTitle(
        @Param('sessionId') sessionId: string,
        @Body() body: { title: string }
    ) {
        try {
            const session = await this.chatService.updateSessionTitle(sessionId, body.title);
            return { success: true, session };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('sessions/:sessionId')
    async deleteSession(@Param('sessionId') sessionId: string) {
        try {
            await this.chatService.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('sessions/:sessionId/tokens')
    async getTokenInfo(@Param('sessionId') sessionId: string) {
        try {
            const tokenInfo = await this.chatService.getSessionTokenInfo(sessionId);
            return { success: true, ...tokenInfo };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put('sessions/:sessionId/messages/:messageIndex/saved')
    async markAsSavedProject(
        @Param('sessionId') sessionId: string,
        @Param('messageIndex') messageIndex: string
    ) {
        try {
            const session = await this.chatService.markMessageAsSavedProject(sessionId, parseInt(messageIndex));
            return { success: true, session };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
