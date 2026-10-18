import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { LoansService } from './loans.service';
import { RequestLoanDto } from './dto/request-loan.dto';
import { VoteLoanDto } from './dto/vote-loan.dto';

@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  /** Écran 58 — demander un prêt (échéancier prévisionnel renvoyé). */
  @Post()
  request(@CurrentUser() user: JwtPayload, @Body() dto: RequestLoanDto) {
    return this.loansService.request(user.sub, dto);
  }

  /** Écran 57 — mes prêts (actifs + soldés, tous groupes). */
  @Get('me')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.loansService.findMine(user.sub);
  }

  /** Écran 59 — voter sur une demande de prêt. */
  @Post(':id/vote')
  vote(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: VoteLoanDto) {
    return this.loansService.vote(id, user.sub, dto.approve);
  }

  /** Prêts d'un groupe (votes inclus — écran 59 pour les validateurs). */
  @Get('group/:groupId')
  findForGroup(@Param('groupId') groupId: string) {
    return this.loansService.findForGroup(groupId);
  }

  /** Détail d'un prêt (écrans 59/60/61/64). */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  /** Écran 63 — signature du contrat par l'emprunteur. */
  @Post(':id/sign')
  signContract(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loansService.signContract(id, user.sub);
  }

  /** Écran 65 — préparer le remboursement d'une échéance (transaction PENDING). */
  @Post(':id/repay')
  prepareRepayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('installment') installment: string,
  ) {
    return this.loansService.prepareRepayment(id, user.sub, Number(installment));
  }
}
