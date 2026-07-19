import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/shared/widgets/lidex_components.dart';

class WelcomeScreen extends HookWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final entrance = useAnimationController(duration: const Duration(milliseconds: 650));
    useEffect(() { entrance.forward(); return null; }, [entrance]);
    return Scaffold(
        backgroundColor: const Color(0xFF010504),
        body: FadeTransition(
          opacity: CurvedAnimation(parent: entrance, curve: Curves.easeOut),
          child: Stack(children: [
          const Positioned.fill(child: _GlowBackground()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 42, 22, 20),
              child: Column(children: [
                const Spacer(flex: 2),
                Hero(tag: 'lidex-logo', child: const LidexLogo(size: 132)),
                const Spacer(),
                const Text('The Future of Finance,\nIn Your Hands', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 27, height: 1.15, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                const Text('Secure. Simple. Powerful.', style: TextStyle(color: LidexColors.green, fontWeight: FontWeight.w600)),
                const Spacer(flex: 2),
                PrimaryButton(label: 'Create account', onPressed: () => context.push('/register')),
                const SizedBox(height: 12),
                SecondaryButton(label: 'Log in', onPressed: () => context.push('/login')),
                const SizedBox(height: 10),
                TextButton(onPressed: () => context.go('/home'), child: const Text('Explore as guest', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600))),
              ]),
            ),
          ),
          ]),
        ),
      );
  }
}

class _GlowBackground extends StatelessWidget {
  const _GlowBackground();
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _GlowPainter());
}

class _GlowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..shader = RadialGradient(colors: [LidexColors.green.withValues(alpha: .2), Colors.transparent]).createShader(Rect.fromCircle(center: Offset(size.width / 2, size.height * .35), radius: size.width * .72));
    canvas.drawRect(Offset.zero & size, paint);
    final dot = Paint()..color = LidexColors.green.withValues(alpha: .18);
    for (var i = 0; i < 26; i++) {
      final x = (math.sin(i * 14.3) + 1) * size.width / 2;
      final y = (math.cos(i * 8.7) + 1) * size.height * .36;
      canvas.drawCircle(Offset(x, y), 1 + i % 3, dot);
    }
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
