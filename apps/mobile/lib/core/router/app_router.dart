import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lidex_network/features/auth/presentation/auth_screen.dart';
import 'package:lidex_network/features/auth/presentation/splash_screen.dart';
import 'package:lidex_network/features/auth/presentation/welcome_screen.dart';
import 'package:lidex_network/features/home/presentation/home_screen.dart';
import 'package:lidex_network/features/profile/presentation/profile_screen.dart';
import 'package:lidex_network/features/referral/presentation/referral_screen.dart';
import 'package:lidex_network/features/rewards/presentation/rewards_screen.dart';
import 'package:lidex_network/features/staking/presentation/staking_screen.dart';
import 'package:lidex_network/features/trade/presentation/trade_screen.dart';
import 'package:lidex_network/features/wallet/presentation/create_wallet_screen.dart';
import 'package:lidex_network/features/wallet/presentation/wallet_screen.dart';
import 'package:lidex_network/shared/widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/welcome', pageBuilder: (_, state) => _fade(state, const WelcomeScreen())),
    GoRoute(path: '/login', pageBuilder: (_, state) => _slide(state, const AuthScreen(register: false))),
    GoRoute(path: '/register', pageBuilder: (_, state) => _slide(state, const AuthScreen(register: true))),
    StatefulShellRoute.indexedStack(
      builder: (_, __, navigationShell) => AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/home', pageBuilder: (_, state) => _fade(state, const HomeScreen()))]),
        StatefulShellBranch(routes: [GoRoute(path: '/wallet', pageBuilder: (_, state) => _fade(state, const WalletScreen()))]),
        StatefulShellBranch(routes: [GoRoute(path: '/trade', pageBuilder: (_, state) => _fade(state, const TradeScreen()))]),
        StatefulShellBranch(routes: [GoRoute(path: '/rewards', pageBuilder: (_, state) => _fade(state, const RewardsScreen()))]),
        StatefulShellBranch(routes: [GoRoute(path: '/profile', pageBuilder: (_, state) => _fade(state, const ProfileScreen()))]),
      ],
    ),
    GoRoute(path: '/wallet/create', parentNavigatorKey: _rootNavigatorKey, pageBuilder: (_, state) => _slide(state, const CreateWalletScreen())),
    GoRoute(path: '/wallet/import', parentNavigatorKey: _rootNavigatorKey, pageBuilder: (_, state) => _slide(state, const ImportWalletScreen())),
    GoRoute(path: '/staking', parentNavigatorKey: _rootNavigatorKey, pageBuilder: (_, state) => _slide(state, const StakingScreen())),
    GoRoute(path: '/referral', parentNavigatorKey: _rootNavigatorKey, pageBuilder: (_, state) => _slide(state, const ReferralScreen())),
  ],
  errorBuilder: (_, state) => Scaffold(body: Center(child: Text('Page not found\n${state.uri}', textAlign: TextAlign.center))),
);

CustomTransitionPage<void> _fade(GoRouterState state, Widget child) => CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 220),
      transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
    );

CustomTransitionPage<void> _slide(GoRouterState state, Widget child) => CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 300),
      transitionsBuilder: (_, animation, __, child) => SlideTransition(
        position: Tween(begin: const Offset(0, .06), end: Offset.zero).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
        child: FadeTransition(opacity: animation, child: child),
      ),
    );
