import 'package:flutter_test/flutter_test.dart';
import 'package:lidex_network/config/app_config.dart';

void main() {
  group('Lidex reward conversion', () {
    test('100 points equal one LDX', () {
      const points = 24560;
      expect(points / AppConfig.pointsPerLdx, 245.6);
    });

    test('monthly unlock is capped at twenty percent', () {
      const locked = 1000.0;
      expect(locked * AppConfig.monthlyUnlockRate, 200);
    });
  });
}
