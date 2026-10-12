# GameOfLife PHONE

Client joueur, pensé mobile d'abord, avec une ambiance de jeu.

**Parcours** :
1. **Connexion**, avec les identifiants fournis par l'organisateur. Il n'y a pas d'inscription.
2. **Saisie du code** de la partie (6 cases). Un lien `/?code=ABC123` pré-remplit le code après la connexion.
3. **Partie** : salle d'attente, puis partie en cours, puis fin. On y voit la liste des joueurs et un chat. C'est l'organisateur qui lance et termine la partie depuis ADMIN.
4. **Profil** : nom, identifiant, parties jouées, déconnexion.

Les joueurs ne peuvent pas créer de partie : seuls les admins le peuvent.

**Paramètres et maintenance** : le nom du jeu et le message d'accueil viennent des paramètres de l'admin (`GET /api/status`). En maintenance, l'application affiche un écran dédié avec le message et l'heure de retour, puis revient toute seule quand la maintenance se termine (vérification toutes les 15 s).

**Stack** : React 19 · Vite · TypeScript · socket.io-client. Pas de routeur : l'écran affiché dépend de l'état (session, puis partie).

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173 (l'API doit tourner sur :3000)
npm run build    # dist/ statique (~86 Ko gzip)
```

En dev, Vite redirige `/api` et `/socket.io` vers l'API (même origine : cookies et WebSocket fonctionnent sans CORS).
Variables optionnelles : `VITE_API_URL` (URL de l'API si elle est sur un autre domaine en production) et `VITE_API_PROXY` (cible du proxy de dev).

## Structure

```
src/
  protocol.ts            COPIE du contrat de l'API (gameoflife-api/src/game/protocol.ts) : à garder synchronisée
  lib/api.ts             client HTTP (token en mémoire, refresh automatique, gestion multi-onglets)
  lib/session.tsx        contexte de session
  lib/game.tsx           connexion Socket.IO, état de la partie, chat, call() typé avec timeout
  lib/status.tsx         nom du jeu, message d'accueil, maintenance
  screens/               Login, Home (code), Room, Profile, Maintenance
  components/            Chat
```

L'écran de partie (`screens/RoomScreen.tsx`) est un socle neutre : l'interface du jeu viendra s'ajouter dans la zone « stage » quand les règles seront définies.

## Sécurité

- Access token jamais stocké (ni localStorage ni cookie lisible) ; la session repose sur un cookie `httpOnly`.
- Tout le texte est rendu par React (échappé automatiquement) : aucun `dangerouslySetInnerHTML`.
- En production, servir `dist/` avec ces en-têtes (exemple nginx) :

```nginx
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss://api.exemple.com https://api.exemple.com; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location / { try_files $uri /index.html; add_header Cache-Control "no-cache"; }
```
