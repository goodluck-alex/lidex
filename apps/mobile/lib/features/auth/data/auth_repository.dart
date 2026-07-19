import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:lidex_network/core/network/api_client.dart';

class AuthRepository {
  const AuthRepository(this._api, this._storage);
  final ApiClient _api;
  final FlutterSecureStorage _storage;

  Future<void> login({required String email, required String password}) async {
    final response = await _api.dio.post<Map<String, dynamic>>('/auth/login', data: {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    await _saveTokens(response.data!);
  }

  Future<void> register({required String name, required String email, required String password}) async {
    final response = await _api.dio.post<Map<String, dynamic>>('/auth/register', data: {
      'fullName': name.trim(),
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    await _saveTokens(response.data!);
  }

  Future<void> logout() => _storage.deleteAll();

  Future<void> _saveTokens(Map<String, dynamic> body) async {
    final access = body['accessToken'];
    final refresh = body['refreshToken'];
    if (access is! String || refresh is! String) {
      throw DioException(requestOptions: RequestOptions(), message: 'Authentication tokens are missing');
    }
    await Future.wait([
      _storage.write(key: 'access_token', value: access),
      _storage.write(key: 'refresh_token', value: refresh),
    ]);
  }
}
