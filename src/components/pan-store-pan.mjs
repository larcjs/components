// Store ↔ PAN bridge helpers
// - syncItem: keeps a store in sync with `${resource}.item.state.${id}` and auto-saves changes
// - syncList: tracks `${resource}.list.state` and granular `${resource}.item.state.*` into an array store

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export function syncItem(store, { resource='items', id=null, key='id', live=true, autoSave=true, debounceMs=300, followSelect=true } = {}){
  const pc = new PanClient();
  let currentId = id;
  let offLive = null; let offSel = null; let saving = false; let t = null; let applying = 0;

  function applyItem(item){
    applying++;
    try { if (item && typeof item==='object') store._setAll(item); }
    finally { applying--; }
  }

  function subscribeLive(){
    try { offLive && offLive(); } catch {} offLive = null;
    if (!live || !currentId) return;
    offLive = pc.subscribe(`${resource}.item.state.${currentId}`, (m)=>{
      const d = m?.data || {};
      if (d.deleted) { if (String(currentId) === String(d.id)) applyItem({}); return; }
      if (d.item) applyItem(d.item);
      else if (d.patch) store.patch(d.patch);
      else if (d && typeof d==='object') store.patch(d);
    }, { retained: true });
  }

  function onStoreChange(){
    if (!autoSave || !currentId) return;
    if (applying>0) return; // ignore remote updates
    clearTimeout(t);
    t = setTimeout(async ()=>{
      try {
        saving = true;
        const item = store.snapshot();
        await pc.request(`${resource}.item.save`, { item });
      } catch {} finally { saving = false; }
    }, Math.max(0, debounceMs|0));
  }

  // Initial wiring
  const unsubStore = store.subscribe(onStoreChange);
  if (followSelect) offSel = pc.subscribe(`${resource}.item.select`, async (m)=>{
    const sel = m?.data?.id; if (!sel) return;
    currentId = sel; subscribeLive();
    try { const { data } = await pc.request(`${resource}.item.get`, { id: sel }); if (data?.item) applyItem(data.item); } catch {}
  });
  if (currentId) { subscribeLive(); (async()=>{ try { const { data } = await pc.request(`${resource}.item.get`, { id: currentId }); if (data?.item) applyItem(data.item); } catch {} })(); }

  return ()=>{ try{ offLive&&offLive(); }catch{} try{ offSel&&offSel(); }catch{} try{ unsubStore&&unsubStore(); }catch{} clearTimeout(t); };
}

export function syncList(store, { resource='items', key='id', live=true } = {}){
  const pc = new PanClient();
  let items = [];
  function render(){ store._setAll({ items }); }
  function applyItem(d, topic){
    // Determine id
    let id = d?.id ?? d?.item?.[key] ?? d?.item?.id;
    if (id==null && topic) { const parts = String(topic).split('.'); id = parts[parts.length-1]; }
    if (id==null) return;
    const idx = items.findIndex(x => String(x?.[key] ?? x?.id) === String(id));
    if (d.deleted) { if (idx>=0) items.splice(idx,1); return; }
    if (d.item && typeof d.item==='object') { if (idx>=0) items[idx]=d.item; else items.push(d.item); return; }
    const patch = d.patch || d;
    if (patch && typeof patch==='object') { const base = idx>=0 ? items[idx] : {}; const next = Object.assign({}, base, patch); if (idx>=0) items[idx]=next; else items.push(next); }
  }
  const offA = pc.subscribe(`${resource}.list.state`, (m)=>{ items = m?.data?.items || []; render(); }, { retained:true });
  const offB = live ? pc.subscribe(`${resource}.item.state.*`, (m)=>{ applyItem(m?.data||{}, m?.topic); render(); }) : null;
  pc.publish({ topic: `${resource}.list.get`, data:{} });
  return ()=>{ try{ offA&&offA(); }catch{} try{ offB&&offB(); }catch{} };
}

export default { syncItem, syncList };

