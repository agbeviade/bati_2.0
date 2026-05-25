import Anthropic from "@anthropic-ai/sdk";

// Singleton — réutilise la connexion entre les appels serveur
let _client: Anthropic | null = null;

export function getAI(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant dans les variables d'environnement");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const AI_MODEL = "claude-sonnet-4-6";
