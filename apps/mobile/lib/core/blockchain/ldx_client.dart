import 'dart:math';

import 'package:http/http.dart';
import 'package:lidex_network/config/app_config.dart';
import 'package:web3dart/web3dart.dart';

class LdxClient {
  LdxClient({Client? httpClient})
      : _client = Web3Client(AppConfig.bscRpcUrl, httpClient ?? Client()),
        _contract = DeployedContract(
          ContractAbi.fromJson(_erc20Abi, 'LidexToken'),
          EthereumAddress.fromHex(AppConfig.ldxContract),
        );

  final Web3Client _client;
  final DeployedContract _contract;
  static const decimals = 18;

  Future<BigInt> rawBalance(String address) async {
    final result = await _client.call(
      contract: _contract,
      function: _contract.function('balanceOf'),
      params: [EthereumAddress.fromHex(address)],
    );
    return result.first as BigInt;
  }

  Future<double> balance(String address) async =>
      (await rawBalance(address)).toDouble() / pow(10, decimals);

  Future<String> transfer({
    required EthPrivateKey credentials,
    required String recipient,
    required String decimalAmount,
  }) async {
    final amount = _parseUnits(decimalAmount, decimals);
    if (amount <= BigInt.zero) throw ArgumentError.value(decimalAmount, 'amount');
    return _client.sendTransaction(
      credentials,
      Transaction.callContract(
        contract: _contract,
        function: _contract.function('transfer'),
        parameters: [EthereumAddress.fromHex(recipient), amount],
      ),
      chainId: AppConfig.bscChainId,
      fetchChainIdFromNetworkId: false,
    );
  }

  BigInt _parseUnits(String input, int precision) {
    final parts = input.trim().split('.');
    if (parts.length > 2 || !RegExp(r'^\d+$').hasMatch(parts.first)) {
      throw const FormatException('Invalid token amount.');
    }
    final fraction = parts.length == 2 ? parts[1] : '';
    if (fraction.length > precision || (fraction.isNotEmpty && !RegExp(r'^\d+$').hasMatch(fraction))) {
      throw const FormatException('Too many decimal places.');
    }
    return BigInt.parse(parts.first) * BigInt.from(10).pow(precision) +
        BigInt.parse((fraction.padRight(precision, '0')).isEmpty ? '0' : fraction.padRight(precision, '0'));
  }

  void dispose() => _client.dispose();
}

const _erc20Abi = '''[
  {"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
  {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}
]''';
