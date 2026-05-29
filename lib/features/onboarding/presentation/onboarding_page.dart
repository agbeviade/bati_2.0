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
  int _currentIndex = 0;
  bool _imagesPrecached = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    // Throttle au changement d'index entier seulement. La parallax continue
    // (basée sur _controller.page) est gérée localement par chaque slide via
    // AnimatedBuilder, donc le parent ne se rebuild PAS à chaque frame de
    // scroll → fini les saccades.
    _controller.addListener(_onPageChanged);
  }

  void _onPageChanged() {
    final p = _controller.page;
    if (p == null) return;
    final newIndex = p.round();
    if (newIndex != _currentIndex) {
      setState(() => _currentIndex = newIndex);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Précharge les 4 JPG une fois pour éviter le hitch lors du premier swipe.
    if (!_imagesPrecached) {
      _imagesPrecached = true;
      for (final slide in onboardingSlides) {
        precacheImage(AssetImage(slide.imageAsset), context);
      }
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onPageChanged);
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
              return _OnboardingSlideView(
                slide: onboardingSlides[index],
                index: index,
                controller: _controller,
              );
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

/// Une slide individuelle. Écoute le PageController localement via
/// AnimatedBuilder pour calculer sa parallax et son fade — ainsi le parent
/// n'a pas besoin de setState à chaque frame de scroll.
class _OnboardingSlideView extends StatelessWidget {
  final OnboardingSlide slide;
  final int index;
  final PageController controller;

  const _OnboardingSlideView({
    required this.slide,
    required this.index,
    required this.controller,
  });

  // Le gradient ne dépend ni de delta ni du thème → const, partagé.
  static const _darkenGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x26000000), Color(0x73000000), Color(0xD9000000)],
    stops: [0.0, 0.5, 1.0],
  );

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Stack(
      fit: StackFit.expand,
      children: [
        // ── Background avec parallax ─────────────────────────────────
        // ClipRect contraint l'image à la zone visible de la slide pour
        // qu'elle ne déborde PAS sur la slide voisine pendant le swipe
        // (sinon on voit des bandes verticales : la slide adjacente +
        // notre image qui dépasse de l'OverflowBox + leur intersection).
        ClipRect(
          child: RepaintBoundary(
            child: AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                final page = controller.hasClients ? (controller.page ?? index.toDouble()) : index.toDouble();
                final delta = index - page;
                return Transform.translate(
                  offset: Offset(-delta * size.width * 0.4, 0),
                  child: child,
                );
              },
              child: OverflowBox(
                maxWidth: size.width * 1.4,
                child: _BackgroundImage(slide: slide),
              ),
            ),
          ),
        ),

        // ── Dégradé sombre — const, jamais re-build ──────────────────
        const DecoratedBox(
          decoration: BoxDecoration(gradient: _darkenGradient),
          child: SizedBox.expand(),
        ),

        // ── Contenu : badge icône + titre + description ──────────────
        // AnimatedBuilder local : seul ce sous-arbre se rebuild quand le
        // scroll change la valeur de page. Le titre/description restent
        // identiques entre les rebuilds (child immuable).
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 180),
            child: AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                final page = controller.hasClients ? (controller.page ?? index.toDouble()) : index.toDouble();
                final deltaAbs = (index - page).abs();
                return Opacity(
                  opacity: (1 - deltaAbs).clamp(0.0, 1.0),
                  child: Transform.translate(
                    offset: Offset(0, deltaAbs * 30),
                    child: child,
                  ),
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Spacer(),
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
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Icon(slide.icon, color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 28),
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
