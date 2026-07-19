import 'package:flutter/material.dart';

@immutable
class CryptoAsset {
  const CryptoAsset({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.balance,
    required this.color,
  });
  final String symbol;
  final String name;
  final double price;
  final double change;
  final double balance;
  final Color color;

  double get fiatValue => price * balance;
}

@immutable
class RewardActivity {
  const RewardActivity(this.title, this.subtitle, this.points, this.icon);
  final String title;
  final String subtitle;
  final int points;
  final IconData icon;
}

abstract final class DemoData {
  static const assets = <CryptoAsset>[
    CryptoAsset(symbol: 'BTC', name: 'Bitcoin', price: 67812.45, change: 2.45, balance: .03134, color: Color(0xFFF59E0B)),
    CryptoAsset(symbol: 'ETH', name: 'Ethereum', price: 3512.32, change: 1.25, balance: .8456, color: Color(0xFF4B5563)),
    CryptoAsset(symbol: 'BNB', name: 'BNB Smart Chain', price: 598.35, change: .95, balance: 2.1245, color: Color(0xFFF3BA2F)),
    CryptoAsset(symbol: 'LDX', name: 'Lidex Token', price: .1423, change: 4.35, balance: 10250, color: Color(0xFF008A4B)),
    CryptoAsset(symbol: 'SOL', name: 'Solana', price: 164.25, change: 2.15, balance: 4.24, color: Color(0xFF6D28D9)),
  ];
  static const activities = <RewardActivity>[
    RewardActivity('Daily check-in', 'Today, 08:00 AM', 250, Icons.event_available_rounded),
    RewardActivity('Referral bonus', 'A friend joined Lidex', 10000, Icons.group_add_outlined),
    RewardActivity('Trade activity', 'Spot order completed', 5000, Icons.swap_horiz_rounded),
    RewardActivity('Stake LDX', 'Monthly staking reward', 25000, Icons.lock_clock_outlined),
  ];
}
