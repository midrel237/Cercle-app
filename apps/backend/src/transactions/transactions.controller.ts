import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { TransactionsService } from './transactions.service';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /** Ecran 67 - historique groupe par jour, filtre Tout/Cotisations/Prets. */
  @Get('me')
  myHistory(
    @CurrentUser() user: JwtPayload,
    @Query('filter') filter?: 'ALL' | 'CONTRIBUTIONS' | 'LOANS',
  ) {
    return this.transactionsService.historyForUser(user.sub, { filter });
  }

  @Get('group/:groupId')
  groupHistory(@Param('groupId') groupId: string) {
    return this.transactionsService.historyForGroup(groupId);
  }

  /** Ecran 68 - detail d'une de SES transactions (vue securisee). */
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transactionsService.findOneForUser(id, user.sub);
  }
}
