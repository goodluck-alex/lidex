import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/core/providers.dart';
import 'package:lidex_network/features/auth/data/auth_repository.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, required this.register});
  final bool register;
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() { _name.dispose(); _email.dispose(); _password.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final repository = AuthRepository(ref.read(apiClientProvider), ref.read(secureStorageProvider));
      if (widget.register) {
        await repository.register(name: _name.text, email: _email.text, password: _password.text);
      } else {
        await repository.login(email: _email.text, password: _password.text);
      }
      if (mounted) context.go('/home');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to continue. Check your details and connection.')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 10, 22, 28),
            children: [
              const LidexLogo(size: 54),
              const SizedBox(height: 28),
              Text(widget.register ? 'Create your account' : 'Welcome back', style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(widget.register ? 'Start your secure crypto journey.' : 'Log in to your Lidex account.', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 16)),
              const SizedBox(height: 30),
              Form(
                key: _form,
                child: Column(children: [
                  if (widget.register) ...[
                    TextFormField(controller: _name, textInputAction: TextInputAction.next, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.name], decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)), validator: (v) => (v?.trim().length ?? 0) < 2 ? 'Enter your full name' : null),
                    const SizedBox(height: 14),
                  ],
                  TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded)), validator: (v) => RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(v?.trim() ?? '') ? null : 'Enter a valid email'),
                  const SizedBox(height: 14),
                  TextFormField(controller: _password, obscureText: _obscure, onFieldSubmitted: (_) => _submit(), autofillHints: widget.register ? const [AutofillHints.newPassword] : const [AutofillHints.password], decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => _obscure = !_obscure), icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined))), validator: (v) => (v?.length ?? 0) < 8 ? 'Use at least 8 characters' : null),
                ]),
              ),
              if (!widget.register) Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () {}, child: const Text('Forgot password?'))),
              SizedBox(height: widget.register ? 24 : 8),
              PrimaryButton(label: widget.register ? 'Create account' : 'Log in', onPressed: _submit, loading: _loading),
              const SizedBox(height: 18),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(widget.register ? 'Already have an account?' : 'New to Lidex?'),
                TextButton(onPressed: () => context.pushReplacement(widget.register ? '/login' : '/register'), child: Text(widget.register ? 'Log in' : 'Create account')),
              ]),
            ],
          ),
        ),
      );
}
