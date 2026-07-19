import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/providers.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
        appBar: AppBar(title: const Text('Profile'), actions: [IconButton(tooltip: 'Settings', onPressed: () => _settings(context, ref), icon: const Icon(Icons.settings_outlined))]),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: ResponsivePage(
              child: Column(children: [
                LidexCard(
                  child: const Row(children: [
                    LidexLogo(size: 58),
                    SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Alex Goodluck', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)), SizedBox(height: 3), Text('alex@example.com', style: TextStyle(color: LidexColors.muted, fontSize: 12)), SizedBox(height: 3), Row(children: [Icon(Icons.verified_rounded, color: LidexColors.green, size: 14), SizedBox(width: 4), Text('Verified', style: TextStyle(color: LidexColors.green, fontSize: 11, fontWeight: FontWeight.w700))])])),
                    Icon(Icons.chevron_right_rounded),
                  ]),
                ),
                const SizedBox(height: 15),
                LidexCard(
                  padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                  child: Column(children: [
                    _ProfileTile(icon: Icons.person_outline_rounded, title: 'Personal information', onTap: () {}),
                    _ProfileTile(icon: Icons.shield_outlined, title: 'Security', onTap: () => _security(context)),
                    _ProfileTile(icon: Icons.workspace_premium_outlined, title: 'Rewards history', onTap: () => context.go('/rewards')),
                    _ProfileTile(icon: Icons.lock_open_outlined, title: 'Unlock progress', onTap: () => context.push('/staking')),
                    _ProfileTile(icon: Icons.notifications_none_rounded, title: 'Notifications', onTap: () {}),
                    _ProfileTile(icon: Icons.help_outline_rounded, title: 'Help & support', onTap: () {}),
                    _ProfileTile(icon: Icons.info_outline_rounded, title: 'About Lidex', onTap: () => _about(context)),
                  ]),
                ),
                const SizedBox(height: 16),
                SizedBox(width: double.infinity, height: 52, child: TextButton.icon(onPressed: () async { await ref.read(secureStorageProvider).deleteAll(); if (context.mounted) context.go('/welcome'); }, icon: const Icon(Icons.logout_rounded, color: LidexColors.error), label: const Text('Log out', style: TextStyle(color: LidexColors.error, fontWeight: FontWeight.w700)))),
                const SizedBox(height: 8),
                const Text('Lidex 1.0.0', style: TextStyle(color: LidexColors.muted, fontSize: 11)),
              ]),
            ),
          ),
        ),
      );

  void _settings(BuildContext context, WidgetRef ref) => LidexBottomSheet.show<void>(
        context,
        title: 'Settings',
        child: Column(children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Dark mode', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: const Text('Use a darker appearance'),
            value: ref.read(themeModeProvider) == ThemeMode.dark,
            onChanged: (value) { ref.read(themeModeProvider.notifier).state = value ? ThemeMode.dark : ThemeMode.light; Navigator.pop(context); },
          ),
          const ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.language_rounded), title: Text('Language'), subtitle: Text('English'), trailing: Icon(Icons.chevron_right)),
        ]),
      );

  void _security(BuildContext context) => LidexBottomSheet.show<void>(
        context,
        title: 'Security',
        child: const Column(children: [
          ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.fingerprint_rounded, color: LidexColors.green), title: Text('Biometric unlock'), subtitle: Text('Face ID / fingerprint enabled'), trailing: Icon(Icons.check_circle, color: LidexColors.green)),
          ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.pin_outlined), title: Text('App PIN'), subtitle: Text('Change your 6-digit PIN'), trailing: Icon(Icons.chevron_right)),
          ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.devices_outlined), title: Text('Device sessions'), subtitle: Text('Manage signed-in devices'), trailing: Icon(Icons.chevron_right)),
        ]),
      );

  void _about(BuildContext context) => showAboutDialog(context: context, applicationName: 'Lidex', applicationVersion: '1.0.0', applicationLegalese: '© 2026 Lidex. Built for secure digital finance.');
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({required this.icon, required this.title, required this.onTap});
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(contentPadding: const EdgeInsets.symmetric(horizontal: 6), minTileHeight: 55, onTap: onTap, leading: Icon(icon, size: 21), title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)), trailing: const Icon(Icons.chevron_right_rounded, size: 20));
}
