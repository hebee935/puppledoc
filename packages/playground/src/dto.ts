import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

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
  @ApiProperty({ example: 'ch_01', format: 'ulid', readOnly: true })
  id!: string;

  @ApiProperty({ example: 'general', pattern: '^[a-z0-9-]+$', minLength: 2, maxLength: 40 })
  name!: string;

  @ApiProperty({ example: false })
  isPrivate!: boolean;

  @ApiProperty({ example: 12, minimum: 0 })
  memberCount!: number;

  @ApiPropertyOptional({ example: 'Product design discussion', nullable: true })
  topic?: string | null;

  @ApiProperty({ example: '2026-04-20T09:00:00Z', format: 'date-time', readOnly: true })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2026-04-23T10:00:00Z', format: 'date-time', nullable: true })
  archivedAt?: string | null;
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

export class UpdateChannelDto {
  @ApiPropertyOptional({ example: 'product-redesign', pattern: '^[a-z0-9-]+$' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  name?: string;

  @ApiPropertyOptional({ example: 'Q2 redesign discussion', nullable: true })
  @IsOptional()
  @IsString()
  topic?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class ReplaceChannelDto {
  @ApiProperty({ example: 'product-redesign', pattern: '^[a-z0-9-]+$' })
  @IsString()
  name!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPrivate!: boolean;

  @ApiProperty({ example: 'Q2 redesign discussion' })
  @IsString()
  topic!: string;
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

/* ---------- Users ---------- */

export enum UserRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Guest = 'guest',
}

export class UserDto {
  @ApiProperty({ example: 'usr_alice', readOnly: true })
  id!: string;

  @ApiProperty({ example: 'Alice', minLength: 1, maxLength: 64 })
  name!: string;

  @ApiProperty({ example: 'alice@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole', example: UserRole.Member })
  role!: UserRole;

  @ApiProperty({ example: 'UTC', description: 'IANA timezone identifier' })
  timezone!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/alice.png', format: 'uri', nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({
    example: '2026-01-12T08:00:00Z',
    format: 'date-time',
    readOnly: true,
    deprecated: true,
    description: 'Use `registeredAt` instead — kept for backwards compat.',
  })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-12T08:00:00Z', format: 'date-time', readOnly: true })
  registeredAt!: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Alice K.', minLength: 1, maxLength: 64 })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'alice+new@example.com', format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole, enumName: 'UserRole', example: UserRole.Admin, description: 'Admin-only field.' })
  @IsOptional()
  @IsString()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'Asia/Seoul' })
  @IsOptional()
  @IsString()
  timezone?: string;
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

export class ThumbnailDto {
  @ApiProperty({ example: 320 })
  width!: number;

  @ApiProperty({ example: 180 })
  height!: number;

  @ApiProperty({ example: 'https://cdn.example.com/thumb/xyz.jpg' })
  url!: string;
}

export class MessageAttachmentDto {
  @ApiProperty({ example: 'file_01' })
  id!: string;

  @ApiProperty({ example: 'design-v2.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: 48213, description: 'bytes' })
  size!: number;

  @ApiProperty({ required: false, type: ThumbnailDto })
  @IsOptional()
  thumbnail?: ThumbnailDto;
}

export class MentionDto {
  @ApiProperty({ enum: ['user', 'channel', 'everyone'], example: 'user' })
  type!: 'user' | 'channel' | 'everyone';

  @ApiProperty({ example: 'usr_bob', description: 'Target id; empty for @everyone' })
  targetId!: string;

  @ApiProperty({ example: 7, description: 'Character offset in `text`' })
  offset!: number;

  @ApiProperty({ example: 4 })
  length!: number;
}

export class LinkPreviewDto {
  @ApiProperty({ example: 'https://example.com/post/42' })
  url!: string;

  @ApiProperty({ example: 'How we built realtime' })
  title!: string;

  @ApiProperty({ required: false, example: 'A deep dive into our WebSocket stack.' })
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: ThumbnailDto })
  @IsOptional()
  thumbnail?: ThumbnailDto;
}

export class SentFromDto {
  @ApiProperty({ enum: ['web', 'ios', 'android', 'desktop'], example: 'web' })
  platform!: 'web' | 'ios' | 'android' | 'desktop';

  @ApiProperty({ example: '2.4.0' })
  version!: string;

  @ApiProperty({ required: false, example: 'dev_01HV...' })
  @IsOptional()
  deviceId?: string;
}

export class MessageMetadataDto {
  @ApiProperty({
    required: false,
    example: 'tmp_01HV...',
    description: 'Idempotency key — dedupes retries of the same client-side send',
  })
  @IsOptional()
  @IsString()
  clientMessageId?: string;

  @ApiProperty({ required: false, type: [LinkPreviewDto] })
  @IsOptional()
  @IsArray()
  linkPreviews?: LinkPreviewDto[];

  @ApiProperty({ required: false, type: SentFromDto })
  @IsOptional()
  sentFrom?: SentFromDto;
}

export class ReplyRefDto {
  @ApiProperty({ example: 'msg_01' })
  messageId!: string;

  @ApiProperty({ example: 'Has anyone reviewed the PR?' })
  text!: string;

  @ApiProperty({ example: 'usr_alice' })
  userId!: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'Shipping it tonight 🚀' })
  @IsString()
  text!: string;

  @ApiProperty({
    required: false,
    type: [MessageAttachmentDto],
    description: 'Attach previously uploaded files',
  })
  @IsOptional()
  @IsArray()
  attachments?: MessageAttachmentDto[];

  @ApiProperty({ required: false, type: [MentionDto] })
  @IsOptional()
  @IsArray()
  mentions?: MentionDto[];

  @ApiProperty({ required: false, type: MessageMetadataDto })
  @IsOptional()
  metadata?: MessageMetadataDto;

  @ApiProperty({ required: false, type: ReplyRefDto })
  @IsOptional()
  replyTo?: ReplyRefDto;
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

export class HandshakeQueryDto {
  @ApiProperty({ description: 'JWT signed with the workspace secret.', example: 'eyJhbGciOi…' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Workspace slug. Selects which JWT secret to validate against.', example: 'acme' })
  @IsString()
  workspace!: string;
}
