import 'package:flutter/material.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class StakingScreen extends StatelessWidget {
  const StakingScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Stake LDX'), actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.info_outline))]),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: ResponsivePage(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(22), gradient: const LinearGradient(colors: [Color(0xFF061B11), Color(0xFF00733D)])),
                  child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Your staking position', style: TextStyle(color: Colors.white70)),
                    SizedBox(height: 8),
                    Text('6,250.00 LDX', style: TextStyle(color: Colors.white, fontSize: 31, fontWeight: FontWeight.w900)),
                    SizedBox(height: 18),
                    Row(children: [Expanded(child: _Stat(label: 'Current APR', value: '12.5%')), Expanded(child: _Stat(label: 'Rewards earned', value: '184.32 LDX'))]),
                  ]),
                ),
                const SectionHeader('Unlock benefits'),
                LidexCard(child: Column(children: [
                  const Row(children: [Text('Points unlock boost', style: TextStyle(fontWeight: FontWeight.w800)), Spacer(), Text('+15%', style: TextStyle(color: LidexColors.green, fontWeight: FontWeight.w900))]),
                  const SizedBox(height: 13),
                  ClipRRect(borderRadius: BorderRadius.circular(8), child: const LinearProgressIndicator(value: .72, minHeight: 8, backgroundColor: LidexColors.line, valueColor: AlwaysStoppedAnimation(LidexColors.green))),
                  const SizedBox(height: 10),
                  const Align(alignment: Alignment.centerLeft, child: Text('Stake 750 more LDX to reach the next tier.', style: TextStyle(color: LidexColors.muted, fontSize: 12))),
                ])),
                const SectionHeader('Stake more'),
                TextField(keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: 'Amount', suffixIcon: TextButton(onPressed: () {}, child: const Text('MAX')), suffixText: 'LDX')),
                const SizedBox(height: 10),
                const Row(children: [Text('Available', style: TextStyle(color: LidexColors.muted)), Spacer(), Text('4,000.00 LDX', style: TextStyle(fontWeight: FontWeight.w700))]),
                const SizedBox(height: 20),
                PrimaryButton(label: 'Stake LDX', icon: Icons.lock_outline, onPressed: () {}),
                const SizedBox(height: 12),
                SecondaryButton(label: 'Claim 184.32 LDX', onPressed: () {}),
                const SizedBox(height: 18),
                const Text('Staking transactions execute on BNB Smart Chain and require network fees. APR may vary.', style: TextStyle(color: LidexColors.muted, fontSize: 11, height: 1.4)),
              ]),
            ),
          ),
        ),
      );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)), const SizedBox(height: 4), Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))]);
}
