import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stream de l'état réseau de l'appareil.
///
/// `true` = au moins une interface réseau active (wifi/mobile/ethernet).
/// `false` = aucune interface (mode avion, pas de signal, etc.).
///
/// ⚠️ "Connecté à internet" ≠ "internet accessible". L'OS peut rapporter
/// un wifi actif derrière un captive portal ou un DNS cassé. Pour une
/// vraie check, faire un ping HTTPS périodique. V1 suffit pour 80% des cas.
final connectivityProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();

  // Émet l'état initial immédiatement
  final initial = await connectivity.checkConnectivity();
  yield _isOnline(initial);

  // Puis chaque changement
  await for (final results in connectivity.onConnectivityChanged) {
    yield _isOnline(results);
  }
});

bool _isOnline(List<ConnectivityResult> results) {
  return results.any((r) =>
      r == ConnectivityResult.wifi ||
      r == ConnectivityResult.mobile ||
      r == ConnectivityResult.ethernet ||
      r == ConnectivityResult.vpn);
}
