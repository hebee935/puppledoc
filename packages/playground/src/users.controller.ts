import { Body, Controller, Delete, Get, Headers, HttpCode, NotFoundException, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto, UpdateMeDto, UserDto, UserRole } from './dto';

@ApiTags('Workspace/Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private users: UserDto[] = [
    {
      id: 'usr_alice',
      name: 'Alice',
      email: 'alice@example.com',
      role: UserRole.Owner,
      timezone: 'UTC',
      avatarUrl: 'https://cdn.example.com/avatars/alice.png',
      createdAt: '2026-01-12T08:00:00Z',
      registeredAt: '2026-01-12T08:00:00Z',
    },
    {
      id: 'usr_bob',
      name: 'Bob',
      email: 'bob@example.com',
      role: UserRole.Member,
      timezone: 'Asia/Seoul',
      avatarUrl: null,
      createdAt: '2026-02-03T10:20:00Z',
      registeredAt: '2026-02-03T10:20:00Z',
    },
  ];

  @Get('me')
  @ApiOperation({
    summary: 'Get the authenticated user',
    description: 'Returns the profile tied to the bearer token.',
  })
  @ApiHeader({
    name: 'X-Request-Id',
    required: false,
    description: 'Client correlation id, echoed back in the response headers.',
    example: 'req_01HV...',
  })
  @ApiOkResponse({ type: UserDto })
  me(@Headers('x-request-id') _reqId?: string): UserDto {
    return this.users[0]!;
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update my profile',
    description: 'Only the provided fields are updated. `role` requires admin privileges.',
  })
  @ApiOkResponse({ type: UserDto })
  updateMe(@Body() dto: UpdateMeDto): UserDto {
    const u = this.users[0]!;
    if (dto.name !== undefined) u.name = dto.name;
    if (dto.email !== undefined) u.email = dto.email;
    if (dto.role !== undefined) u.role = dto.role;
    if (dto.timezone !== undefined) u.timezone = dto.timezone;
    return u;
  }

  @Delete('me/sessions')
  @ApiOperation({
    summary: 'Sign out everywhere',
    description: 'Revokes every active session for the current user — the request itself included.',
  })
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'All sessions revoked.' })
  signOutAll(): void {
    return;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', example: 'usr_alice', description: 'Prefixed identifier (`usr_…`).' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'No user with that id.' })
  get(@Param('id') id: string): UserDto {
    const u = this.users.find((x) => x.id === id);
    if (!u) throw new NotFoundException({ error: 'not_found', message: `User ${id} not found.` });
    return u;
  }
}
