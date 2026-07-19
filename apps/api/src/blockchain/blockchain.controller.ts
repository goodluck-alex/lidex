import { Controller, Get, Param } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
@Controller({ path: 'blockchain', version: '1' })
export class BlockchainController {
  constructor(private readonly blockchain: BlockchainService) {}
  @Get('bsc/ldx/:address/balance') balance(@Param('address') address: string) { return this.blockchain.ldxBalance(address); }
  @Get('bsc/transactions/:hash') transaction(@Param('hash') hash: string) { return this.blockchain.transaction(hash); }
}
