import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/market/market_data_service.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';

class MarketStatsBar extends StatelessWidget {
  const MarketStatsBar({super.key, required this.stats, this.compact = false});
  final GlobalMarketStats stats;
  final bool compact;

  static final _compactMoney = NumberFormat.compactCurrency(symbol: r'$', decimalDigits: 1);
  static final _time = DateFormat('HH:mm');

  @override
  Widget build(BuildContext context) {
    final changeColor = stats.marketCapChange24h >= 0 ? LidexColors.green : LidexColors.error;
    final changeLabel = '${stats.marketCapChange24h >= 0 ? '+' : ''}${stats.marketCapChange24h.toStringAsFixed(2)}%';

    if (compact) {
      return LidexCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(children: [
          const Icon(Icons.insights_rounded, color: LidexColors.green, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Mkt cap ${_compactMoney.format(stats.totalMarketCapUsd)}  •  Vol ${_compactMoney.format(stats.totalVolume24hUsd)}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(changeLabel, style: TextStyle(color: changeColor, fontSize: 12, fontWeight: FontWeight.w800)),
        ]),
      );
    }

    return LidexCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.public_rounded, color: LidexColors.green, size: 18),
          const SizedBox(width: 8),
          const Text('Live market data', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: LidexColors.green.withValues(alpha: .12), borderRadius: BorderRadius.circular(999)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(color: LidexColors.green, shape: BoxShape.circle)),
              const SizedBox(width: 5),
              Text('Updated ${_time.format(stats.updatedAt)}', style: const TextStyle(color: LidexColors.darkGreen, fontSize: 10, fontWeight: FontWeight.w700)),
            ]),
          ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _StatTile(label: 'Market cap', value: _compactMoney.format(stats.totalMarketCapUsd), change: changeLabel, changeColor: changeColor)),
          const SizedBox(width: 10),
          Expanded(child: _StatTile(label: '24h volume', value: _compactMoney.format(stats.totalVolume24hUsd))),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _StatTile(label: 'BTC dominance', value: '${stats.btcDominance.toStringAsFixed(1)}%')),
          const SizedBox(width: 10),
          Expanded(child: _StatTile(label: 'Active assets', value: NumberFormat('#,###').format(stats.activeCryptos))),
        ]),
      ]),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, this.change, this.changeColor});
  final String label;
  final String value;
  final String? change;
  final Color? changeColor;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF151A18) : const Color(0xFFF4FBF7),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: LidexColors.muted, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          if (change != null) ...[
            const SizedBox(height: 2),
            Text(change!, style: TextStyle(color: changeColor, fontSize: 11, fontWeight: FontWeight.w700)),
          ],
        ]),
      );
}
