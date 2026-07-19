import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';
import 'package:qr_flutter/qr_flutter.dart';

class ReferralScreen extends StatelessWidget {
  const ReferralScreen({super.key});
  static const code = 'ALEX-LDX-25';
  static const link = 'https://lidex.network/r/ALEX-LDX-25';

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Invite & earn')),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: ResponsivePage(
              child: Column(children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(22), gradient: const LinearGradient(colors: [Color(0xFF00A957), Color(0xFF006638)])),
                  child: const Column(children: [Icon(Icons.group_add_rounded, color: LidexColors.gold, size: 52), SizedBox(height: 12), Text('Invite friends. Earn together.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w900)), SizedBox(height: 8), Text('Get 10,000 points when a friend completes their first qualifying activity.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70, height: 1.4))]),
                ),
                const SizedBox(height: 16),
                LidexCard(
                  child: Column(children: [
                    Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)), child: QrImageView(data: link, size: 170)),
                    const SizedBox(height: 14),
                    const Text('Your referral code', style: TextStyle(color: LidexColors.muted, fontSize: 12)),
                    const SizedBox(height: 4),
                    const Text(code, style: TextStyle(fontSize: 22, letterSpacing: 1.3, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 15),
                    PrimaryButton(label: 'Share invite link', icon: Icons.ios_share_rounded, onPressed: () async { await Clipboard.setData(const ClipboardData(text: link)); if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Referral link copied'))); }),
                  ]),
                ),
                const SectionHeader('Your statistics'),
                const Row(children: [Expanded(child: _ReferralStat(label: 'Friends', value: '12')), SizedBox(width: 10), Expanded(child: _ReferralStat(label: 'Points', value: '45,000')), SizedBox(width: 10), Expanded(child: _ReferralStat(label: 'LDX earned', value: '450'))]),
                const SectionHeader('How it works'),
                const LidexCard(child: Column(children: [
                  _Step(number: '1', title: 'Share your link', description: 'Invite friends with your unique code.'),
                  _Step(number: '2', title: 'They join Lidex', description: 'Your friend creates and verifies an account.'),
                  _Step(number: '3', title: 'You both earn', description: 'Points arrive after a qualifying activity.'),
                ])),
              ]),
            ),
          ),
        ),
      );
}

class _ReferralStat extends StatelessWidget {
  const _ReferralStat({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => LidexCard(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 7), child: Column(children: [Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text(label, textAlign: TextAlign.center, style: const TextStyle(color: LidexColors.muted, fontSize: 10))]));
}

class _Step extends StatelessWidget {
  const _Step({required this.number, required this.title, required this.description});
  final String number;
  final String title;
  final String description;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 9), child: Row(children: [CircleAvatar(radius: 18, backgroundColor: LidexColors.green.withValues(alpha: .12), child: Text(number, style: const TextStyle(color: LidexColors.darkGreen, fontWeight: FontWeight.w900))), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), Text(description, style: const TextStyle(color: LidexColors.muted, fontSize: 11))]))]));
}
