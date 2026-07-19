import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/market/market_providers.dart';
import 'package:lidex_network/models/app_models.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/market_stats_bar.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _hideBalance = false;

  void _comingSoon(String title) => LidexBottomSheet.show<void>(
        context,
        title: title,
        child: Column(children: [
          const Icon(Icons.shield_outlined, color: LidexColors.green, size: 48),
          const SizedBox(height: 12),
          Text('$title is ready for secure API integration.', textAlign: TextAlign.center),
          const SizedBox(height: 20),
          PrimaryButton(label: 'Got it', onPressed: () => Navigator.pop(context)),
        ]),
      );

  Future<void> _refresh() => refreshMarketData(ref);

  @override
  Widget build(BuildContext context) {
    final assetsAsync = ref.watch(marketAssetsProvider);
    final statsAsync = ref.watch(globalMarketStatsProvider);
    final assets = assetsAsync.value ?? DemoData.assets;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: LidexColors.green,
          onRefresh: _refresh,
          child: CustomScrollView(slivers: [
            SliverToBoxAdapter(
              child: ResponsivePage(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const LidexLogo(size: 38),
                    const Spacer(),
                    IconButton(tooltip: 'Notifications', onPressed: () => _comingSoon('Notifications'), icon: const Badge(smallSize: 7, child: Icon(Icons.notifications_none_rounded))),
                  ]),
                  const SizedBox(height: 16),
                  Text('Good morning,', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 14)),
                  const Text('Alex 👋', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 16),
                  statsAsync.when(
                    data: (stats) => MarketStatsBar(stats: stats),
                    loading: () => const ShimmerSkeleton(height: 132),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 14),
                  _PortfolioCard(hidden: _hideBalance, assets: assets, onToggle: () => setState(() => _hideBalance = !_hideBalance)),
                  const SizedBox(height: 14),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                    QuickAction(icon: Icons.north_east_rounded, label: 'Send', onTap: () => _comingSoon('Send')),
                    QuickAction(icon: Icons.south_west_rounded, label: 'Receive', onTap: () => _comingSoon('Receive')),
                    QuickAction(icon: Icons.account_balance_wallet_outlined, label: 'Buy', onTap: () => _comingSoon('Buy')),
                    QuickAction(icon: Icons.swap_horiz_rounded, label: 'Swap', onTap: () => _comingSoon('Swap')),
                  ]),
                  const SizedBox(height: 12),
                  LidexCard(
                    padding: EdgeInsets.zero,
                    onTap: () => context.go('/rewards'),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFF007B40), Color(0xFF00B85B)])),
                      child: const Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Lidex Points', style: TextStyle(color: Colors.white70, fontSize: 12)), SizedBox(height: 3), Text('24,560', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)), Text('≈ 245.60 LDX', style: TextStyle(color: Colors.white70, fontSize: 11))])),
                        CircleAvatar(radius: 26, backgroundColor: Color(0x33FFFFFF), child: Icon(Icons.star_rounded, color: LidexColors.gold, size: 34)),
                        SizedBox(width: 4), Icon(Icons.chevron_right, color: Colors.white),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 12),
                  LidexCard(
                    color: const Color(0xFF101312),
                    onTap: () => context.push('/staking'),
                    child: Column(children: [
                      const Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Unlock progress', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)), SizedBox(height: 3), Text('65%  •  Monthly limit 20%', style: TextStyle(color: Colors.white54, fontSize: 11))])), Icon(Icons.lock_open_rounded, color: LidexColors.gold)]),
                      const SizedBox(height: 13),
                      ClipRRect(borderRadius: BorderRadius.circular(8), child: const LinearProgressIndicator(value: .65, minHeight: 7, backgroundColor: Color(0xFF2D3330), valueColor: AlwaysStoppedAnimation(LidexColors.green))),
                    ]),
                  ),
                  SectionHeader('Market overview', action: 'View all', onAction: () => context.go('/trade')),
                  assetsAsync.when(
                    data: (liveAssets) => LidexCard(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 5),
                      child: Column(children: liveAssets.take(4).map((asset) => AssetTile(asset: asset, onTap: () => context.go('/trade'))).toList()),
                    ),
                    loading: () => const ShimmerSkeleton(height: 260),
                    error: (_, __) => LidexCard(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 5),
                      child: Column(children: DemoData.assets.take(4).map((asset) => AssetTile(asset: asset, onTap: () => context.go('/trade'))).toList()),
                    ),
                  ),
                  const SizedBox(height: 14),
                  LidexCard(
                    color: const Color(0xFFE8FFF2),
                    onTap: () => context.push('/referral'),
                    child: const Row(children: [
                      CircleAvatar(backgroundColor: LidexColors.green, child: Icon(Icons.group_add_outlined, color: Colors.white)),
                      SizedBox(width: 14),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Invite friends. Earn together.', style: TextStyle(color: LidexColors.ink, fontWeight: FontWeight.w800)), SizedBox(height: 4), Text('Get up to 10,000 points per referral', style: TextStyle(color: LidexColors.darkGreen, fontSize: 12))])),
                      Icon(Icons.chevron_right, color: LidexColors.darkGreen),
                    ]),
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _PortfolioCard extends StatelessWidget {
  const _PortfolioCard({required this.hidden, required this.assets, required this.onToggle});
  final bool hidden;
  final List<CryptoAsset> assets;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final total = assets.fold<double>(0, (sum, asset) => sum + asset.fiatValue);
    final weightedChange = total == 0 ? 0.0 : assets.fold<double>(0, (sum, asset) => sum + asset.fiatValue * asset.change) / total;

    return LidexCard(
      padding: EdgeInsets.zero,
      child: Container(
        height: 164,
        padding: const EdgeInsets.fromLTRB(20, 18, 14, 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: Theme.of(context).brightness == Brightness.dark ? const [Color(0xFF15261D), Color(0xFF101312)] : const [Colors.white, Color(0xFFF0FFF6)]),
        ),
        child: Stack(children: [
          const Positioned(right: 0, bottom: 8, width: 165, child: Opacity(opacity: .7, child: MiniSparkline(height: 82))),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Text('Total balance', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13)), const SizedBox(width: 4), InkWell(onTap: onToggle, child: Icon(hidden ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 16))]),
            const SizedBox(height: 7),
            Text(hidden ? '••••••••' : NumberFormat.currency(symbol: r'$').format(total), style: const TextStyle(fontSize: 31, fontWeight: FontWeight.w900, letterSpacing: -.6)),
            const SizedBox(height: 5),
            Text('${weightedChange >= 0 ? '+' : ''}${weightedChange.toStringAsFixed(2)}%  (24h)', style: TextStyle(color: weightedChange >= 0 ? LidexColors.green : LidexColors.error, fontSize: 13, fontWeight: FontWeight.w700)),
          ]),
        ]),
      ),
    );
  }
}
