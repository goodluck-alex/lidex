import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:lidex_network/config/app_config.dart';
import 'package:lidex_network/models/app_models.dart';

@immutable
class GlobalMarketStats {
  const GlobalMarketStats({
    required this.totalMarketCapUsd,
    required this.totalVolume24hUsd,
    required this.btcDominance,
    required this.marketCapChange24h,
    required this.activeCryptos,
    required this.updatedAt,
  });

  final double totalMarketCapUsd;
  final double totalVolume24hUsd;
  final double btcDominance;
  final double marketCapChange24h;
  final int activeCryptos;
  final DateTime updatedAt;
}

class MarketDataService {
  static const _coinGeckoBase = 'https://api.coingecko.com/api/v3';
  static const _trackedAssets = <_TrackedAsset>[
    _TrackedAsset('BTC', 'Bitcoin', 'bitcoin', Color(0xFFF59E0B), .03134),
    _TrackedAsset('ETH', 'Ethereum', 'ethereum', Color(0xFF4B5563), .8456),
    _TrackedAsset('BNB', 'BNB Smart Chain', 'binancecoin', Color(0xFFF3BA2F), 2.1245),
    _TrackedAsset('SOL', 'Solana', 'solana', Color(0xFF6D28D9), 4.24),
    _TrackedAsset('LDX', 'Lidex Token', null, Color(0xFF008A4B), 10250),
  ];

  Future<List<CryptoAsset>> fetchAssets() async {
    final coinIds = _trackedAssets.where((a) => a.coinGeckoId != null).map((a) => a.coinGeckoId!).join(',');
    final uri = Uri.parse('$_coinGeckoBase/simple/price?ids=$coinIds&vs_currencies=usd&include_24hr_change=true');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) throw MarketDataException('Price feed unavailable (${response.statusCode})');

    final prices = jsonDecode(response.body) as Map<String, dynamic>;
    final ldxQuote = await _fetchLdxQuote();

    return _trackedAssets.map((tracked) {
      if (tracked.symbol == 'LDX') {
        return CryptoAsset(
          symbol: tracked.symbol,
          name: tracked.name,
          price: ldxQuote?.price ?? DemoData.assets.firstWhere((a) => a.symbol == 'LDX').price,
          change: ldxQuote?.change ?? DemoData.assets.firstWhere((a) => a.symbol == 'LDX').change,
          balance: tracked.balance,
          color: tracked.color,
        );
      }
      final quote = prices[tracked.coinGeckoId!] as Map<String, dynamic>?;
      if (quote == null) {
        final fallback = DemoData.assets.firstWhere((a) => a.symbol == tracked.symbol);
        return CryptoAsset(
          symbol: tracked.symbol,
          name: tracked.name,
          price: fallback.price,
          change: fallback.change,
          balance: tracked.balance,
          color: tracked.color,
        );
      }
      return CryptoAsset(
        symbol: tracked.symbol,
        name: tracked.name,
        price: (quote['usd'] as num).toDouble(),
        change: (quote['usd_24h_change'] as num?)?.toDouble() ?? 0,
        balance: tracked.balance,
        color: tracked.color,
      );
    }).toList(growable: false);
  }

  Future<GlobalMarketStats> fetchGlobalStats() async {
    final uri = Uri.parse('$_coinGeckoBase/global');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) throw MarketDataException('Global stats unavailable (${response.statusCode})');

    final data = jsonDecode(response.body)['data'] as Map<String, dynamic>;
    return GlobalMarketStats(
      totalMarketCapUsd: (data['total_market_cap']?['usd'] as num?)?.toDouble() ?? 0,
      totalVolume24hUsd: (data['total_volume']?['usd'] as num?)?.toDouble() ?? 0,
      btcDominance: (data['market_cap_percentage']?['btc'] as num?)?.toDouble() ?? 0,
      marketCapChange24h: (data['market_cap_change_percentage_24h_usd'] as num?)?.toDouble() ?? 0,
      activeCryptos: (data['active_cryptocurrencies'] as num?)?.toInt() ?? 0,
      updatedAt: DateTime.now(),
    );
  }

  Future<_LdxQuote?> _fetchLdxQuote() async {
    try {
      final uri = Uri.parse('https://api.dexscreener.com/latest/dex/tokens/${AppConfig.ldxContract}');
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) return null;
      final pairs = (jsonDecode(response.body)['pairs'] as List<dynamic>?) ?? const [];
      if (pairs.isEmpty) return null;
      final best = pairs.first as Map<String, dynamic>;
      final price = double.tryParse(best['priceUsd']?.toString() ?? '');
      if (price == null) return null;
      final change = (best['priceChange']?['h24'] as num?)?.toDouble() ?? 0;
      return _LdxQuote(price: price, change: change);
    } catch (_) {
      return null;
    }
  }
}

class MarketDataException implements Exception {
  MarketDataException(this.message);
  final String message;
  @override
  String toString() => message;
}

class _TrackedAsset {
  const _TrackedAsset(this.symbol, this.name, this.coinGeckoId, this.color, this.balance);
  final String symbol;
  final String name;
  final String? coinGeckoId;
  final Color color;
  final double balance;
}

class _LdxQuote {
  const _LdxQuote({required this.price, required this.change});
  final double price;
  final double change;
}
