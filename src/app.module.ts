import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AccountController } from './controllers/account.controller';
import { ChatController } from './controllers/chat.controller';
import { ProjectController } from './controllers/project.controller';
import { StoryController } from './controllers/story.controller';
import { FinanceController } from './controllers/finance.controller';

import { HttpModule } from '@nestjs/axios';
import { AiController } from './controllers/ai.controller';
import { ClientController } from './controllers/client.controller';
import { IndustryController } from './controllers/industry.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { SocialMediaController } from './controllers/social-media.controller';
import { ContentScheduleSchema } from './models/ContentSchedule.model';
import { FinanceSchema } from './models/Finance.model';
import { ContentScheduleService } from './services/content-schedule.service';
import { TestingController } from './controllers/testing.controller';
import { AccountSchema } from './models/Account.model';
import { ChatSessionSchema } from './models/ChatSession.model';
import { ClientSchema } from './models/Client.model';
import { DeletionReportSchema } from './models/DeletionReport.model';
import { IndustrySchema } from './models/industry.model';
import { InvoiceSchema } from './models/Invoice.model';
import { ProjectSchema } from './models/Project.model';
import { StorySchema } from './models/Story.model';
import { AccountService } from './services/account.service';
import { AiService } from './services/ai.service';
import { ChatService } from './services/chat.service';
import { ClientService } from './services/client.service';
import { CloudinaryService } from './services/cloudinary.service';
import { EmailService } from './services/email.service';
import { GoogleDriveService } from './services/google-drive.service';
import { IndustryService } from './services/industry.service';
import { InvoiceService } from './services/invoice.service';
import { ProjectService } from './services/project.service';
import { StoryService } from './services/story.service';
import { TestingService } from './services/testing.service';
import { FinanceService } from './services/finance.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        console.log("Connecting to Mongo URI:", uri ? "Found URI" : "URI NOT FOUND");
        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: "Account", schema: AccountSchema }]),
    MongooseModule.forFeature([{ name: "Industry", schema: IndustrySchema }]),
    MongooseModule.forFeature([{ name: "Story", schema: StorySchema }]),
    MongooseModule.forFeature([{ name: "Project", schema: ProjectSchema }]),
    MongooseModule.forFeature([{ name: "ChatSession", schema: ChatSessionSchema }]),
    MongooseModule.forFeature([{ name: "Invoice", schema: InvoiceSchema }]),
    MongooseModule.forFeature([{ name: "Client", schema: ClientSchema }]),
    MongooseModule.forFeature([{ name: "DeletionReport", schema: DeletionReportSchema }]),
    MongooseModule.forFeature([{ name: "ContentSchedule", schema: ContentScheduleSchema }]),
    MongooseModule.forFeature([{ name: "Finance", schema: FinanceSchema }]),

    ScheduleModule.forRoot(),
    HttpModule
  ],

  controllers: [
    AppController,
    AccountController,
    StoryController,
    ProjectController,
    ChatController,
    TestingController,
    IndustryController,
    AiController,
    InvoiceController,
    ClientController,
    SocialMediaController,
    FinanceController
  ],

  providers: [
    AppService,
    AccountService,
    StoryService,
    ProjectService,
    ChatService,
    TestingService,
    IndustryService,
    AiService,
    CloudinaryService,
    InvoiceService,
    ClientService,
    GoogleDriveService,
    EmailService,
    ContentScheduleService,
    FinanceService
  ],
})
export class AppModule { }
