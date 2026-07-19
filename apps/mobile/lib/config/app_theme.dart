import 'package:flutter/material.dart';

abstract final class LidexColors {
  static const green = Color(0xFF00C853);
  static const darkGreen = Color(0xFF007B40);
  static const ink = Color(0xFF101312);
  static const muted = Color(0xFF6F7773);
  static const canvas = Color(0xFFF8F9FA);
  static const gold = Color(0xFFFFD700);
  static const error = Color(0xFFE53935);
  static const line = Color(0xFFE9ECEA);
}

abstract final class AppTheme {
  static ThemeData light() => _theme(Brightness.light);
  static ThemeData dark() => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: LidexColors.green,
      brightness: brightness,
      primary: LidexColors.green,
      surface: isDark ? const Color(0xFF151816) : Colors.white,
      error: LidexColors.error,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? const Color(0xFF090B0A) : LidexColors.canvas,
      fontFamily: 'sans-serif',
      textTheme: Typography.material2021(platform: TargetPlatform.iOS)
          .black
          .apply(
            bodyColor: isDark ? Colors.white : LidexColors.ink,
            displayColor: isDark ? Colors.white : LidexColors.ink,
          ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: isDark ? Colors.white : LidexColors.ink,
        titleTextStyle: TextStyle(
          color: isDark ? Colors.white : LidexColors.ink,
          fontSize: 21,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: isDark ? const Color(0xFF151816) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 70,
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF101311) : Colors.white,
        indicatorColor: LidexColors.green.withValues(alpha: .12),
        iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
              color: states.contains(WidgetState.selected)
                  ? LidexColors.green
                  : LidexColors.muted,
              size: 24,
            )),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF191D1A) : Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: isDark ? const Color(0xFF252A27) : LidexColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: LidexColors.green, width: 1.5),
        ),
      ),
    );
  }
}
