import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:lidex_network/core/blockchain/ldx_client.dart';
import 'package:lidex_network/core/network/api_client.dart';
import 'package:lidex_network/core/security/wallet_vault.dart';
import 'package:local_auth/local_auth.dart';

final secureStorageProvider = Provider((_) => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ));
final apiClientProvider = Provider((ref) => ApiClient(ref.watch(secureStorageProvider)));
final walletVaultProvider = Provider((ref) => WalletVault(ref.watch(secureStorageProvider), LocalAuthentication()));
final ldxClientProvider = Provider((ref) {
  final client = LdxClient();
  ref.onDispose(client.dispose);
  return client;
});
final themeModeProvider = StateProvider<ThemeMode>((_) => ThemeMode.system);
