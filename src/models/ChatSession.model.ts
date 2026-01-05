import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    type: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, default: '' },
    sections: { type: mongoose.Schema.Types.Mixed },
    savedAsProject: { type: Boolean, default: false },
    tokenCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const ChatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    title: { type: String, default: 'New Chat' },
    messages: [MessageSchema],
    totalTokens: { type: Number, default: 0 },
    tokenLimit: { type: Number, default: 8000 },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

ChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });

export const ChatSessionModel = mongoose.model("ChatSession", ChatSessionSchema);
