import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/onboarding_repo.dart';
import 'onboarding_data.dart';

/// Onboarding plein écran — 4 slides immersives avec :
/// - parallax sur l'image (déplacement contraire au swipe)
/// - card flottante en bas (titre + description)
/// - indicateurs pill animés (largeur 8 → 28px sur l'actif)
/// - bouton qui mute "Suivant" → "Commencer" sur la dernière slide
/// - bouton "Passer" en haut à droite
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _controller = PageController();
  double _page = 0;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Status bar : icônes blanches pour lisibilité sur image
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    _controller.addListener(() {
      final p = _controller.page ?? 0;
      if ((p - _page).abs() > 0.001) {
        setState(() {
          _page = p;
          _currentIndex = p.round();
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await OnboardingRepo.instance.markSeen();
    if (mounted) context.go('/login');
  }

  void _next() {
    if (_currentIndex == onboardingSlides.length - 1) {
      _finish();
    } else {
      _controller.nextPage(
        duration: const Duration(milliseconds: 480),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentIndex == onboardingSlides.length - 1;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Slides plein écran avec parallax ────────────────────────
          PageView.builder(
            controller: _controller,
            itemCount: onboardingSlides.length,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, index) {
              final slide = onboardingSlides[index];
              // Distance entre la slide et la position courante (-1, 0, +1)
              final delta = index - _page;
              return _OnboardingSlideView(slide: slide, delta: delta);
            },
          ),

          // ── Bouton "Passer" en haut à droite ────────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 8,
            child: AnimatedOpacity(
              opacity: isLast ? 0 : 1,
              duration: const Duration(milliseconds: 300),
              child: TextButton(
                onPressed: isLast ? null : _finish,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  textStyle: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                child: const Text('Passer'),
              ),
            ),
          ),

          // ── Indicateurs pill + CTA en bas ───────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Indicateurs animés
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(onboardingSlides.length, (i) {
                        final active = i == _currentIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 320),
                          curve: Curves.easeOutCubic,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: active ? 28 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: active
                                ? onboardingSlides[_currentIndex].accent
                                : Colors.white.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 24),
                    // CTA principal
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _next,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: onboardingSlides[_currentIndex].accent,
                          foregroundColor: Colors.white,
                          elevation: 8,
                          shadowColor: onboardingSlides[_currentIndex]
                              .accent
                              .withValues(alpha: 0.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (child, anim) => FadeTransition(
                            opacity: anim,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 0.3),
                                end: Offset.zero,
                              ).animate(anim),
                              child: child,
                            ),
                          ),
                          child: Row(
                            key: ValueKey(isLast),
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                isLast ? 'Commencer' : 'Suivant',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                isLast
                                    ? Icons.rocket_launch_outlined
                                    : Icons.arrow_forward_rounded,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Une slide individuelle :
/// - background = image (ou dégradé de fallback) avec parallax horizontal
/// - dégradé sombre au-dessous pour lisibilité
/// - badge icône au centre + card flottante en bas avec titre + description
class _OnboardingSlideView extends StatelessWidget {
  final OnboardingSlide slide;
  final double delta;

  const _OnboardingSlideView({required this.slide, required this.delta});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    // Parallax horizontal : l'image bouge à 40% du swipe (effet de profondeur)
    final parallaxX = -delta * size.width * 0.4;
    // Fade-in du contenu : seulement quand la slide est proche de l'écran
    final contentOpacity = (1 - delta.abs()).clamp(0.0, 1.0);
    final contentTranslate = delta.abs() * 30;

    return Stack(
      fit: StackFit.expand,
      children: [
        // ── Background image (avec parallax) ──────────────────────────
        Transform.translate(
          offset: Offset(parallaxX, 0),
          child: OverflowBox(
            maxWidth: size.width * 1.4,
            child: _BackgroundImage(slide: slide),
          ),
        ),

        // ── Dégradé sombre pour lisibilité du texte ───────────────────
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withValues(alpha: 0.15),
                Colors.black.withValues(alpha: 0.45),
                Colors.black.withValues(alpha: 0.85),
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        ),

        // ── Contenu : badge icône (centre) + card flottante (bas) ─────
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 180),
            child: Opacity(
              opacity: contentOpacity,
              child: Transform.translate(
                offset: Offset(0, contentTranslate),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Spacer(),
                    // Badge icône
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: slide.accent,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: slide.accent.withValues(alpha: 0.5),
                            blurRadius: 24,
                            spreadRadius: 0,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Icon(slide.icon, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 28),
                    // Titre
                    Text(
                      slide.title,
                      style: GoogleFonts.inter(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Description
                    Text(
                      slide.description,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        color: Colors.white.withValues(alpha: 0.85),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Image de fond, avec fallback gradient + icône si l'asset est manquant.
class _BackgroundImage extends StatelessWidget {
  final OnboardingSlide slide;
  const _BackgroundImage({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      slide.imageAsset,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      errorBuilder: (context, error, stack) {
        // Fallback : dégradé coloré avec gros icône — pas de crash si
        // l'utilisateur n'a pas encore mis les jpgs dans assets/onboarding/
        return Container(
          decoration: BoxDecoration(gradient: slide.fallbackGradient),
          child: Center(
            child: Icon(
              slide.icon,
              color: Colors.white.withValues(alpha: 0.15),
              size: 240,
            ),
          ),
        );
      },
    );
  }
}
