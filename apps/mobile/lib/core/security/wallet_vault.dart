import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:bip32/bip32.dart' as bip32;
import 'package:bip39/bip39.dart' as bip39;
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:local_auth/local_auth.dart';
import 'package:web3dart/web3dart.dart';

class CreatedWallet {
  const CreatedWallet({required this.mnemonic, required this.address});
  final String mnemonic;
  final String address;
}

/// Non-custodial vault. Recovery material is generated on-device, AES-GCM
/// encrypted before persistence, and can only be decrypted with the master key
/// held by Keychain/Android Keystore through FlutterSecureStorage.
class WalletVault {
  WalletVault(this._secureStorage, this._localAuth);

  static const _masterKeyName = 'lidex.wallet.master-key.v1';
  static const _walletBox = 'encrypted_wallets';
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;
  final AesGcm _cipher = AesGcm.with256bits();

  Future<CreatedWallet> generateWallet() async {
    final mnemonic = bip39.generateMnemonic(strength: 128);
    final credentials = EthPrivateKey(_derivePrivateKey(mnemonic));
    return CreatedWallet(mnemonic: mnemonic, address: credentials.address.hexEip55);
  }

  Future<CreatedWallet> createWallet({String name = 'Main Wallet'}) async {
    final generated = await generateWallet();
    return importWallet(generated.mnemonic, name: name);
  }

  Future<CreatedWallet> importWallet(String words, {String name = 'Imported Wallet'}) async {
    final mnemonic = words.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    if (!bip39.validateMnemonic(mnemonic)) {
      throw const FormatException('Invalid BIP-39 recovery phrase.');
    }
    final privateKey = _derivePrivateKey(mnemonic);
    final credentials = EthPrivateKey(privateKey);
    final address = credentials.address.hexEip55;
    final encryptedPhrase = await _seal(mnemonic);
    final encryptedKey = await _seal(base64Encode(privateKey));
    final box = Hive.box<String>(_walletBox);
    await box.put(address, jsonEncode({
      'name': name,
      'address': address,
      'phrase': encryptedPhrase,
      'privateKey': encryptedKey,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    }));
    return CreatedWallet(mnemonic: mnemonic, address: address);
  }

  Future<EthPrivateKey> readCredentials(String address, {bool authenticate = true}) async {
    if (authenticate) {
      final supported = await _localAuth.isDeviceSupported();
      if (supported) {
        final ok = await _localAuth.authenticate(
          localizedReason: 'Unlock your Lidex wallet',
          options: const AuthenticationOptions(biometricOnly: false, stickyAuth: true),
        );
        if (!ok) throw StateError('Wallet unlock was cancelled.');
      }
    }
    final raw = Hive.box<String>(_walletBox).get(address);
    if (raw == null) throw StateError('Wallet not found.');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final key = base64Decode(await _open(data['privateKey'] as String));
    return EthPrivateKey(Uint8List.fromList(key));
  }

  List<Map<String, dynamic>> listWallets() => Hive.box<String>(_walletBox)
      .values
      .map((value) => jsonDecode(value) as Map<String, dynamic>)
      .map((item) => {...item}..remove('phrase')..remove('privateKey'))
      .toList(growable: false);

  Uint8List _derivePrivateKey(String mnemonic) {
    final seed = bip39.mnemonicToSeed(mnemonic);
    final child = bip32.BIP32.fromSeed(seed).derivePath("m/44'/60'/0'/0/0");
    final key = child.privateKey;
    if (key == null) throw StateError('Unable to derive private key.');
    return key;
  }

  Future<SecretKey> _masterKey() async {
    var encoded = await _secureStorage.read(key: _masterKeyName);
    if (encoded == null) {
      final random = Random.secure();
      final bytes = List<int>.generate(32, (_) => random.nextInt(256));
      encoded = base64Encode(bytes);
      await _secureStorage.write(key: _masterKeyName, value: encoded);
    }
    return SecretKey(base64Decode(encoded));
  }

  Future<String> _seal(String value) async {
    final secretBox = await _cipher.encrypt(utf8.encode(value), secretKey: await _masterKey());
    return jsonEncode({
      'nonce': base64Encode(secretBox.nonce),
      'cipherText': base64Encode(secretBox.cipherText),
      'mac': base64Encode(secretBox.mac.bytes),
    });
  }

  Future<String> _open(String payload) async {
    final data = jsonDecode(payload) as Map<String, dynamic>;
    final secretBox = SecretBox(
      base64Decode(data['cipherText'] as String),
      nonce: base64Decode(data['nonce'] as String),
      mac: Mac(base64Decode(data['mac'] as String)),
    );
    final clear = await _cipher.decrypt(secretBox, secretKey: await _masterKey());
    return utf8.decode(clear);
  }
}
