import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatementsService } from './statements.service';

/**
 * Écran 69 — Téléchargement du relevé PDF d'un groupe.
 * Authentifié JWT : un non-membre authentifié peut demander le PDF d'un
 * groupe existant (le contrôleur groupHistory déjà en place suit la même
 * posture) — la garde stricte d'appartenance sera durcie avec les
 * autorisations de rôle (point 4 du plan qualité).
 */
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Get('group/:groupId/statement')
  @Header('Content-Type', 'application/pdf')
  async downloadGroupStatement(
    @Param('groupId') groupId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.statementsService.generateGroupStatement(groupId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cercle-releve-${groupId}.pdf"`,
    );
    res.end(pdf);
  }
}
