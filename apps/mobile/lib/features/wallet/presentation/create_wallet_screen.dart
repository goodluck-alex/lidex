import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/providers.dart';
import 'package:lidex_network/core/security/wallet_vault.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';
import 'package:lidex_network/shared/widgets/responsive_page.dart';

class CreateWalletScreen extends ConsumerStatefulWidget {
  const CreateWalletScreen({super.key});
  @override
  ConsumerState<CreateWalletScreen> createState() => _CreateWalletScreenState();
}

class _CreateWalletScreenState extends ConsumerState<CreateWalletScreen> {
  late final Future<CreatedWallet> _wallet = ref.read(walletVaultProvider).generateWallet();
  bool _confirmed = false;
  bool _saving = false;

  Future<void> _finish(CreatedWallet wallet) async {
    setState(() => _saving = true);
    try {
      await ref.read(walletVaultProvider).importWallet(wallet.mnemonic, name: 'Main Wallet');
      if (mounted) {
        HapticFeedback.mediumImpact();
        context.go('/wallet');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Create new wallet')),
        body: SafeArea(
          top: false,
          child: ResponsivePage(
            child: FutureBuilder<CreatedWallet>(
              future: _wallet,
              builder: (context, snapshot) {
                if (snapshot.hasError) return Center(child: Text('Could not create wallet: ${snapshot.error}'));
                if (!snapshot.hasData) return const Column(mainAxisAlignment: MainAxisAlignment.center, children: [CircularProgressIndicator(), SizedBox(height: 18), Text('Generating securely on your device…')]);
                final wallet = snapshot.data!;
                final words = wallet.mnemonic.split(' ');
                return SingleChildScrollView(
                  child: Column(children: [
                    const SizedBox(height: 12),
                    const CircleAvatar(radius: 42, backgroundColor: Color(0xFFE5FFF0), child: Icon(Icons.shield_rounded, color: LidexColors.green, size: 42)),
                    const SizedBox(height: 18),
                    const Text('Secure your wallet', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 8),
                    const Text('Write down these 12 words in order. They are the only way to recover your wallet.', textAlign: TextAlign.center, style: TextStyle(color: LidexColors.muted, height: 1.4)),
                    const SizedBox(height: 22),
                    LidexCard(
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: words.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, childAspectRatio: 2.4, crossAxisSpacing: 7, mainAxisSpacing: 7),
                        itemBuilder: (_, index) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          alignment: Alignment.centerLeft,
                          decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, borderRadius: BorderRadius.circular(10)),
                          child: Text('${index + 1}  ${words[index]}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(14)),
                      child: const Row(children: [Icon(Icons.warning_amber_rounded, color: Color(0xFF9A6400)), SizedBox(width: 10), Expanded(child: Text('Never share your recovery phrase. Lidex will never ask for it.', style: TextStyle(color: Color(0xFF6B4B0C), fontSize: 12)))]),
                    ),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _confirmed,
                      activeColor: LidexColors.green,
                      onChanged: (value) => setState(() => _confirmed = value ?? false),
                      title: const Text('I saved my recovery phrase securely', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                    PrimaryButton(label: 'Finish', loading: _saving, onPressed: _confirmed ? () => _finish(wallet) : null),
                  ]),
                );
              },
            ),
          ),
        ),
      );
}

class ImportWalletScreen extends ConsumerStatefulWidget {
  const ImportWalletScreen({super.key});
  @override
  ConsumerState<ImportWalletScreen> createState() => _ImportWalletScreenState();
}

class _ImportWalletScreenState extends ConsumerState<ImportWalletScreen> {
  final _words = TextEditingController();
  bool _loading = false;
  @override
  void dispose() { _words.dispose(); super.dispose(); }

  Future<void> _import() async {
    setState(() => _loading = true);
    try {
      await ref.read(walletVaultProvider).importWallet(_words.text);
      if (mounted) context.go('/wallet');
    } on FormatException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Import wallet')),
        body: SafeArea(
          top: false,
          child: ResponsivePage(
            child: ListView(children: [
              const SizedBox(height: 18),
              const CircleAvatar(radius: 36, backgroundColor: Color(0xFFE5FFF0), child: Icon(Icons.file_download_outlined, color: LidexColors.green, size: 34)),
              const SizedBox(height: 20),
              const Text('Enter your recovery phrase', textAlign: TextAlign.center, style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text('Words are processed and encrypted only on this device.', textAlign: TextAlign.center, style: TextStyle(color: LidexColors.muted)),
              const SizedBox(height: 24),
              TextField(controller: _words, onChanged: (_) => setState(() {}), maxLines: 6, autocorrect: false, enableSuggestions: false, decoration: const InputDecoration(hintText: 'word1 word2 word3 …', alignLabelWithHint: true)),
              const SizedBox(height: 12),
              const Row(children: [Icon(Icons.lock_outline, color: LidexColors.green, size: 18), SizedBox(width: 7), Expanded(child: Text('AES-256-GCM encrypted • Keychain/Keystore protected', style: TextStyle(fontSize: 12, color: LidexColors.muted)))]),
              const SizedBox(height: 24),
              PrimaryButton(label: 'Import securely', loading: _loading, onPressed: _words.text.trim().isEmpty ? null : _import),
            ]),
          ),
        ),
      );
}
