import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as stream from 'stream';

@Injectable()
export class GoogleDriveService {
    private driveClient;

    constructor() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (clientId && clientSecret && refreshToken) {
            console.log("Initializing Google Drive with OAuth2 (Refresh Token) - Bypasses Quota limits!");
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        } else if (clientEmail && privateKey) {
            console.log("Google Drive credentials (Service Account) found. Initializing client...");

            const formattedKey = privateKey.replace(/\\n/g, '\n');

            if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
                console.error("Invalid Private Key format detected. It seems you are providing an API Key instead of a Service Account Private Key.");
                throw new Error("GOOGLE_PRIVATE_KEY must be the Service Account Private Key (starting with -----BEGIN PRIVATE KEY-----), not an API Key.");
            }

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: clientEmail,
                    private_key: formattedKey,
                },
                scopes: ['https://www.googleapis.com/auth/drive'],
            });

            this.driveClient = google.drive({ version: 'v3', auth });
            console.log(`Google Drive Service initialized. Service Account Email: ${clientEmail} (Make sure to share your destination folder with this email!)`);
        } else {
            console.error("Google Drive credentials MISSING. Please provide either Service Account (EMAIL/KEY) or OAuth2 (CLIENT_ID/SECRET/REFRESH_TOKEN).");
            console.warn("Google Drive credentials not found in environment variables.");
        }
    }

    async uploadFile(file: any, companyName: string): Promise<any> {
        if (!this.driveClient) {
            throw new Error("Google Drive client not initialized. Check credentials.");
        }

        const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

        if (!parentId) {
            throw new Error("GOOGLE_DRIVE_PARENT_FOLDER_ID is missing using .env. Please add the ID of the shared folder where you want to store all ads.");
        }

        const folderId = await this.findOrCreateCompanyFolder(companyName, parentId);

        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);

        try {
            const response = await this.driveClient.files.create({
                media: {
                    mimeType: file.mimetype,
                    body: bufferStream,
                },
                requestBody: {
                    name: file.originalname || `upload_${Date.now()}`,
                    parents: [folderId],
                },
                fields: 'id, name, webViewLink, webContentLink',
                supportsAllDrives: true,
            });

            return response.data;
        } catch (error: any) {
            console.error("Upload failed:", error);
            throw error;
        }
    }

    private async findOrCreateCompanyFolder(folderName: string, parentId: string): Promise<string> {
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;

        try {
            const res = await this.driveClient.files.list({
                q: query,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                spaces: 'drive',
            });

            if (res.data.files && res.data.files.length > 0) {
                return res.data.files[0].id;
            }

            console.log(`Creating new folder '${folderName}' inside parent '${parentId}'.`);

            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };

            const file = await this.driveClient.files.create({
                requestBody: fileMetadata,
                fields: 'id',
                supportsAllDrives: true,
            });

            return file.data.id;
        } catch (error) {
            console.error("Error finding/creating folder:", error);
            throw error;
        }
    }
}
