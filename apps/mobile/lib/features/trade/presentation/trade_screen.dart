import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/market/market_providers.dart';
import 'package:lidex_network/models/app_models.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/market_stats_bar.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class TradeScreen extends ConsumerStatefulWidget {
  const TradeScreen({super.key});
  @override
  ConsumerState<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends ConsumerState<TradeScreen> {
  int _mode = 0;
  int _filter = 0;
  final _search = TextEditingController();
  String _query = '';
  @override
  void dispose() { _search.dispose(); super.dispose(); }

  List<CryptoAsset> _filtered(List<CryptoAsset> assets) {
    final filtered = assets.where((asset) => '${asset.symbol} ${asset.name}'.toLowerCase().contains(_query.toLowerCase())).toList();
    switch (_filter) {
      case 0:
        return filtered.where((asset) => {'BTC', 'ETH', 'LDX'}.contains(asset.symbol)).toList();
      case 2:
        return [...filtered]..sort((a, b) => b.change.compareTo(a.change));
      case 3:
        return filtered.where((asset) => asset.change < 0).toList()..sort((a, b) => a.change.compareTo(b.change));
      default:
        return filtered;
    }
  }

  @override
  Widget build(BuildContext context) {
    final assetsAsync = ref.watch(marketAssetsProvider);
    final statsAsync = ref.watch(globalMarketStatsProvider);
    final assets = _filtered(assetsAsync.value ?? DemoData.assets);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trade'),
        actions: [
          IconButton(tooltip: 'Refresh prices', onPressed: () => refreshMarketData(ref), icon: const Icon(Icons.refresh_rounded)),
          IconButton(tooltip: 'Search markets', onPressed: _showSearch, icon: const Icon(Icons.search_rounded)),
          IconButton(tooltip: 'Price alerts', onPressed: () {}, icon: const Badge(smallSize: 7, child: Icon(Icons.notifications_none_rounded))),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ResponsivePage(
          child: Column(children: [
            Container(
              width: double.infinity,
              height: 142,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFF006B39), Color(0xFF012F1E)])),
              child: Stack(children: [
                const Positioned(right: -10, bottom: -20, child: Icon(Icons.candlestick_chart_rounded, color: Color(0x3300E676), size: 130)),
                const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Trade. Invest. Grow.', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)), SizedBox(height: 9), Text('Buy and sell crypto with simple,\ntransparent rates.', style: TextStyle(color: Colors.white70, height: 1.4)), Spacer(), Row(children: [Icon(Icons.verified_user_outlined, color: LidexColors.gold, size: 17), SizedBox(width: 6), Text('Protected trading', style: TextStyle(color: Colors.white70, fontSize: 11))])]),
              ]),
            ),
            const SizedBox(height: 12),
            statsAsync.when(
              data: (stats) => MarketStatsBar(stats: stats, compact: true),
              loading: () => const ShimmerSkeleton(height: 52),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: SegmentedButton<int>(
                showSelectedIcon: false,
                segments: const [ButtonSegment(value: 0, label: Text('Spot')), ButtonSegment(value: 1, label: Text('Convert')), ButtonSegment(value: 2, label: Text('Swap'))],
                selected: {_mode},
                onSelectionChanged: (value) => setState(() => _mode = value.first),
                style: ButtonStyle(backgroundColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? LidexColors.green : Colors.transparent), foregroundColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? Colors.white : Theme.of(context).colorScheme.onSurface)),
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: List.generate(4, (index) {
                const labels = ['Favorites', 'All', 'Gainers', 'Losers'];
                return Padding(padding: const EdgeInsets.only(right: 7), child: ChoiceChip(label: Text(labels[index]), selected: _filter == index, onSelected: (_) => setState(() => _filter = index), selectedColor: LidexColors.green.withValues(alpha: .13), labelStyle: TextStyle(color: _filter == index ? LidexColors.darkGreen : LidexColors.muted, fontSize: 12, fontWeight: FontWeight.w700), side: BorderSide.none, showCheckmark: false));
              })),
            ),
            Expanded(
              child: assetsAsync.when(
                data: (_) => _MarketList(assets: assets, onTrade: _tradeSheet),
                loading: () => ListView.separated(
                  padding: const EdgeInsets.only(top: 4, bottom: 24),
                  itemCount: 5,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, __) => const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: ShimmerSkeleton(height: 56)),
                ),
                error: (_, __) => _MarketList(assets: assets, onTrade: _tradeSheet),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _showSearch() async {
    final value = await LidexBottomSheet.show<String>(
      context,
      title: 'Search markets',
      child: TextField(
        controller: _search,
        autofocus: true,
        textInputAction: TextInputAction.search,
        onSubmitted: (value) => Navigator.pop(context, value),
        decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'BTC, Ethereum, LDX…'),
      ),
    );
    if (value != null && mounted) setState(() => _query = value);
  }

  void _tradeSheet(CryptoAsset asset) => LidexBottomSheet.show<void>(
        context,
        title: '${asset.symbol} / USDT',
        child: Column(children: [
          Row(children: [
            CircleAvatar(backgroundColor: asset.color, child: Text(asset.symbol == 'LDX' ? 'L' : asset.symbol.characters.first, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900))),
            const SizedBox(width: 12),
            Expanded(child: Text(NumberFormat.currency(symbol: r'$', decimalDigits: asset.price < 1 ? 4 : 2).format(asset.price), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900))),
            Text('${asset.change >= 0 ? '+' : ''}${asset.change.toStringAsFixed(2)}%', style: TextStyle(color: asset.change >= 0 ? LidexColors.green : LidexColors.error, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 14),
          const MiniSparkline(height: 95),
          const SizedBox(height: 20),
          Row(children: [Expanded(child: PrimaryButton(label: 'Buy', onPressed: () {})), const SizedBox(width: 10), Expanded(child: SecondaryButton(label: 'Sell', onPressed: () {}))]),
        ]),
      );
}

class _MarketList extends StatelessWidget {
  const _MarketList({required this.assets, required this.onTrade});
  final List<CryptoAsset> assets;
  final ValueChanged<CryptoAsset> onTrade;

  @override
  Widget build(BuildContext context) => ListView.separated(
        padding: const EdgeInsets.only(top: 4, bottom: 24),
        itemCount: assets.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, index) => _MarketTile(asset: assets[index], onTap: () => onTrade(assets[index])),
      );
}

class _MarketTile extends StatelessWidget {
  const _MarketTile({required this.asset, required this.onTap});
  final CryptoAsset asset;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: r'$', decimalDigits: asset.price < 1 ? 4 : 2);
    final changeColor = asset.change >= 0 ? LidexColors.green : LidexColors.error;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        height: 76,
        child: Row(children: [
          CircleAvatar(radius: 21, backgroundColor: asset.color, child: Text(asset.symbol == 'LDX' ? 'L' : asset.symbol.characters.first, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900))),
          const SizedBox(width: 12),
          Expanded(flex: 2, child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(asset.symbol, style: const TextStyle(fontWeight: FontWeight.w800)), Text(asset.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: LidexColors.muted, fontSize: 11))])),
          Expanded(child: MiniSparkline(height: 34, color: changeColor)),
          const SizedBox(width: 14),
          Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(money.format(asset.price), style: const TextStyle(fontWeight: FontWeight.w800)),
            Text('${asset.change >= 0 ? '+' : ''}${asset.change.toStringAsFixed(2)}%', style: TextStyle(color: changeColor, fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        ]),
      ),
    );
  }
}
