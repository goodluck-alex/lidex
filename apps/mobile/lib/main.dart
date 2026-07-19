import 'dart:async';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lidex_network/config/app_config.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/core/providers.dart';
import 'package:lidex_network/core/router/app_router.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

Future<void> main() async {
  var firebaseReady = false;
  await runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await Hive.initFlutter();
      await Hive.openBox<String>('encrypted_wallets');
      await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
      SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent));

      try {
        await Firebase.initializeApp();
        firebaseReady = true;
        FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
        await FirebaseMessaging.instance.setAutoInitEnabled(true);
        await FirebaseAnalytics.instance.logAppOpen();
        FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
      } catch (_) {
        // The design/demo build remains runnable before platform Firebase files
        // are supplied. Production CI must require those environment files.
      }

      runApp(ProviderScope(child: LidexApp(analytics: firebaseReady ? FirebaseAnalytics.instance : null)));
    },
    (error, stack) {
      if (firebaseReady) FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    },
  );
}

class LidexApp extends ConsumerWidget {
  const LidexApp({super.key, this.analytics});
  final FirebaseAnalytics? analytics;

  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: ref.watch(themeModeProvider),
        routerConfig: appRouter,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: MediaQuery.textScalerOf(context).clamp(minScaleFactor: .9, maxScaleFactor: 1.3),
          ),
          child: child!,
        ),
      );
}
