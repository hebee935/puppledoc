import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { MessagesController } from './messages.controller';
import { HealthController } from './health.controller';
import { UsersController } from './users.controller';
import { SupportController } from './support.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [HealthController, UsersController, ChannelsController, MessagesController, SupportController],
  providers: [ChatGateway],
})
export class AppModule {}
