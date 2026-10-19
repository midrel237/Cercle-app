import {
  Controller,
  Get,
  Header,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { JwtQueryAuthGuard } from '../common/guards/jwt-query-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { StatementsService } from './statements.service';

/**
 * Ecran 69 — releve PDF d'un groupe. Le lien est ouvert depuis l'app via
 * expo-web-browser (navigateur systeme) : le JWT d'acces passe donc en
 * query param `token` (cf. jwt-query.strategy.ts), TTL court.
 */
@UseGuards(JwtQueryAuthGuard)
@Controller('statements')
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get('group/:groupId.pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="releve-cercle.pdf"')
  async groupStatement(
    @CurrentUser() user: JwtPayload,
    @Param('groupId') groupId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.statements.buildGroupStatementPdf(groupId, user.sub);
    return new StreamableFile(pdf);
  }
}
