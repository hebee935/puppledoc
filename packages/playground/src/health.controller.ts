import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';

export class HealthStatusDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 1240, description: 'seconds since process start' })
  uptime!: number;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: '2026-04-23T06:00:00Z' })
  time!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  @ApiOkResponse({ type: HealthStatusDto })
  status(): HealthStatusDto {
    return {
      status: 'ok',
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: '0.1.0',
      time: new Date().toISOString(),
    };
  }
}
