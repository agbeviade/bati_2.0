# BatiFlow Mobile — État d'avancement

> Audit effectué le 2026-05-27 contre [`CAHIER_DES_CHARGES.md`](../CAHIER_DES_CHARGES.md).
> Stack : Flutter 3.11+ · Riverpod · go_router · supabase_flutter · geolocator · image_picker · flutter_local_notifications · pdf.

---

## 1. Modules — couverture cahier des charges

| Module CDC | Statut | Notes |
|---|---|---|
| **1. Auth** — Email/Pwd | ✅ | [login_page.dart](lib/features/auth/presentation/login_page.dart) + signup. Validation client-side OK. |
| **1. Auth** — Google OAuth / OTP / Téléphone | ❌ | Aucun, seulement email/password. |
| **1. Auth** — Biométrie | ❌ | Pas de `local_auth` dans `pubspec.yaml`. |
| **1. Rôles RBAC** | ✅ | Détection `role == 'client'` redirige vers `/portal/*`. |
| **2. Dashboard** | ✅ | KPIs + alertes + appel `NotificationService.checkAndNotify()` au mount. |
| **3. Chantiers** — CRUD + détail | ✅ | projects/, project_detail_page.dart. Onglets photos/dépenses présents. |
| **3. Timeline chantier** | ❓ | À vérifier dans `project_detail_page.dart` (non audité ligne par ligne). |
| **4. Devis** — Manuel | ✅ | quote_form_page.dart |
| **4. Devis** — IA | ✅ | quote_ai_page.dart — branche sur l'API web `/api/ai/quote`. |
| **4. Devis** — Templates | ✅ | quote_templates_page.dart |
| **4. Devis** — PDF | ✅ | `pdf` + `printing` packages, [pdf_service.dart](lib/core/services/pdf_service.dart). |
| **4. Devis** — Envoi WhatsApp | ❌ | Pas d'intégration WhatsApp côté mobile. |
| **5. Matériaux + Stock** | ✅ | materials/ + movement_form_page.dart |
| **5. Alertes rupture** | ❓ | À vérifier dans `materials_page.dart`. |
| **6. Équipes** | ✅ | teams/ + team_detail_page.dart |
| **6. Pointage** | ✅ | [attendance_page.dart](lib/features/teams/presentation/attendance_page.dart) avec **géolocalisation** check_in/check_out. |
| **6. Salaires** | ❌ | Aucune feature visible. |
| **7. Photos** — Upload | ✅ | `image_picker` utilisé dans dashboard + project_detail. |
| **7. IA Vision sur photos** | ❌ | Pas d'analyse IA des photos uploadées. |
| **7. Rapports auto (IA)** | ❌ | reports_page.dart probablement statique. |
| **8. Espace client** | ✅ | portal/quotes + portal/invoices, shell séparé `ClientShell`. |
| **9. Facturation** | ✅ | invoices/ + paiements via web. |
| **10. Notifications locales** | ⚠️ | Implémentées mais **polling-only** : `checkAndNotify()` au mount du dashboard. Pas de scheduler background. |
| **10. Notifications push (FCM)** | ❌ | Pas de `firebase_messaging`. Aucune notif quand l'app est fermée. |
| **11. IA Vision (photos)** | ❌ | Voir #7. |
| **11. Audio → texte (Whisper)** | ❌ | Pas de `record` / `flutter_sound` / Whisper. |
| **12. Admin** | ❌ | Probablement web-only. |

---

## 2. Gaps **critiques** (à fixer avant prod)

### 🔴 1. Anon key Supabase hardcodée
[`lib/core/supabase/supabase_config.dart`](lib/core/supabase/supabase_config.dart#L9-L13) contient un fallback `defaultValue` avec la vraie anon key. Si le repo est forké ou rendu public, la clé fuit.

**Fix :** retirer le `defaultValue` et faire crasher l'app si la var n'est pas passée :
```dart
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
// puis main.dart : assert(supabaseAnonKey.isNotEmpty, 'SUPABASE_ANON_KEY manquant')
```

### 🔴 2. Pas d'offline-first
Aucune base locale (`sqflite`, `drift`, `isar`, `hive`). **C'est l'inverse du cahier des charges** : « mobile-first, adapté aux réalités africaines » = réseau pourri sur chantier = offline est table stakes.

Conséquences :
- Aucune navigation si pas de réseau (toutes les requêtes Supabase échouent).
- Photos prises sans réseau : pas de queue → perdues si l'utilisateur ferme l'app.
- Pointage entrée/sortie : nécessite réseau au moment du clic → bloque l'ouvrier sur chantier.

**Stack à introduire :**
- `drift` ou `isar` pour la base locale typée.
- Pattern : sync queue (`pending_writes` table locale) + worker qui flush vers Supabase quand le réseau revient.
- `connectivity_plus` pour détecter online/offline.

C'est une **refacto de 2 à 4 semaines** mais essentielle.

### 🔴 3. Pas de tests
[test/widget_test.dart](test/widget_test.dart) est le template Flutter par défaut, vide. Aucun test unitaire ni d'intégration sur **3000+ lignes de code Dart**.

**Minimum viable :**
- Tests unitaires sur les models (`shared/models/models.dart`) — parsing JSON.
- Tests des services (`pdf_service`, `notification_service`).
- 1 test d'intégration `flutter_driver` ou `patrol` sur le golden path : login → liste projets → ouvrir un projet.

### 🟠 4. Pas de Crashlytics / Sentry
Production sans monitoring. Quand l'app crashe chez un utilisateur en Côte d'Ivoire, vous n'aurez aucune trace.

**Fix :** `sentry_flutter` ou `firebase_crashlytics` + breadcrumbs sur les actions critiques (login, sync).

### 🟠 5. Cache de role en variables statiques globales
[`app_router.dart:44-45`](lib/core/router/app_router.dart#L44-L45) : `String? _cachedRole; String? _cachedUid;` au top-level. Acceptable pour l'usage actuel (une seule isolate) mais fragile :
- Race condition si plusieurs streams `onAuthStateChange` arrivent en parallèle.
- Persiste entre les hot-reloads en dev → comportement bizarre.

**Fix :** wrapper dans un `StateNotifier` Riverpod + clear sur signOut.

---

## 3. Gaps non-critiques (roadmap)

| Gap | Priorité | Impact |
|---|---|---|
| Notifications push FCM | Haute | Aujourd'hui l'app ne notifie que quand l'utilisateur ouvre le dashboard. Une facture en retard de 3 jours = pas notifié. |
| WhatsApp Business API | Moyenne | CDC Phase 4. Envoi devis/factures. |
| IA Vision (photos chantier) | Moyenne | CDC Phase 2. Reconnaissance d'éléments BTP, détection de défauts. |
| Audio → texte (Whisper) | Basse | CDC Phase 2. Note vocale chantier → texte. |
| Salaires équipes | Basse | CDC module 6. Pas codé. |
| Biométrie (Face ID / empreinte) | Basse | UX. Évite de retaper le password. |
| Mode sombre auto | Basse | `AppTheme.dark` existe mais pas de switch utilisateur. |
| Internationalisation (i18n) | Basse | Tout en FR codé en dur. Si expansion EN/Wolof/Bambara → refacto via `intl`. |

---

## 4. Qualité code

| Sujet | État |
|---|---|
| Architecture features/core/shared | ✅ Propre, conventionnelle Flutter. |
| go_router config | ✅ Bien typée, redirect logic dans un seul endroit. |
| Riverpod | ⚠️ Présent (`flutter_riverpod` + `ProviderScope`) mais peu de providers visibles — la plupart des pages utilisent `Supabase.instance.client` direct → couplage tight. |
| Tests | ❌ Aucun. |
| Lint | ⚠️ `flutter_lints` configuré, à confirmer que `dart analyze` passe sans warning (`analysis_options.yaml` non audité). |
| `pubspec.yaml` versioning | ⚠️ `1.0.0+1` jamais bumpé. Pas de pipeline release. |
| README | ❌ Template Flutter par défaut. À remplacer par : prérequis, env vars, build android/ios, deploy. |

---

## 5. Recommandations — ordre suggéré

1. **Anon key → env var stricte** (5 min, 0 risque).
2. **Sentry + crash reporting** (1 jour) — pour avoir de la donnée prod avant de prioriser le reste.
3. **Tests unitaires sur les models + 1 test golden path** (2-3 jours).
4. **Push notifications FCM** (3-5 jours) — gros gain UX, débloque les alertes proactives.
5. **Offline-first** (2-4 semaines) — refacto majeure, à planifier comme une phase dédiée.
6. **IA Vision photos** (2 semaines) — feature différentiante du cahier des charges, mais après offline.

---

## 6. Inventaire actuel

**LOC Dart estimé :** ~3000 (40+ fichiers, presque tous des écrans).
**Plugins natifs :** géoloc, caméra, notifs locales, file picker, PDF, URL launcher.
**Dépendances cloud :** Supabase uniquement (auth + DB + storage).
**Plateformes :** Android (config présente) + iOS (config présente).
