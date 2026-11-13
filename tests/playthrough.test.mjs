// Rejoue chaque niveau de bout en bout dans un DOM simulé : toutes les missions doivent se valider.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { build } from '../scripts/build.mjs';

const html = build();

function boot(level, lang = 'fr') {
  const dom = new JSDOM(html, {
    url: `https://kubi.test/#${lang}`,
    runScripts: 'dangerously',
    beforeParse(w) {
      const noop = new Proxy(function () {}, {
        get: (t, k) => (k === 'measureText' ? () => ({ width: 1 }) : noop),
        apply: () => undefined,
        set: () => true,
      });
      w.HTMLCanvasElement.prototype.getContext = () => noop;
      w.setInterval = () => 0;
      w.requestAnimationFrame = () => 0;
      w.matchMedia = () => ({ matches: true });
    },
  });
  const w = dom.window, E = (s) => w.eval(s);
  const cmd = (c) => { w.document.getElementById('cmd').value = c; E('run()'); };
  const T = (n) => { for (let i = 0; i < n; i++) E('tick()'); };
  const cur = () => E('S.mi<MIS.length?MIS[S.mi].id:"END"');
  const first = (f) => E(`(S.pods.find(${f})||{}).name`);
  const term = () => [...w.document.getElementById('term').children].map((d) => d.textContent);
  E(`init(true,'${level}')`);
  return { E, cmd, T, cur, first, term, w };
}

const FR_WORDS = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|une|des|est|pour|avec|sans|dans|puis|tu|ton|qui)\b/gi;
function noFrench(w, where) {
  const body = w.document.body.cloneNode(true);
  body.querySelectorAll('script, template, #lang').forEach((n) => n.remove());
  const text = body.textContent + ' ' + [...w.document.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')).join(' ');
  const hits = [...new Set(text.match(FR_WORDS) || [])];
  if (hits.length) {
    const lines = text.split('\n').filter((l) => FR_WORDS.test(l)).slice(0, 5);
    assert.fail(`texte français dans la version anglaise (${where}) : ${hits.join(', ')}\n${lines.join('\n')}`);
  }
}

function play(level, lang = 'fr') {
  const { E, cmd, T, cur, first, term, w } = boot(level, lang);
  const COLOR = lang === 'en' ? 'color=purple' : 'couleur=violet';
  const plan={
hatch:()=>{cmd('kubectl create deployment kubi --image=kubi:v1');T(4)},
observe:()=>{cmd('kubectl get pods');cmd('kubectl describe pod '+first('p=>1'));cmd('kubectl get events')},
heal:()=>{for(let i=0;i<80&&!first('p=>p.fz');i++)T(1);cmd('kubectl logs '+first('p=>p.fz'));cmd('kubectl delete pod '+first('p=>p.fz'))},
scale:()=>{cmd('kubectl scale deployment kubi --replicas=3');T(4)},
live:()=>{cmd('cat kubi-liveness-probe.yaml');cmd('kubectl apply -f kubi-liveness-probe.yaml');T(25)},
oom:()=>{cmd('kubectl set resources deployment kubi --limits=memory=256Mi');T(30)},
req:()=>{cmd('kubectl set resources deployment kubi --requests=memory=2Gi --limits=memory=2Gi');T(4);cmd('kubectl describe pod '+first("p=>p.st==='Pending'"));cmd('kubectl set resources deployment kubi --requests=memory=200Mi --limits=memory=256Mi');T(30)},
expose:()=>{cmd('kubectl expose deployment kubi --port=80');cmd('kubectl get endpoints kubi')},
ready:()=>{cmd('kubectl apply -f kubi-readiness-probe.yaml');T(40)},
config:()=>{cmd('kubectl create configmap kubi-config --from-literal='+COLOR);cmd('kubectl rollout restart deployment/kubi');T(40)},
secret:()=>{cmd('kubectl create secret generic kubi-secret --from-literal=password=miam');cmd('kubectl get secret kubi-secret -o yaml');cmd('kubectl set env deployment/kubi --from=secret/kubi-secret');T(40)},
gw:()=>{cmd('cat kubi-gateway.yaml');cmd('kubectl apply -f kubi-gateway.yaml');cmd('kubectl get gateway');cmd('kubectl get httproute')},
v2:()=>{cmd('kubectl set image deployment/kubi kubi=kubi:v2');for(let i=0;i<60&&cur()==='v2';i++)T(1)},
undo:()=>{T(8);cmd('kubectl rollout undo deployment/kubi');T(40)},
hist:()=>{cmd('kubectl rollout history deployment/kubi')},
v3:()=>{cmd('kubectl set image deployment/kubi kubi=kubi:v3');T(40)},
spread:()=>{cmd('kubectl get pods -o wide');cmd('kubectl apply -f kubi-spread.yaml');T(50)},
pdb:()=>{cmd('kubectl create pdb kubi --selector=app=kubi --min-available=2');cmd('kubectl get pdb')},
drain:()=>{cmd('kubectl drain node-1 --ignore-daemonsets');for(let i=0;i<80&&!E('S.drained');i++)T(1);cmd('kubectl uncordon node-1')},
hpa:()=>{cmd('kubectl autoscale deployment kubi --min=2 --max=5 --cpu-percent=50');T(6);cmd('kubectl get hpa');cmd('kubectl describe hpa kubi');cmd('kubectl set resources deployment kubi --requests=cpu=100m,memory=200Mi --limits=memory=256Mi');for(let i=0;i<120&&cur()==='hpa';i++)T(1)},
gc:()=>{cmd('sed -i "s/--terminated-pod-gc-threshold=12500/--terminated-pod-gc-threshold=1/" /etc/kubernetes/manifests/kube-controller-manager.yaml');T(15)},
ns:()=>{cmd('kubectl create namespace nursery');cmd('cat kubo-daemonset.yaml');cmd('kubectl apply -f kubo-daemonset.yaml');cmd('kubectl get daemonset -n nursery');T(3)},
nsget:()=>{cmd('kubectl get pods -n nursery');cmd('kubectl get pods -A')},
etcd:()=>{cmd('ETCDCTL_API=3 etcdctl snapshot save /backup/etcd.db');cmd('etcdutl snapshot status /backup/etcd.db')},
nonroot:()=>{cmd('kubectl exec '+first("p=>p.st==='Running'")+' -- id');cmd('cat kubi-secure.yaml');cmd('kubectl apply -f kubi-secure.yaml');T(60);cmd('kubectl exec -it '+first("p=>p.sec&&p.st==='Running'")+' -- id')},
netpol:()=>{const k=E('S.kubo.pods[0].name');cmd('kubectl exec -n nursery '+k+' -- curl kubi');cmd('kubectl exec -n nursery '+k+' -- curl kubi.default');cmd('kubectl apply -f kubi-netpol.yaml');cmd('kubectl exec -n nursery '+k+' -- curl kubi.default')},
rbac:()=>{cmd('kubectl create serviceaccount kubo-watch -n nursery');cmd('kubectl create role pod-reader --verb=get,list --resource=pods');cmd('kubectl create rolebinding kubo-watch --role=pod-reader --serviceaccount=nursery:kubo-watch');cmd('kubectl auth can-i get pods --as=system:serviceaccount:nursery:kubo-watch');cmd('kubectl auth can-i get secrets --as=system:serviceaccount:nursery:kubo-watch');cmd('kubectl set serviceaccount daemonset/kubo kubo-watch -n nursery');T(3)},
tf:()=>{cmd('kubectl config get-contexts');cmd('kubectl apply -f kubi-app.yaml');cmd('cat main.tf');cmd('terraform init');cmd('terraform apply');cmd('yes');cmd('argocd cluster list');cmd('cat kubi-app.yaml');cmd('kubectl apply -f kubi-app.yaml --context mgmt');T(8);cmd('kubectl get applications -n argocd --context mgmt');cmd('argocd app list');cmd('kubectl get pods --context cluster-b')},
skew:()=>{cmd('kubectl drain node-1 --ignore-daemonsets');for(let i=0;i<40&&E('!!S.drainN');i++)T(1);T(3);cmd('kubectl get pods');const pp=first("p=>p.st==='Pending'");if(pp)cmd('kubectl describe pod '+pp);cmd('cat kubi-spread-fix.yaml');cmd('kubectl apply -f kubi-spread-fix.yaml');T(60);cmd('kubectl uncordon node-1');T(5)},
scan:()=>{cmd('trivy image kubi:v3');cmd('trivy image kubi:v3.1');cmd('kubectl set image deployment/kubi kubi='+E('DIG'));T(60)},
decl:()=>{cmd('kubectl diff -f kubi.yaml');cmd('kubectl apply -f kubi.yaml');T(60)}};
  plan.auto = () => {
    cmd('kubectl create deployment kubi --image=kubi:v1'); T(4);
    cmd('kubectl scale deployment kubi --replicas=3');
    cmd('kubectl apply -f kubi-liveness-probe.yaml'); T(20);
    cmd('kubectl expose deployment kubi --port=80');
    cmd('kubectl apply -f kubi-readiness-probe.yaml'); T(30);
    cmd('kubectl set resources deployment kubi --requests=cpu=100m,memory=200Mi --limits=memory=256Mi');
    cmd('kubectl autoscale deployment kubi --min=3 --max=5 --cpu-percent=50'); T(60);
  };
  plan.f2 = () => {
    cmd('kubectl set image deployment/kubi kubi=kubi:v3'); T(40);
    cmd('kubectl set resources deployment kubi --limits=memory=256Mi');
    cmd('kubectl create configmap kubi-config --from-literal='+COLOR);
    cmd('kubectl rollout restart deployment/kubi'); T(40);
    cmd('kubectl create secret generic kubi-secret --from-literal=password=miam');
    cmd('kubectl set env deployment/kubi --from=secret/kubi-secret'); T(60);
  };
  plan.f3 = () => {
    cmd('kubectl apply -f kubi-spread.yaml'); T(60);
    cmd('kubectl create pdb kubi --selector=app=kubi --min-available=2');
    cmd('kubectl drain node-1 --ignore-daemonsets');
    for (let i = 0; i < 80 && !E('S.drained'); i++) T(1);
    cmd('kubectl uncordon node-1'); T(5);
  };
  plan.f4 = () => {
    cmd('kubectl apply -f kubi-secure.yaml'); T(60);
    cmd('kubectl create namespace nursery');
    cmd('cat kubo-daemonset.yaml');cmd('kubectl apply -f kubo-daemonset.yaml');cmd('kubectl get daemonset -n nursery'); T(3);
    const k = E('S.kubo.pods[0].name');
    cmd('kubectl apply -f kubi-netpol.yaml');
    cmd(`kubectl exec -n nursery ${k} -- curl kubi.default`);
    cmd('kubectl apply -f kubi-gateway.yaml'); T(5);
  };
  for (let guard = 0; guard < 40; guard++) {
    const id = cur();
    if (id === 'END') break;
    assert.ok(plan[id], `pas de scénario de test pour la mission ${id}`);
    plan[id](); T(1);
    if (lang === 'en') noFrench(w, id);
    if (cur() === id) T(40);
    if (cur() === id) assert.fail(`bloqué sur la mission ${id}\n` + term().slice(-12).join('\n'));
  }
  assert.equal(cur(), 'END');
  return E('MIS.length');
}

for (const lang of ['fr', 'en']) {
  for (const [level, missions] of [['ckad', 11], ['cka', 8], ['cks', 8], ['free', 4]]) {
    test(`[${lang}] niveau ${level} : ${missions} mission(s) jouables de bout en bout`, () => {
      assert.equal(play(level, lang), missions);
    });
  }
}

test('la langue suit le #fr / #en et le bouton propose l’autre langue', () => {
  const fr = boot('ckad', 'fr'), en = boot('ckad', 'en');
  assert.equal(fr.w.document.documentElement.lang, 'fr');
  assert.equal(en.w.document.documentElement.lang, 'en');
  assert.equal(fr.w.document.getElementById('lang').textContent, 'English');
  assert.equal(en.w.document.getElementById('lang').textContent, 'Français');
  assert.equal(en.w.document.getElementById('lv1').textContent, 'Beginner');
  assert.equal(en.E('MIS[0].t'), 'Hatch Kubi');
});

test('version anglaise : plus aucune phrase française à l’écran', () => {
  const { E, cmd, T, w } = boot('ckad', 'en');
  cmd('help'); cmd('kubectl create deployment kubi --image=kubi:v1'); T(6);
  cmd('kubectl get pods'); cmd('kubectl describe pod ' + E('S.pods[0].name')); cmd('kubectl get events');
  const body = w.document.body.cloneNode(true);
  body.querySelectorAll('script, template, #lang').forEach((n) => n.remove());
  body.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
  const text = body.textContent + [...w.document.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')).join(' ');
  const fr = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|une|des|est|pour|avec|sans|dans|puis|tu|ton|qui)\b/gi;
  assert.deepEqual([...new Set(text.match(fr) || [])], [], 'texte français dans la version anglaise');
});

test('le build refuse une chaîne française sans traduction', async () => {
  const { translateJs } = await import('../scripts/build.mjs');
  const r = translateJs("out('Kubi a très faim')", {});
  assert.deepEqual(r.missing, ['Kubi a très faim']);
});

test('le script de la page se charge sans erreur', () => {
  const { E } = boot('ckad');
  assert.equal(E('typeof exec'), 'function');
});

test('mode libre : les indices se dévoilent en deux temps', () => {
  const { E } = boot('free');
  const doc = E('document');
  const btn = () => doc.querySelector('.fhint button');
  assert.equal(btn().textContent, 'Un indice ?');
  btn().click();
  assert.match(doc.querySelector('.fhint').textContent, /éclore/);
  btn().click();
  assert.match(doc.querySelector('.fhint .fhc').textContent, /create deployment kubi/);
  assert.equal(btn().disabled, true);
});

test('garde-manger : sans mot de passe, les nouveaux Kubi plantent ; sans Secret, ils ne démarrent pas', () => {
  const { E, cmd, T, term } = boot('ckad');
  cmd('kubectl create deployment kubi --image=kubi:v1'); T(4);
  E("S.mi=MIS.findIndex(m=>m.id==='secret');check()");
  E('S.needPantry=true');
  cmd('kubectl rollout restart deployment/kubi'); T(4);
  assert.ok(E("S.pods.some(p=>p.st==='CrashLoopBackOff'&&p.pantry)"), 'un Kubi sans mot de passe doit planter');
  assert.ok(E("S.pods.some(p=>p.st==='Running')"), 'l’ancien Kubi doit tenir');
  cmd(`kubectl logs ${E("S.pods.find(p=>p.pantry).name")}`);
  assert.match(term().join('\n'), /authentication failed/);
  cmd('kubectl create secret generic kubi-secret --from-literal=password=miam');
  cmd('kubectl set env deployment/kubi --from=secret/kubi-secret'); T(20);
  assert.ok(E('done()'), 'avec le Secret, le rollout doit aboutir');
  cmd('kubectl delete secret kubi-secret');
  cmd(`kubectl delete pod ${E('S.pods[0].name')}`); T(4);
  assert.ok(E("S.pods.some(p=>p.st==='CreateContainerConfigError')"));
  cmd('kubectl create secret generic kubi-secret --from-literal=password=miam'); T(6);
  assert.ok(!E("S.pods.some(p=>p.st==='CreateContainerConfigError')"), 'le pod doit repartir quand le Secret revient');
});

test('Kubo est un DaemonSet : un pod par œuf, qui reste pendant un drain', () => {
  const { E, cmd, T, term } = boot('cks');
  assert.equal(E('S.kubo.pods.length'), E('S.nodes.length'));
  cmd('kubectl drain node-1 --ignore-daemonsets');
  for (let i = 0; i < 60 && E('!!S.drainN'); i++) T(1);
  assert.ok(E("S.kubo.pods.some(p=>p.node==='node-1')"), 'le Kubo de node-1 doit rester');
  assert.match(term().join('\n'), /ignoring DaemonSet-managed Pods: kube-system\/kube-proxy, nursery\/kubo-/);
  cmd('kubectl create deployment kubo --image=kubo:v1 -n nursery');
  assert.match(term().join('\n'), /DaemonSet/);
});
