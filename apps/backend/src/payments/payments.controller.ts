import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaymentsService } from './payments.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(@CurrentUser() user: JwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.phoneNumber, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('methods')
  listMethods(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.listPaymentMethods(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('methods')
  addMethod(@CurrentUser() user: JwtPayload, @Body() dto: AddPaymentMethodDto) {
    return this.paymentsService.addPaymentMethod(user.sub, dto);
  }

  /** Webhook public (authentifié par signature, pas par JWT utilisateur). */
  @Post('webhook')
  webhook(
    @Headers('x-signature') signature: string,
    @Body() body: { transactionId: string; externalReference: string; status: 'confirmed' | 'failed' },
  ) {
    return this.paymentsService.handleWebhook(JSON.stringify(body), signature, body);
  }
}
