import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

/** UC-16 (Gestionar catálogo de skills) — administración, CRUD completo. */
@UseGuards(JwtAuthGuard)
@Controller('admin/skills')
export class SkillsAdminController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async listar() {
    return this.skillsService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.obtener(id);
  }

  @Post()
  async crear(@Req() req: AuthenticatedRequest, @Body() dto: CreateSkillDto) {
    return this.skillsService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.skillsService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.skillsService.eliminar(id);
    return { eliminado: true };
  }
}
