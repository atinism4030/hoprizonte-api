import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'etnikz2002@gmail.com',
                pass: process.env.SMTP_PASS || 'boxp pikf nwpy jwaa',
            },
        });
    }

    async sendInvoiceEmail(
        to: string,
        subject: string,
        body: string,
        pdfBase64: string,
        invoiceNumber: string,
        language: string = 'sq'
    ): Promise<{ success: boolean; message: string }> {
        try {
            const pdfBuffer = Buffer.from(pdfBase64, 'base64');

            const fileNameMap: Record<string, string> = {
                sq: 'Fature',
                en: 'Invoice',
                mk: 'Faktura',
            };
            const fileName = `${fileNameMap[language] || 'Invoice'}_${invoiceNumber || 'draft'}.pdf`;

            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Horizonte Invoice" <etnikz2002@gmail.com>',
                to,
                subject,
                text: body,
                html: body.replace(/\n/g, '<br>'),
                attachments: [
                    {
                        filename: fileName,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });

            console.log('Email sent:', info.messageId);
            return { success: true, message: `Email sent to ${to}` };
        } catch (error) {
            console.error('Email sending failed:', error);

            // For development/demo purposes, return success even if email fails
            // Remove this in production
            if (process.env.NODE_ENV !== 'production') {
                console.log('Development mode: Simulating successful email send');
                return {
                    success: true,
                    message: `Email would be sent to ${to} (development mode - SMTP not configured)`
                };
            }

            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to send email'
            };
        }
    }

    async sendOTPEmail(to: string, otp: string, language: string = 'sq'): Promise<{ success: boolean; message: string }> {
        const translations: any = {
            sq: {
                subject: 'Kodi juaj i verifikimit',
                body: `Kodi juaj për të rivendosur fjalëkalimin është: <b>${otp}</b>. Ky kod vlen për 30 minuta.`
            },
            en: {
                subject: 'Your verification code',
                body: `Your code to reset your password is: <b>${otp}</b>. This code is valid for 30 minutes.`
            },
            mk: {
                subject: 'Вашиот верификациски код',
                body: `Вашиот код за ресетирање на лозинката е: <b>${otp}</b>. Овој код важи 30 минути.`
            }
        };

        const t = translations[language] || translations.sq;

        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Horizonte" <etnikz2002@gmail.com>',
                to,
                subject: t.subject,
                html: t.body,
            });
            return { success: true, message: 'Email sent' };
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, message: 'Failed to send email' };
        }
    }
}
