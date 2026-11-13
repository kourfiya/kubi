# Kubi 🥚

A Tamagotchi to learn Kubernetes by typing real `kubectl` commands. **English & Français.**

> Kubi is a **teaching simulation**, simplified on purpose. It is not a real cluster: it doesn't replace a lab or the docs.
>
> Kubi est une **simulation pédagogique**, simplifiée exprès. Ce n'est pas un vrai cluster.

## Levels / Niveaux

| Level | Missions | Topics |
| --- | --- | --- |
| Beginner · Débutant | 11 | Deployment, probes, Service, ConfigMap, Secret, rolling update, rollback |
| Intermediate · Intermédiaire | 8 | Resources, nodes, drain, HPA, etcd, namespaces |
| Expert | 8 | Gateway API, PDB, non-root, NetworkPolicy, RBAC, declarative, Terraform + Argo CD |
| Free play · Libre | 4 | No instructions, with hints: self-healing, new version, maintenance, locks |

## Language / Langue

The game picks the browser language, then remembers the choice made with the **English / Français** button.
Force it with the URL: `…/kubi/#en` or `…/kubi/#fr`.

## Run locally

```bash
npm ci
npm start        # builds dist/ then serves http://localhost:3000
```

## How the translation works

- `src/kubi.html` is the game, written in French (single source of truth).
- `i18n/en.json` holds the English text: `js` for the game's strings, `html` for the page markup.
- `scripts/build.mjs` builds `dist/index.html`, a single bilingual page.
- **The build fails** if a French string in the game has no English translation, so a new mission can't ship half-translated.

Adding text: write it in French in `src/kubi.html`, add the English line to `i18n/en.json`, run `npm test`.

## Tests

```bash
npm run lint     # build + HTML validation
npm test         # replays every level end to end, in French and in English,
                 # and checks no French text shows up in the English version
```

## Contributing

1. Branch from `main` (`feat/…`, `fix/…`).
2. Open a Pull Request: CI runs lint and tests.
3. Once merged, the game is published to GitHub Pages automatically.
