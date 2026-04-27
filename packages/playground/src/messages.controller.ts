import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Send } from '@puppledoc/nestjs-api-reference';
import { ChatGateway } from './chat.gateway';
import {
  AttachmentDto,
  ErrorResponseDto,
  ListMessagesQuery,
  MessageCreatedFrameDto,
  MessageDto,
  SendMessageDto,
} from './dto';

// Narrow multer file shape we actually use — avoids pulling @types/multer into tsc.
interface UploadedFileShape {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Workspace/Content/Messages')
@ApiBearerAuth()
@Controller()
// Document WS frames emitted from this controller's flow. The `channel` ref
// tells the scanner to file the event under ChatGateway's `/realtime` URL.
@Send({
  channel: ChatGateway,
  event: 'message.created',
  payload: MessageCreatedFrameDto,
  summary: 'Broadcast after a message is created via REST or WS',
})
export class MessagesController {
  private messages: MessageDto[] = [
    {
      id: 'msg_01',
      channelId: 'ch_01',
      userId: 'usr_alice',
      text: 'Has anyone reviewed the PR?',
      createdAt: '2026-04-23T05:48:00Z',
    },
    {
      id: 'msg_02',
      channelId: 'ch_01',
      userId: 'usr_bob',
      text: 'On it — merging in 10 min.',
      createdAt: '2026-04-23T05:50:12Z',
    },
  ];

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'List messages in a channel', description: 'Returns messages newest-first. Use `before` to paginate earlier.' })
  @ApiResponse({ status: 200, type: MessageDto, isArray: true })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Channel does not exist.' })
  list(
    @Param('channelId') channelId: string,
    @Query() _q: ListMessagesQuery,
  ): { data: MessageDto[] } {
    return { data: this.messages.filter((m) => m.channelId === channelId) };
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Post a message', description: 'Also broadcast over WebSocket as `message.created`.' })
  @ApiResponse({ status: 201, type: MessageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Channel does not exist.' })
  send(@Param('channelId') channelId: string, @Body() dto: SendMessageDto): MessageDto {
    const msg: MessageDto = {
      id: `msg_${Date.now().toString(36)}`,
      channelId,
      userId: 'usr_alice',
      text: dto.text,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(msg);
    return msg;
  }

  @Post('channels/:channelId/attachments')
  @ApiOperation({ summary: 'Upload an attachment', description: 'Upload a file to be referenced by later messages in this channel.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a file to attach to a message.',
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Binary file payload' },
        caption: { type: 'string', description: 'Optional caption rendered with the attachment', example: 'design v2' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, type: AttachmentDto })
  upload(
    @Param('channelId') _channelId: string,
    @UploadedFile() file: UploadedFileShape | undefined,
    @Body('caption') _caption: string | undefined,
  ): AttachmentDto {
    return {
      id: `file_${Date.now().toString(36)}`,
      filename: file?.originalname ?? 'unnamed',
      contentType: file?.mimetype ?? 'application/octet-stream',
      size: file?.size ?? 0,
      url: `https://cdn.example.com/attachments/file_${Date.now().toString(36)}`,
    };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message', description: 'Only the author can delete their own messages.' })
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'No message with that id.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You can only delete your own messages.' })
  remove(@Param('id') id: string): void {
    const m = this.messages.find((x) => x.id === id);
    if (!m) throw new NotFoundException({ error: 'not_found', message: `Message ${id} not found.` });
    if (m.userId !== 'usr_alice') {
      throw new ForbiddenException({ error: 'forbidden', message: 'Only the author can delete this message.' });
    }
    this.messages = this.messages.filter((x) => x.id !== id);
  }
}
