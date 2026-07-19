import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'session_state.freezed.dart';

@freezed
class SessionState with _$SessionState {
  const factory SessionState.unauthenticated() = _Unauthenticated;
  const factory SessionState.guest() = _Guest;
  const factory SessionState.authenticated({required String accessToken}) = _Authenticated;
}

final sessionStateProvider = StateProvider<SessionState>((_) => const SessionState.unauthenticated());
