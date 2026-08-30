import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

  @Post()
  request(@CurrentUser() user: JwtPayload, @Body() dto: RequestLoanDto) {
    return this.loansService.request(user.sub, dto);
  }

  @Post(':id/vote')
  vote(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: VoteLoanDto) {
    return this.loansService.vote(id, user.sub, dto.approve);
  }

  @Get('group/:groupId')
  findForGroup(@Param('groupId') groupId: string) {
    return this.loansService.findForGroup(groupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }
}
