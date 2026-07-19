import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/market/market_providers.dart';
import 'package:lidex_network/models/app_models.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';
import 'package:qr_flutter/qr_flutter.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});
  static const address = '0x3A91B7f20865c7C5Ba629aE66F56c71E123A712B';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetsAsync = ref.watch(marketAssetsProvider);
    final assets = assetsAsync.value ?? DemoData.assets;
    final tradingBalance = assets.skip(2).take(3).fold<double>(0, (sum, asset) => sum + asset.fiatValue);
    final walletBalance = assets.fold<double>(0, (sum, asset) => sum + asset.fiatValue);

    return Scaffold(
        appBar: AppBar(
          title: const Text('Wallet'),
          actions: [
            IconButton(tooltip: 'Scan QR', onPressed: () {}, icon: const Icon(Icons.qr_code_scanner_rounded)),
            IconButton(tooltip: 'Wallet settings', onPressed: () {}, icon: const Icon(Icons.settings_outlined)),
          ],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: ResponsivePage(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SectionHeader('My wallets'),
                _WalletCard(balance: walletBalance, onTap: () {}),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () => _walletOptions(context),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Add wallet'),
                    style: OutlinedButton.styleFrom(side: BorderSide(color: Theme.of(context).dividerColor), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  ),
                ),
                const SectionHeader('Exchange account'),
                LidexCard(
                  padding: EdgeInsets.zero,
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFFE7FFF1), Color(0xFFBDF7D8)])),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Trading balance', style: TextStyle(color: LidexColors.darkGreen, fontSize: 12)), const SizedBox(height: 7), Text(NumberFormat.currency(symbol: r'$').format(tradingBalance), style: const TextStyle(color: LidexColors.ink, fontSize: 27, fontWeight: FontWeight.w900))])),
                      Icon(Icons.account_balance_rounded, color: LidexColors.green.withValues(alpha: .24), size: 58),
                      const Icon(Icons.chevron_right_rounded, color: LidexColors.darkGreen),
                    ]),
                  ),
                ),
                const SizedBox(height: 12),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  QuickAction(icon: Icons.south_west_rounded, label: 'Deposit', onTap: () => _receive(context)),
                  QuickAction(icon: Icons.north_east_rounded, label: 'Withdraw', onTap: () => _simpleSheet(context, 'Withdraw')),
                  QuickAction(icon: Icons.swap_horiz_rounded, label: 'Transfer', onTap: () => _simpleSheet(context, 'Internal transfer')),
                  QuickAction(icon: Icons.history_rounded, label: 'History', onTap: () => _simpleSheet(context, 'Transaction history')),
                ]),
                const SectionHeader('Assets', action: 'Hide 0 balance'),
                assetsAsync.when(
                  data: (liveAssets) => LidexCard(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 5),
                    child: Column(children: liveAssets.skip(2).take(3).map((asset) => AssetTile(asset: asset, showBalance: true, onTap: () => _assetDetails(context, asset))).toList()),
                  ),
                  loading: () => const ShimmerSkeleton(height: 220),
                  error: (_, __) => LidexCard(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 5),
                    child: Column(children: DemoData.assets.skip(2).take(3).map((asset) => AssetTile(asset: asset, showBalance: true, onTap: () => _assetDetails(context, asset))).toList()),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton.icon(onPressed: () {}, icon: const Icon(Icons.add_circle_outline), label: const Text('Add custom token')),
              ]),
            ),
          ),
        ),
      );
  }

  void _walletOptions(BuildContext context) => LidexBottomSheet.show<void>(
        context,
        title: 'Add wallet',
        child: Column(children: [
          _OptionTile(icon: Icons.add_box_outlined, title: 'Create a new wallet', subtitle: 'Generate a secure wallet on this device', onTap: () { Navigator.pop(context); context.push('/wallet/create'); }),
          _OptionTile(icon: Icons.file_download_outlined, title: 'Import wallet', subtitle: 'Use an existing 12-word phrase', onTap: () { Navigator.pop(context); context.push('/wallet/import'); }),
        ]),
      );

  void _receive(BuildContext context) => LidexBottomSheet.show<void>(
        context,
        title: 'Receive BNB / BEP-20',
        child: Column(children: [
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)), child: QrImageView(data: address, size: 190)),
          const SizedBox(height: 14),
          const Text('BNB Smart Chain', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text(address, textAlign: TextAlign.center, style: TextStyle(color: LidexColors.muted, fontSize: 12)),
          const SizedBox(height: 18),
          PrimaryButton(label: 'Copy address', icon: Icons.copy_rounded, onPressed: () => Navigator.pop(context)),
        ]),
      );

  void _assetDetails(BuildContext context, CryptoAsset asset) => LidexBottomSheet.show<void>(
        context,
        title: asset.name,
        child: Column(children: [
          CircleAvatar(radius: 32, backgroundColor: asset.color, child: Text(asset.symbol.characters.first, style: const TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w900))),
          const SizedBox(height: 12),
          Text(NumberFormat('#,##0.####').format(asset.balance), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
          Text('${asset.symbol} on BNB Smart Chain', style: const TextStyle(color: LidexColors.muted)),
          const SizedBox(height: 22),
          Row(children: [Expanded(child: PrimaryButton(label: 'Send', onPressed: () {})), const SizedBox(width: 10), Expanded(child: SecondaryButton(label: 'Receive', onPressed: () {}))]),
        ]),
      );

  void _simpleSheet(BuildContext context, String title) => LidexBottomSheet.show<void>(
        context,
        title: title,
        child: Column(children: [const Icon(Icons.security_rounded, color: LidexColors.green, size: 52), const SizedBox(height: 14), const Text('This financial action requires an authenticated account.', textAlign: TextAlign.center), const SizedBox(height: 20), PrimaryButton(label: 'Continue securely', onPressed: () => Navigator.pop(context))]),
      );
}

class _WalletCard extends StatelessWidget {
  const _WalletCard({required this.balance, required this.onTap});
  final double balance;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => LidexCard(
        padding: EdgeInsets.zero,
        onTap: onTap,
        child: Container(
          height: 130,
          padding: const EdgeInsets.all(19),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFF07140E), Color(0xFF005C35)])),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Main wallet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)), const Text('0x3A...712B', style: TextStyle(color: Colors.white60, fontSize: 12)), const Spacer(), Text(NumberFormat.currency(symbol: r'$').format(balance), style: const TextStyle(color: Colors.white, fontSize: 27, fontWeight: FontWeight.w900))])),
            const LidexLogo(size: 58),
            const SizedBox(width: 5),
            const Icon(Icons.chevron_right, color: Colors.white),
          ]),
        ),
      );
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(vertical: 5),
        leading: CircleAvatar(backgroundColor: LidexColors.green.withValues(alpha: .1), child: Icon(icon, color: LidexColors.green)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
      );
}
