import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

export enum TicketStatus {
  Open = 'open',
  Pending = 'pending',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum TicketPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

export class TicketDto {
  @ApiProperty({ example: 'tk_01HVABCDXYZ' })
  id!: string;

  @ApiProperty({ example: 'Widget renders blank on Safari 17' })
  subject!: string;

  // Inline enum: viewer's auto-lift turns this into a clickable `Status` model link.
  @ApiProperty({ enum: TicketStatus, example: TicketStatus.Open })
  status!: TicketStatus;

  // Named enum: already linkable without auto-lift.
  @ApiProperty({ enum: TicketPriority, enumName: 'TicketPriority', example: TicketPriority.Normal })
  priority!: TicketPriority;

  @ApiProperty({ example: '2026-05-08T01:00:00Z', format: 'date-time' })
  createdAt!: string;
}

const TICKETS: TicketDto[] = [
  {
    id: 'tk_01HVABCDXYZ',
    subject: 'Widget renders blank on Safari 17',
    status: TicketStatus.Open,
    priority: TicketPriority.High,
    createdAt: '2026-05-08T01:00:00Z',
  },
  {
    id: 'tk_02HVABCEFGH',
    subject: 'Cannot upload images > 10MB',
    status: TicketStatus.Pending,
    priority: TicketPriority.Normal,
    createdAt: '2026-05-07T22:30:00Z',
  },
  {
    id: 'tk_03HVABCIJKL',
    subject: 'Typo in onboarding email',
    status: TicketStatus.Resolved,
    priority: TicketPriority.Low,
    createdAt: '2026-05-06T14:00:00Z',
  },
];

/**
 * Smoke-test surface for enum-typed GETs:
 *   - Inline enum on query (`status`) — exercises auto-lift + select input.
 *   - Named enum on query (`priority`) — exercises pre-named $ref path.
 *   - Inline enum on path (`/:status/count`) — exercises path-param select input.
 *   - Inline enum on a response field (`status`) — exercises EnumValues + Models link.
 */
@ApiTags('Support')
@Controller('support/tickets')
export class SupportController {
  @Get()
  @ApiOperation({
    summary: 'List support tickets',
    description: 'Filter by status and/or priority. Both filters are enum-typed query params.',
  })
  @ApiQuery({ name: 'status', enum: TicketStatus, required: false })
  @ApiQuery({ name: 'priority', enum: TicketPriority, enumName: 'TicketPriority', required: false })
  @ApiOkResponse({ type: [TicketDto] })
  list(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
  ): TicketDto[] {
    return TICKETS.filter(
      (t) => (!status || t.status === status) && (!priority || t.priority === priority),
    );
  }

  @Get(':status/count')
  @ApiOperation({
    summary: 'Count tickets in a given status',
    description: 'Inline-enum **path** parameter — should surface as a select input in the tester.',
  })
  @ApiParam({ name: 'status', enum: TicketStatus })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(TicketStatus) },
        count: { type: 'integer' },
      },
      required: ['status', 'count'],
    },
  })
  count(@Param('status') status: TicketStatus): { status: TicketStatus; count: number } {
    return { status, count: TICKETS.filter((t) => t.status === status).length };
  }
}
