import 'package:shared_preferences/shared_preferences.dart';

/// Wrapper SharedPreferences pour le flag "onboarding vu".
///
/// L'instance est chargée une fois au boot dans `main.dart` puis exposée
/// en singleton — le routeur peut interroger `hasSeenOnboarding` de façon
/// synchrone dans son redirect.
class OnboardingRepo {
  static const _key = 'onboarding_seen_v1';
  final SharedPreferences _prefs;

  OnboardingRepo._(this._prefs);

  static OnboardingRepo? _instance;
  static OnboardingRepo get instance {
    final i = _instance;
    if (i == null) {
      throw StateError(
        'OnboardingRepo non initialisé — appeler OnboardingRepo.init() dans main.dart avant runApp.',
      );
    }
    return i;
  }

  static Future<OnboardingRepo> init() async {
    final prefs = await SharedPreferences.getInstance();
    return _instance = OnboardingRepo._(prefs);
  }

  bool get hasSeenOnboarding => _prefs.getBool(_key) ?? false;

  Future<void> markSeen() => _prefs.setBool(_key, true);

  /// Utile en debug pour re-afficher l'onboarding.
  Future<void> reset() => _prefs.remove(_key);
}
