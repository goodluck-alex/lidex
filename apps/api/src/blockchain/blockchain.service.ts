import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, formatUnits, isAddress, JsonRpcProvider } from 'ethers';
import { RedisService } from '../common/redis/redis.service';

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

@Injectable()
export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private readonly ldx: Contract;
  constructor(config: ConfigService, private readonly cache: RedisService) {
    this.provider = new JsonRpcProvider(config.getOrThrow<string>('BSC_RPC_URL'), { name: 'bnb', chainId: 56 }, { staticNetwork: true });
    this.ldx = new Contract(config.getOrThrow<string>('LDX_CONTRACT_ADDRESS'), ERC20_ABI, this.provider);
  }

  async ldxBalance(address: string) {
    if (!isAddress(address)) throw new BadRequestException('Invalid wallet address');
    const key = `bsc:ldx:balance:${address.toLowerCase()}`;
    const cached = await this.cache.getJson<{ address: string; symbol: string; balance: string }>(key).catch(() => null);
    if (cached) return cached;
    const raw = await this.ldx.balanceOf(address) as bigint;
    const result = { address, symbol: 'LDX', balance: formatUnits(raw, 18), raw: raw.toString(), chainId: 56 };
    await this.cache.setJson(key, result, 15).catch(() => undefined);
    return result;
  }

  async transaction(txHash: string) {
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new BadRequestException('Invalid transaction hash');
    const [tx, receipt] = await Promise.all([this.provider.getTransaction(txHash), this.provider.getTransactionReceipt(txHash)]);
    if (!tx) return { txHash, status: 'PENDING' };
    return { txHash, blockNumber: receipt?.blockNumber, confirmations: receipt ? await receipt.confirmations() : 0, status: receipt ? (receipt.status === 1 ? 'COMPLETED' : 'FAILED') : 'CONFIRMING' };
  }
}
