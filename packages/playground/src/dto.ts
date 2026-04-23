import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/* ---------- Shared ---------- */

export class ErrorResponseDto {
  @ApiProperty({ example: 'not_found' })
  error!: string;

  @ApiProperty({ example: 'The requested resource could not be found.' })
  message!: string;
}

export class AttachmentDto {
  @ApiProperty({ example: 'file_01' })
  id!: string;

  @ApiProperty({ example: 'screenshot.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  contentType!: string;

  @ApiProperty({ example: 48213, description: 'bytes' })
  size!: number;

  @ApiProperty({ example: 'https://cdn.example.com/attachments/file_01' })
  url!: string;
}

/* ---------- Channels ---------- */

export class ChannelDto {
  @ApiProperty({ example: 'ch_01' })
  id!: string;

  @ApiProperty({ example: 'general' })
  name!: string;

  @ApiProperty({ example: false })
  isPrivate!: boolean;

  @ApiProperty({ example: 12 })
  memberCount!: number;

  @ApiProperty({ example: '2026-04-20T09:00:00Z' })
  createdAt!: string;
}

export class CreateChannelDto {
  @ApiProperty({ example: 'product', description: 'a-z, 0-9 and - only' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ required: false, example: 'Product design discussion' })
  @IsOptional()
  @IsString()
  topic?: string;
}

export class ListChannelsQuery {
  @ApiProperty({ required: false, example: 20, description: '1–100' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, example: 'ch_01' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

/* ---------- Messages ---------- */

export class MessageDto {
  @ApiProperty({ example: 'msg_01' })
  id!: string;

  @ApiProperty({ example: 'ch_01' })
  channelId!: string;

  @ApiProperty({ example: 'usr_alice' })
  userId!: string;

  @ApiProperty({ example: 'Has anyone reviewed the PR?' })
  text!: string;

  @ApiProperty({ example: '2026-04-23T06:00:00Z' })
  createdAt!: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'Shipping it tonight 🚀' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false, example: ['file_01'] })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class ListMessagesQuery {
  @ApiProperty({ required: false, example: 50, description: '1–100' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, example: 'msg_01' })
  @IsOptional()
  @IsString()
  before?: string;
}

/* ---------- WebSocket frames ---------- */

// server → client (emitted on connect)
export class HelloFrameDto {
  @ApiProperty({ example: 'hello' })
  type!: 'hello';

  @ApiProperty({ example: 'sess_01HVNX2P' })
  sessionId!: string;

  @ApiProperty({ example: 15000, description: 'client ping interval in ms' })
  heartbeatMs!: number;
}

// client → server
export class SubscribeFrameDto {
  @ApiProperty({ example: 'subscribe' })
  type!: 'subscribe';

  @ApiProperty({ example: 'ch_01' })
  @IsString()
  channelId!: string;
}

// server → client (reply to subscribe)
export class SubscribedFrameDto {
  @ApiProperty({ example: 'subscribed' })
  type!: 'subscribed';

  @ApiProperty({ example: 'ch_01' })
  channelId!: string;

  @ApiProperty({ example: 12 })
  memberCount!: number;
}

// client → server
export class ChatMessageFrameDto {
  @ApiProperty({ example: 'chat.message' })
  type!: 'chat.message';

  @ApiProperty({ example: 'ch_01' })
  @IsString()
  channelId!: string;

  @ApiProperty({ example: 'Shipping it tonight 🚀' })
  @IsString()
  text!: string;
}

// server → client (reply to chat.message)
export class ChatAckFrameDto {
  @ApiProperty({ example: 'chat.message.ack' })
  type!: 'chat.message.ack';

  @ApiProperty({ example: 'msg_02' })
  messageId!: string;

  @ApiProperty({ example: '2026-04-23T06:00:01Z' })
  createdAt!: string;
}

// server → client (broadcast on new message)
export class MessageCreatedFrameDto {
  @ApiProperty({ example: 'message.created' })
  type!: 'message.created';

  @ApiProperty({ example: 'ch_01' })
  channelId!: string;

  @ApiProperty({ type: MessageDto })
  message!: MessageDto;
}

// server → client (presence)
export class PresenceFrameDto {
  @ApiProperty({ example: 'presence.update' })
  type!: 'presence.update';

  @ApiProperty({ example: 'usr_alice' })
  userId!: string;

  @ApiProperty({ enum: ['online', 'idle', 'offline'], example: 'online' })
  status!: 'online' | 'idle' | 'offline';

  @ApiProperty({ example: '2026-04-23T06:00:30Z' })
  lastSeenAt!: string;
}

// bidirectional (client → typing start; server → someone is typing)
export class TypingFrameDto {
  @ApiProperty({ example: 'typing' })
  type!: 'typing';

  @ApiProperty({ example: 'ch_01' })
  @IsString()
  channelId!: string;

  @ApiProperty({ required: false, example: 'usr_alice', description: 'populated on server broadcasts only' })
  @IsOptional()
  userId?: string;
}
