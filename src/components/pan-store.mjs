// Reactive store (EventTarget + Proxy) and bind helper
// Usage:
//   import { createStore, bind } from './pan-store.js';
//   const store = createStore({ name:'Ada' });
//   const unbind = bind(el, store, { 'input[name=name]':'name' });

export function createStore(initial = {}) {
  const bus = new EventTarget();
  let updating = false; // guards against feedback loops
  let state = structuredClone(initial);

  const proxy = new Proxy(state, {
    set(obj, key, value) {
      if (Object.is(obj[key], value)) return true;
      obj[key] = value;
      if (!updating) bus.dispatchEvent(new CustomEvent('state', { detail: { key, value, state: proxy } }));
      return true;
    }
  });

  const setAll = (obj = {}) => {
    updating = true;
    try { for (const [k,v] of Object.entries(obj)) proxy[k] = v; }
    finally { updating = false; }
  };

  return {
    state: proxy,
    subscribe(fn) { bus.addEventListener('state', fn); return () => bus.removeEventListener('state', fn); },
    snapshot() { return JSON.parse(JSON.stringify(proxy)); },
    set(k, v){ proxy[k] = v; },
    patch(obj){ if (obj && typeof obj === 'object') setAll(obj); },
    update(fn){ const cur = JSON.parse(JSON.stringify(proxy)); const next = fn(cur) || cur; setAll(next); },
    _setAll: setAll,
  };
}

export function bind(el, store, map, opts={}){
  const events = opts.events || ['input','change'];
  const isCheck = (n) => n.type === 'checkbox';
  const isRadio = (n) => n.type === 'radio';
  const get = (n) => isCheck(n) ? !!n.checked : isRadio(n) ? n.value : n.value;
  const set = (n, v) => {
    if (isCheck(n)) n.checked = !!v;
    else if (isRadio(n)) n.checked = n.value === String(v);
    else n.value = v ?? '';
  };

  // UI -> Store
  const unsubs = [];
  for (const [selector, key] of Object.entries(map||{})){
    el.querySelectorAll(selector).forEach(n=>{
      const updateStore = () => { store.state[key] = get(n); };
      for (const ev of events) n.addEventListener(ev, updateStore);
      unsubs.push(()=>{ for (const ev of events) n.removeEventListener(ev, updateStore); });
      set(n, store.state[key]);
    });
  }

  // Store -> UI
  const unsub = store.subscribe(({ detail:{ key, value } })=>{
    for (const [selector, k] of Object.entries(map||{})){
      if (k !== key) continue;
      el.querySelectorAll(selector).forEach(n=> set(n, value));
    }
  });

  return () => { try { unsub(); } catch {}; unsubs.forEach(f=>{ try{ f(); }catch{} }); };
}

export default { createStore, bind };

