# Kubi 🥚

A Tamagotchi to learn Kubernetes by typing real `kubectl` commands. **Available in English and French.**

> Kubi is a **teaching simulation**, simplified on purpose. It is not a real cluster: it doesn't replace a lab or the documentation.

## Levels

| Level | Missions | Topics |
| --- | --- | --- |
| Beginner | 11 | Deployment, probes, Service, ConfigMap, Secret, rolling update, rollback |
| Intermediate | 8 | Resources, nodes, drain, HPA, etcd, namespaces |
| Expert | 8 | Gateway API, PDB, non-root, NetworkPolicy, RBAC, declarative config, Terraform + Argo CD |
| Free play | 4 | No instructions, with hints: self-healing, new version, maintenance, security |

## Language

The game follows the browser language, then remembers the choice made with the **English / Français** button.
To force a language, add it to the link: `…/kubi/#en` or `…/kubi/#fr`.

## Run locally

```bash
npm ci
npm start        # builds dist/ then serves http://localhost:3000
```

## How translation works

- `src/kubi.html` is the game, written in French: it is the single source.
- `i18n/en.json` holds the English text: `js` for the game's strings, `html` for the rest of the page.
- `scripts/build.mjs` builds `dist/index.html`, a single bilingual page.
- **The build fails** if a French string in the game has no English translation, so a new mission can't ship half-translated.

To add text: write it in French in `src/kubi.html`, add its translation to `i18n/en.json`, then run `npm test`.

## Tests

```bash
npm run lint     # build + HTML validation
npm test         # replays every level end to end, in French and in English,
                 # and checks that no French text shows up in the English version
```

## Contributing

1. Create a branch from `main` (`feat/…`, `fix/…`).
2. Open a Pull Request: CI runs lint and tests.
3. Once reviewed and merged, the game is published to GitHub Pages automatically.