# Onboarding assets

Place 4 JPEG/PNG photos here (recommandé : **1080×1920**, ratio 9:16 portrait, < 500 ko chacune).

| Fichier | Sujet conseillé | Recherche Unsplash |
|---|---|---|
| `chantier.jpg` | Chef de chantier sur site BTP en Afrique | "construction worker site", "building africa" |
| `devis.jpg` | Tablette/ordi avec plans, calculs, devis | "architect tablet blueprint", "construction planning" |
| `equipe.jpg` | Ouvriers BTP en groupe sur chantier | "construction team workers", "building workers africa" |
| `stock.jpg` | Matériaux empilés (sacs ciment, fers, briques) | "cement bags construction", "rebar steel building" |

## Sources gratuites recommandées

- **Unsplash** — https://unsplash.com (licence libre, attribution non obligatoire)
- **Pexels** — https://pexels.com
- **Pixabay** — https://pixabay.com

## Optimisation

Avant de committer, compresser les images pour limiter la taille de l'APK :

```sh
# macOS / Linux
brew install jpegoptim
jpegoptim --max=80 --strip-all assets/onboarding/*.jpg

# Windows (avec ImageMagick)
magick mogrify -quality 80 -resize 1080x1920^ -gravity center -extent 1080x1920 assets/onboarding/*.jpg
```

Cible : **< 500 ko / image**. Avec 4 images : ajout d'environ **2 Mo** à l'APK final, acceptable.

## Fallback

Si une image est manquante, l'onboarding affiche un dégradé coloré avec l'icône du module — l'app ne crashe pas.
