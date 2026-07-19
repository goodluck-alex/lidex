import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/models/app_models.dart';

class LidexLogo extends StatelessWidget {
  const LidexLogo({super.key, this.size = 44, this.showWordmark = false});
  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: LidexColors.green.withValues(alpha: .25), blurRadius: 18, offset: const Offset(0, 6))],
            ),
            clipBehavior: Clip.antiAlias,
            child: Image.asset('assets/images/lidex_logo.png', width: size, height: size, fit: BoxFit.cover),
          ),
          if (showWordmark) ...[
            const SizedBox(width: 10),
            const Text('Lidex', style: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.w900, fontSize: 24)),
          ],
        ],
      );
}

class LidexCard extends StatelessWidget {
  const LidexCard({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.color, this.onTap, this.margin});
  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  final VoidCallback? onTap;
  final EdgeInsets? margin;

  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        decoration: BoxDecoration(
          color: color ?? Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: Theme.of(context).brightness == Brightness.light
              ? const [BoxShadow(color: Color(0x0D0A2A1B), blurRadius: 22, offset: Offset(0, 8))]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onTap == null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    onTap!();
                  },
            child: Padding(padding: padding, child: child),
          ),
        ),
      );
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.loading = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        height: 56,
        child: FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: LidexColors.green,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          onPressed: loading ? null : onPressed,
          icon: loading
              ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : icon == null
                  ? const SizedBox.shrink()
                  : Icon(icon),
          label: Text(label),
        ),
      );
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        height: 56,
        child: OutlinedButton(
          onPressed: onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.onSurface,
            side: const BorderSide(color: LidexColors.green),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 12),
        child: Row(children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
          if (action != null)
            TextButton(onPressed: onAction, child: Text(action!, style: const TextStyle(color: LidexColors.green, fontWeight: FontWeight.w700))),
        ]),
      );
}

class QuickAction extends StatelessWidget {
  const QuickAction({super.key, required this.icon, required this.label, required this.onTap, this.color = LidexColors.green});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap();
          },
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 7),
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      );
}

class AssetTile extends StatelessWidget {
  const AssetTile({super.key, required this.asset, this.showBalance = false, this.onTap});
  final CryptoAsset asset;
  final bool showBalance;
  final VoidCallback? onTap;

  String _getIconPath() {
    switch (asset.symbol) {
      case 'BTC': return 'assets/images/btc_icon.svg';
      case 'ETH': return 'assets/images/eth_icon.svg';
      case 'BNB': return 'assets/images/bnb_icon.svg';
      case 'LDX': return 'assets/images/ldx_icon.svg';
      case 'SOL': return 'assets/images/sol_icon.svg';
      default: return 'assets/images/lidex_logo.png';
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: r'$', decimalDigits: asset.price < 1 ? 4 : 2);
    return ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      minTileHeight: 64,
      leading: CircleAvatar(
        radius: 21,
        backgroundColor: asset.color.withValues(alpha: .1),
        child: SvgPicture.asset(_getIconPath(), width: 28, height: 28),
      ),
      title: Text(asset.symbol, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(asset.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: LidexColors.muted, fontSize: 12)),
      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(showBalance ? _formatBalance(asset.balance) : money.format(asset.price), style: const TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 3),
        Text(
          showBalance ? money.format(asset.fiatValue) : '${asset.change >= 0 ? '+' : ''}${asset.change.toStringAsFixed(2)}%',
          style: TextStyle(color: showBalance ? LidexColors.muted : (asset.change >= 0 ? LidexColors.green : LidexColors.error), fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ]),
    );
  }

  String _formatBalance(double amount) => amount >= 1000 ? NumberFormat('#,##0.00').format(amount) : amount.toStringAsFixed(4);
}

class MiniSparkline extends StatelessWidget {
  const MiniSparkline({super.key, this.color = LidexColors.green, this.height = 54});
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) => SizedBox(width: double.infinity, height: height, child: CustomPaint(painter: _SparklinePainter(color)));
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter(this.color);
  final Color color;
  static const points = [.72, .62, .67, .48, .54, .43, .28, .33, .18, .24, .08];

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final point = Offset(size.width * i / (points.length - 1), size.height * points[i]);
      i == 0 ? path.moveTo(point.dx, point.dy) : path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, Paint()..color = color..strokeWidth = 2..style = PaintingStyle.stroke..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) => oldDelegate.color != color;
}

class LidexBottomSheet {
  static Future<T?> show<T>(BuildContext context, {required String title, required Widget child}) => showModalBottomSheet<T>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Theme.of(context).cardColor,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (context) => Padding(
          padding: EdgeInsets.fromLTRB(22, 12, 22, MediaQuery.viewInsetsOf(context).bottom + 22),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 38, height: 4, decoration: BoxDecoration(color: LidexColors.line, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 22),
            Align(alignment: Alignment.centerLeft, child: Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
            const SizedBox(height: 18),
            child,
          ]),
        ),
      );
}

class ShimmerSkeleton extends StatefulWidget {
  const ShimmerSkeleton({super.key, this.height = 80});
  final double height;
  @override
  State<ShimmerSkeleton> createState() => _ShimmerSkeletonState();
}

class _ShimmerSkeletonState extends State<ShimmerSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  @override
  void dispose() { _controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _controller,
        builder: (_, __) => Container(
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: LinearGradient(
              begin: Alignment(-1 + _controller.value * 2, 0),
              end: Alignment(_controller.value * 2, 0),
              colors: const [Color(0xFFE9ECEA), Color(0xFFF8F9FA), Color(0xFFE9ECEA)],
            ),
          ),
        ),
      );
}
