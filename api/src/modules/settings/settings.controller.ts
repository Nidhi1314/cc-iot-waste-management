import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { z } from 'zod';

import { JwtGuard } from '../../common/guards/jwt.guards';

import { Roles } from '../../common/decorators/roles.decorator';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { SettingsService } from './settings.service';

const updateSettingsSchema = z
  .object({
    fillThreshold: z.number().int().min(10).max(100).optional(),

    maxWasteAgeHours: z.number().int().min(1).max(72).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.fillThreshold !== undefined || value.maxWasteAgeHours !== undefined,
    {
      message: 'Provide at least one setting',
    },
  );

type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;

@Controller('settings')
@UseGuards(JwtGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('ADMIN')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles('ADMIN')
  updateSettings(
    @Body(new ZodValidationPipe(updateSettingsSchema))
    dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(dto);
  }
}
