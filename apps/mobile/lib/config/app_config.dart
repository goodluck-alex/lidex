abstract final class AppConfig {
  static const appName = 'Lidex';
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );
  static const bscRpcUrl = String.fromEnvironment(
    'BSC_RPC_URL',
    defaultValue: 'https://bsc-dataseed.binance.org',
  );
  static const ldxContract = '0x567A4F63f6838005e104C053fc24a3510b0432E1';
  static const bscChainId = 56;
  static const pointsPerLdx = 100;
  static const monthlyUnlockRate = .20;
}
