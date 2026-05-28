import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

/// Modèle d'une slide d'onboarding.
@immutable
class OnboardingSlide {
  final String imageAsset;
  final IconData icon;
  final String title;
  final String description;
  final Color accent;
  final LinearGradient fallbackGradient;

  const OnboardingSlide({
    required this.imageAsset,
    required this.icon,
    required this.title,
    required this.description,
    required this.accent,
    required this.fallbackGradient,
  });
}

const onboardingSlides = <OnboardingSlide>[
  OnboardingSlide(
    imageAsset: 'assets/onboarding/chantier.jpg',
    icon: Icons.engineering_outlined,
    title: 'Pilotez vos chantiers',
    description:
        'Suivez la progression, photographiez l\'avancement, gérez les dépenses. '
        'Tous vos chantiers BTP réunis dans une seule application.',
    accent: AppColors.primary,
    fallbackGradient: AppColors.gradientHero,
  ),
  OnboardingSlide(
    imageAsset: 'assets/onboarding/devis.jpg',
    icon: Icons.auto_awesome_outlined,
    title: 'Devis en un éclair',
    description:
        'Générez des devis BTP complets en quelques secondes grâce à l\'IA. '
        'Prix réalistes du marché ivoirien 2024, PDF prêt à envoyer.',
    accent: AppColors.orange,
    fallbackGradient: AppColors.gradientOrange,
  ),
  OnboardingSlide(
    imageAsset: 'assets/onboarding/equipe.jpg',
    icon: Icons.groups_2_outlined,
    title: 'Équipes & pointage GPS',
    description:
        'Pointage géolocalisé entrée/sortie, présences, salaires. '
        'Suivez vos ouvriers en temps réel, où qu\'ils soient sur le chantier.',
    accent: AppColors.green,
    fallbackGradient: AppColors.gradientGreen,
  ),
  OnboardingSlide(
    imageAsset: 'assets/onboarding/stock.jpg',
    icon: Icons.inventory_2_outlined,
    title: 'Stock en temps réel',
    description:
        'Entrées, sorties, alertes rupture, mouvements par chantier. '
        'Plus jamais à court de ciment au mauvais moment.',
    accent: AppColors.violet,
    fallbackGradient: AppColors.gradientViolet,
  ),
];
