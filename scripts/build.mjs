// Construit la page bilingue (FR/EN) à partir de src/kubi.html (source FR) et i18n/en.json.
//   node scripts/build.mjs              -> dist/index.html  (page complète, GitHub Pages)
//   node scripts/build.mjs --artifact   -> dist/artifact.html (sans <!DOCTYPE>/<head>, pour claude.ai)
// Le build échoue si une chaîne française du jeu n'a pas de traduction anglaise.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'acorn';

const root = new URL('../', import.meta.url);
const src = readFileSync(new URL('src/kubi.html', root), 'utf8');
const dict = JSON.parse(readFileSync(new URL('i18n/en.json', root), 'utf8'));

// Chaînes qui pilotent la logique du jeu : jamais traduites (valeurs de couleur, alias, noms de ressources).
export const KEEP = new Set(['aide', 'couleur', 'rose', 'bleu', 'vert', 'jaune', 'violet', 'rouge', 'miam', 'nursery', 'none', 'free']);
// Indices qu'une chaîne est en français.
export const FRENCH = /[àâçéèêëîïôûùüÿœæÀÂÇÉÈÊËÎÏÔÛÙÜŸŒ’«»]|\b(le|la|les|un|une|des|du|et|est|pour|avec|sans|pas|ton|ta|tes|son|sa|ses|il|elle|qui|que|dans|sur|tout|puis|ou|au|aux|ne|plus|nouveau|nouvelle|indice|commande|choisis|mission|chapitre|niveau|chambre|maison|visiteurs|dossier|fichier|taille|nom|jumeau|tape|introuvable|fais|rends|humeur|heureux|malade|triste|sale|dort|vide|crotte|copie)\b/i;

const parts = (html) => {
  const ts = html.indexOf('<style>'), te = html.indexOf('</style>') + 8;
  const ss = html.indexOf('<script>'), se = html.indexOf('</script>');
  return { head: html.slice(0, ts), style: html.slice(ts, te), markup: html.slice(te, ss).trim(), js: html.slice(ss + 8, se) };
};

function literals(js) {
  const out = [];
  (function walk(n, parent) {
    if (!n || typeof n.type !== 'string') return;
    const isKey = parent && parent.type === 'Property' && parent.key === n && !parent.computed;
    if (n.type === 'Literal' && typeof n.value === 'string' && !isKey) out.push(n);
    for (const k in n) {
      const c = n[k];
      if (Array.isArray(c)) c.forEach((x) => walk(x, n));
      else if (c && typeof c.type === 'string') walk(c, n);
    }
  })(parse(js, { ecmaVersion: 2022 }), null);
  return out;
}

export function translateJs(js, map) {
  const missing = new Set();
  let out = '', pos = 0;
  for (const n of literals(js).sort((a, b) => a.start - b.start)) {
    const v = n.value;
    if (KEEP.has(v)) continue;
    if (Object.hasOwn(map, v)) {
      out += js.slice(pos, n.start) + JSON.stringify(map[v]).replace(/<\/(script)/gi, '<\\/$1');
      pos = n.end;
    } else if (FRENCH.test(v)) missing.add(v);
  }
  return { js: out + js.slice(pos), missing: [...missing] };
}

export function translateMarkup(markup, map) {
  let out = markup;
  for (const [fr, en] of Object.entries(map).sort((a, b) => b[0].length - a[0].length)) {
    if (!out.includes(fr)) throw new Error(`i18n/en.json (html) : texte introuvable dans le markup : ${fr}`);
    out = out.split(fr).join(en);
  }
  return out;
}

const LOADER = `(function(){var L,d=document;try{var h=location.hash.slice(1);if(h==='en'||h==='fr')L=h;if(!L)L=localStorage.getItem('kubi-lang')}catch(e){}
if(L!=='en'&&L!=='fr')L=/^fr\\b/i.test(navigator.language||'')?'fr':'en';
d.documentElement.lang=L;
if(L==='en'){var t=d.getElementById('tpl-en');d.querySelector('main').replaceChildren(t.content.cloneNode(true))}
var s=d.createElement('script');s.textContent=d.getElementById('js-'+L).textContent;d.body.appendChild(s);
d.getElementById('lang').addEventListener('click',function(){var n=L==='fr'?'en':'fr';try{localStorage.setItem('kubi-lang',n)}catch(e){}location.hash=n;location.reload()})})();`;

export function build({ artifact = false } = {}) {
  const p = parts(src);
  const en = translateJs(p.js, dict.js);
  if (en.missing.length) {
    throw new Error(`${en.missing.length} chaîne(s) sans traduction dans i18n/en.json (js) :\n` + en.missing.map((m) => '  ' + JSON.stringify(m)).join('\n'));
  }
  const body = [
    p.markup,
    `<template id="tpl-en">${translateMarkup(p.markup, dict.html).replace(/^<main>|<\/main>$/g, '')}</template>`,
    `<script type="text/plain" id="js-fr">${p.js}</script>`,
    `<script type="text/plain" id="js-en">${en.js}</script>`,
    `<script>${LOADER}</script>`,
  ].join('\n');
  if (artifact) return p.head.trim() + '\n' + p.style + '\n' + body + '\n';
  const style = p.style.replace('<style>', '<style>\n:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}\n[hidden]{display:none!important}');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Kubi, a Tamagotchi to learn Kubernetes with real kubectl commands. Kubi, un Tamagotchi pour apprendre Kubernetes avec de vraies commandes kubectl.">
${p.head.trim()}
${style}
</head>
<body>
${body}
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = process.argv.includes('--artifact');
  mkdirSync(new URL('dist/', root), { recursive: true });
  const file = artifact ? 'dist/artifact.html' : 'dist/index.html';
  writeFileSync(new URL(file, root), build({ artifact }));
  console.log(`${file} écrit`);
}
