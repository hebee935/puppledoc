import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Options,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ChannelDto,
  CreateChannelDto,
  ErrorResponseDto,
  ListChannelsQuery,
  ReplaceChannelDto,
  UpdateChannelDto,
} from './dto';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  private channels: ChannelDto[] = [
    { id: 'ch_01', name: 'general',     isPrivate: false, memberCount: 12, topic: 'Daily chatter',     createdAt: '2026-04-20T09:00:00Z', archivedAt: null },
    { id: 'ch_02', name: 'engineering', isPrivate: false, memberCount: 8,  topic: 'Platform & infra',  createdAt: '2026-04-21T10:15:00Z', archivedAt: null },
    { id: 'ch_03', name: 'random',      isPrivate: false, memberCount: 15, topic: null,                createdAt: '2026-04-21T14:30:00Z', archivedAt: null },
  ];

  @Get()
  @ApiOperation({
    summary: 'List channels',
    description: 'Returns all channels the caller has access to. Use `cursor` to paginate.',
  })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: '1–100' })
  @ApiQuery({ name: 'cursor', type: String, required: false, example: 'ch_01' })
  @ApiOkResponse({ type: ChannelDto, isArray: true })
  list(@Query() _q: ListChannelsQuery): { data: ChannelDto[]; nextCursor: string | null } {
    return { data: this.channels, nextCursor: null };
  }

  @Post()
  @ApiOperation({ summary: 'Create a channel' })
  @ApiCreatedResponse({ type: ChannelDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid payload (e.g. name fails regex).' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'A channel with that name already exists.' })
  create(@Body() dto: CreateChannelDto): ChannelDto {
    if (this.channels.some((c) => c.name === dto.name)) {
      throw new ConflictException({ error: 'name_taken', message: `Channel "${dto.name}" already exists.` });
    }
    const ch: ChannelDto = {
      id: `ch_${Date.now().toString(36)}`,
      name: dto.name,
      isPrivate: dto.isPrivate ?? false,
      memberCount: 1,
      topic: dto.topic ?? null,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    this.channels.push(ch);
    return ch;
  }

  @Options()
  @ApiOperation({ summary: 'CORS preflight', description: 'Returns the methods and headers allowed on `/channels`.' })
  @Header('Allow', 'GET, POST, OPTIONS')
  @Header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  @ApiNoContentResponse({ description: 'Headers only — no body.' })
  @HttpCode(204)
  preflight(): void {
    return;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a channel by id' })
  @ApiParam({ name: 'id', example: 'ch_01', description: 'Channel id (ULID prefixed with `ch_`).' })
  @ApiOkResponse({ type: ChannelDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'No channel with that id.' })
  get(@Param('id') id: string): ChannelDto {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw new NotFoundException({ error: 'not_found', message: `Channel ${id} not found.` });
    return ch;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a channel (partial)',
    description: 'Only provided fields are mutated. Returns the full, updated channel.',
  })
  @ApiParam({ name: 'id', example: 'ch_01' })
  @ApiOkResponse({ type: ChannelDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  patch(@Param('id') id: string, @Body() dto: UpdateChannelDto): ChannelDto {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw new NotFoundException({ error: 'not_found', message: `Channel ${id} not found.` });
    if (dto.name !== undefined) ch.name = dto.name;
    if (dto.topic !== undefined) ch.topic = dto.topic;
    if (dto.isPrivate !== undefined) ch.isPrivate = dto.isPrivate;
    return ch;
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Replace a channel',
    description: 'Full replace — all mutable fields required. Prefer PATCH for partial updates.',
    deprecated: true,
  })
  @ApiParam({ name: 'id', example: 'ch_01' })
  @ApiOkResponse({ type: ChannelDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  replace(@Param('id') id: string, @Body() dto: ReplaceChannelDto): ChannelDto {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw new NotFoundException({ error: 'not_found', message: `Channel ${id} not found.` });
    ch.name = dto.name;
    ch.isPrivate = dto.isPrivate;
    ch.topic = dto.topic;
    return ch;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a channel', description: 'Soft-deletes by setting `archivedAt`. Messages stay accessible.' })
  @ApiParam({ name: 'id', example: 'ch_01' })
  @ApiOkResponse({ type: ChannelDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  archive(@Param('id') id: string): ChannelDto {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw new NotFoundException({ error: 'not_found', message: `Channel ${id} not found.` });
    ch.archivedAt = new Date().toISOString();
    return ch;
  }
}
