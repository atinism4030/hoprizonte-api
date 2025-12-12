import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AccountController } from './controllers/account.controller';
import { StoryController } from './controllers/story.controller';
import { ProjectController } from './controllers/project.controller';

import { AccountService } from './services/account.service';
import { StoryService } from './services/story.service';
import { ProjectService } from './services/project.service';
import { AccountSchema } from './models/Account.model';
import { TestingController } from './controllers/testing.controller';
import { TestingService } from './services/testing.service';
import { IndustrySchema } from './models/industry.model';
import { IndustryController } from './controllers/industry.controller';
import { IndustryService } from './services/industry.service';
import { AiController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';
import { HttpModule } from '@nestjs/axios';
import { StorySchema } from './models/Story.model';
import { CloudinaryService } from './services/cloudinary.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: "Account", schema: AccountSchema }]),
    MongooseModule.forFeature([{ name: "Industry", schema: IndustrySchema }]),
    MongooseModule.forFeature([{name: "Story", schema: StorySchema}]),
    // MongooseModule.forFeature([{name: "Project", schema:}]),
    ScheduleModule.forRoot(),
    HttpModule
  ],

  controllers: [
    AppController,
    AccountController,
    StoryController,
    ProjectController,
    TestingController,
    IndustryController,
    AiController,
  ],

  providers: [
    AppService,
    AccountService,
    StoryService,
    ProjectService,
    TestingService,
    IndustryService,
    AiService,
    CloudinaryService

  ],
})
export class AppModule { }
