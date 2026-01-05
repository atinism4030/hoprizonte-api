export interface IMessage {
    _id?: string;
    type: 'user' | 'ai';
    text: string;
    sections?: Record<string, any>;
    savedAsProject?: boolean;
    tokenCount?: number;
    createdAt?: Date;
}

export interface IChatSession {
    _id?: string;
    userId: string;
    title: string;
    messages: IMessage[];
    totalTokens: number;
    tokenLimit: number;
    isActive: boolean;
    lastMessageAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateChatSessionDto {
    userId: string;
    title?: string;
}

export interface AddMessageDto {
    sessionId: string;
    type: 'user' | 'ai';
    text: string;
    sections?: Record<string, any>;
    tokenCount?: number;
}

export interface UpdateSessionTitleDto {
    sessionId: string;
    title: string;
}
