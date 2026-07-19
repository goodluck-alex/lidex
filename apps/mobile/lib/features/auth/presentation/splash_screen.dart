import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/providers.dart';
import 'package:lidex_network/features/auth/data/session_state.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(vsync: this, duration: const Duration(milliseconds: 850))..forward();

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    final tokenFuture = ref.read(secureStorageProvider).read(key: 'access_token');
    await Future<void>.delayed(const Duration(milliseconds: 1150));
    final token = await tokenFuture;
    ref.read(sessionStateProvider.notifier).state = token == null
        ? const SessionState.unauthenticated()
        : SessionState.authenticated(accessToken: token);
    if (mounted) context.go(token == null ? '/welcome' : '/home');
  }

  @override
  void dispose() { _animation.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFF020605),
        body: Center(
          child: FadeTransition(
            opacity: CurvedAnimation(parent: _animation, curve: Curves.easeOut),
            child: ScaleTransition(
              scale: Tween(begin: .78, end: 1.0).animate(CurvedAnimation(parent: _animation, curve: Curves.easeOutBack)),
              child: const Column(mainAxisSize: MainAxisSize.min, children: [
                LidexLogo(size: 116),
                SizedBox(height: 26),
                Text('LIDEX', style: TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 4, fontWeight: FontWeight.w700)),
                SizedBox(height: 10),
                Text('SECURE  •  SIMPLE  •  POWERFUL', style: TextStyle(color: LidexColors.green, fontSize: 11, letterSpacing: 1.5)),
              ]),
            ),
          ),
        ),
      );
}
