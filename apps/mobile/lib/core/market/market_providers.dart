import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lidex_network/core/market/market_data_service.dart';
import 'package:lidex_network/models/app_models.dart';

final marketDataServiceProvider = Provider((_) => MarketDataService());

final marketAssetsProvider = AsyncNotifierProvider<MarketAssetsNotifier, List<CryptoAsset>>(MarketAssetsNotifier.new);

final globalMarketStatsProvider = AsyncNotifierProvider<GlobalMarketStatsNotifier, GlobalMarketStats>(GlobalMarketStatsNotifier.new);

class MarketAssetsNotifier extends AsyncNotifier<List<CryptoAsset>> {
  Timer? _timer;

  @override
  Future<List<CryptoAsset>> build() async {
    ref.onDispose(() => _timer?.cancel());
    _timer ??= Timer.periodic(const Duration(seconds: 45), (_) => ref.invalidateSelf());
    return ref.read(marketDataServiceProvider).fetchAssets();
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<CryptoAsset>>().copyWithPrevious(state);
    state = await AsyncValue.guard(ref.read(marketDataServiceProvider).fetchAssets);
  }
}

class GlobalMarketStatsNotifier extends AsyncNotifier<GlobalMarketStats> {
  Timer? _timer;

  @override
  Future<GlobalMarketStats> build() async {
    ref.onDispose(() => _timer?.cancel());
    _timer ??= Timer.periodic(const Duration(minutes: 2), (_) => ref.invalidateSelf());
    return ref.read(marketDataServiceProvider).fetchGlobalStats();
  }

  Future<void> refresh() async {
    state = const AsyncLoading<GlobalMarketStats>().copyWithPrevious(state);
    state = await AsyncValue.guard(ref.read(marketDataServiceProvider).fetchGlobalStats);
  }
}

Future<void> refreshMarketData(WidgetRef ref) async {
  await Future.wait([
    ref.read(marketAssetsProvider.notifier).refresh(),
    ref.read(globalMarketStatsProvider.notifier).refresh(),
  ]);
}
