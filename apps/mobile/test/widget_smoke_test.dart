import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lidex_network/config/app_theme.dart';
import 'package:lidex_network/features/home/presentation/home_screen.dart';

void main() {
  testWidgets('home renders core financial summary', (tester) async {
    await tester.pumpWidget(ProviderScope(child: MaterialApp(theme: AppTheme.light(), home: const HomeScreen())));
    expect(find.text('Total balance'), findsOneWidget);
    expect(find.text('Market overview'), findsOneWidget);
    expect(find.byIcon(Icons.north_east_rounded), findsOneWidget);
  });
}
