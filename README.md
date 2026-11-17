# Kubi 🥚

A Tamagotchi to learn Kubernetes by typing real `kubectl` commands. **Available in English and French.**

> Kubi is a **teaching simulation**, simplified on purpose. It is not a real cluster: it doesn't replace a lab or the documentation.

## Levels

| Level | Missions | Topics |
| --- | --- | --- |
| Discovery | 12 | Deployment, probes, Service, ConfigMap, Secret, rolling update, rollback, then “The meeting”: a quiz on the team's jargon |
| Intermediate | 9 | Resources, nodes, drain, HPA, etcd, namespaces, then the ops meeting |
| Expert | 9 | Gateway API, PDB, non-root, NetworkPolicy, RBAC, declarative config, Terraform + Argo CD, then the security review |
| Free play | 4 | No instructions, with hints: self-healing, new version, maintenance, security |
| No safety net | 5 incidents | Unlocked after Free play: random failures to diagnose and fix, an SLA to hold (90%), hints that cost points |

## Score

Each guided level ends with a meeting and a score out of 100: the meeting (50 points) plus the shop's availability (50 points: 100% SLA is worth 50, 80% or less is worth 0). One to three stars, and a summary to copy.

## Léa's shop

Léa, a pastry chef, runs an online shop, and Kubi runs it for her: each Kubi is a shop assistant (a pod) working at a counter (a node), Kubo is the guard who watches them (a monitoring DaemonSet), and the stockroom is the database. Once Kubi has a public entrance (a LoadBalancer Service, later the Gateway), orders come in: the screen counts orders served and orders lost during outages, and Léa reacts in the terminal.

## SLA

Once Kubi has a public entrance, a synthetic probe knocks on his public entrance every second, like a real uptime monitor. The measured SLA shows on the device screen. A pod can be `Running` while visitors still get errors: the SLA is what users actually see.

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

## License

[MIT](LICENSE) © 2026 Kourfiya CISSE
