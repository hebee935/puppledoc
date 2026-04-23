import { Body, ConflictException, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChannelDto, CreateChannelDto, ErrorResponseDto, ListChannelsQuery } from './dto';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  private channels: ChannelDto[] = [
    { id: 'ch_01', name: 'general', isPrivate: false, memberCount: 12, createdAt: '2026-04-20T09:00:00Z' },
    { id: 'ch_02', name: 'engineering', isPrivate: false, memberCount: 8, createdAt: '2026-04-21T10:15:00Z' },
    { id: 'ch_03', name: 'random', isPrivate: false, memberCount: 15, createdAt: '2026-04-21T14:30:00Z' },
  ];

  @Get()
  @ApiResponse({ status: 200, type: ChannelDto, isArray: true })
  list(@Query() _q: ListChannelsQuery): { data: ChannelDto[]; nextCursor: string | null } {
    return { data: this.channels, nextCursor: null };
  }

  @Post()
  @ApiResponse({ status: 201, type: ChannelDto })
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
      createdAt: new Date().toISOString(),
    };
    this.channels.push(ch);
    return ch;
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ChannelDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'No channel with that id.' })
  get(@Param('id') id: string): ChannelDto {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw new NotFoundException({ error: 'not_found', message: `Channel ${id} not found.` });
    return ch;
  }
}
