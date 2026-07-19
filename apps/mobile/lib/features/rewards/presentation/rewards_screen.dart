import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/models/app_models.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class RewardsScreen extends StatelessWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Rewards'),
          actions: [IconButton(tooltip: 'Rewards help', onPressed: () {}, icon: const Icon(Icons.help_outline_rounded)), IconButton(tooltip: 'Information', onPressed: () {}, icon: const Icon(Icons.info_outline_rounded))],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: ResponsivePage(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: double.infinity,
                  height: 164,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(colors: [Color(0xFF008D49), Color(0xFF005C36)])),
                  child: Stack(children: [
                    Positioned(right: -12, top: -15, child: Container(width: 122, height: 122, decoration: BoxDecoration(shape: BoxShape.circle, color: LidexColors.gold, boxShadow: [BoxShadow(color: LidexColors.gold.withValues(alpha: .3), blurRadius: 18)]), child: const Icon(Icons.star_rounded, color: Colors.white, size: 68))),
                    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Total points', style: TextStyle(color: Colors.white70)), SizedBox(height: 8), Text('24,560', style: TextStyle(color: Colors.white, fontSize: 39, fontWeight: FontWeight.w900)), SizedBox(height: 5), Text('≈ 245.60 LDX', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600))]),
                  ]),
                ),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  QuickAction(icon: Icons.event_available_rounded, label: 'Check-in', onTap: () => _checkIn(context)),
                  QuickAction(icon: Icons.group_add_outlined, label: 'Referrals', onTap: () => context.push('/referral')),
                  QuickAction(icon: Icons.savings_outlined, label: 'Stake LDX', onTap: () => context.push('/staking')),
                  QuickAction(icon: Icons.leaderboard_outlined, label: 'Leaders', onTap: () {}),
                ]),
                const SectionHeader('Unlock progress', action: 'Details'),
                LidexCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Row(children: [Text('65%', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900)), Spacer(), Text('Monthly unlock: 20%', style: TextStyle(color: LidexColors.muted, fontSize: 12))]),
                    const SizedBox(height: 13),
                    ClipRRect(borderRadius: BorderRadius.circular(7), child: const LinearProgressIndicator(value: .65, minHeight: 8, backgroundColor: LidexColors.line, valueColor: AlwaysStoppedAnimation(LidexColors.green))),
                    const SizedBox(height: 12),
                    const Text('Deposit, trade, stake, or refer friends to unlock more.', style: TextStyle(color: LidexColors.muted, fontSize: 12)),
                  ]),
                ),
                const SectionHeader('Points activity', action: 'View all'),
                LidexCard(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
                  child: Column(children: DemoData.activities.map((activity) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    minTileHeight: 67,
                    leading: Icon(activity.icon, color: LidexColors.ink),
                    title: Text(activity.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    subtitle: Text(activity.subtitle, style: const TextStyle(fontSize: 11)),
                    trailing: Text('+${NumberFormat('#,##0').format(activity.points)}', style: const TextStyle(color: LidexColors.darkGreen, fontWeight: FontWeight.w800)),
                  )).toList()),
                ),
              ]),
            ),
          ),
        ),
      );

  void _checkIn(BuildContext context) => showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const CircleAvatar(radius: 34, backgroundColor: LidexColors.gold, child: Icon(Icons.star_rounded, color: Colors.white, size: 38)),
          title: const Text('Daily reward claimed!'),
          content: const Text('+250 points have been added to your rewards balance.', textAlign: TextAlign.center),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done'))],
        ),
      );
}
