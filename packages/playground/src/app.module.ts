import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { MessagesController } from './messages.controller';
import { HealthController } from './health.controller';
import { UsersController } from './users.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [HealthController, UsersController, ChannelsController, MessagesController],
  providers: [ChatGateway],
})
export class AppModule {}
