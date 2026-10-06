// Première 2026 : réglages du site.
// La clé « publishable » (sb_publishable_...) ou « anon » est PUBLIQUE : elle est faite pour être dans la page.
// La sécurité est dans les règles de la base (schema.sql), pas dans cette clé.
// Remplace les deux valeurs par celles de ton projet Supabase : Settings > API Keys.
window.P26_CONFIG = {
  url: "https://qwdptatkmzrkvvypbokx.supabase.co",      // ex. https://abcdefghijkl.supabase.co
  anonKey: "sb_publishable_lasMoRuUqFCP1TYZ5lmfyg__GMGHb2n" // ex. sb_publishable_... (ou eyJhbGciOi... pour la clé anon)
};
