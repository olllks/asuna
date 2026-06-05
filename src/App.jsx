import React from 'react'

// Stage images from public/images/
const IMGS = {
  stage1:  '/images/stage1.png',
  stage2:  '/images/stage2.png',
  stage3:  '/images/stage3.png',
  stage4:  '/images/stage4.png',
  stage5:  '/images/stage5.png',
  stage6:  '/images/stage6.png',
  stage7:  '/images/stage7.png',
  stage8:  '/images/stage8.png',
  stage9:  '/images/stage9.png',
  stage10: '/images/stage10.png',
}

const STAGES = [
  { id:0, img:"stage1",  name:"Насінина",       hint:"Ідею посаджено. Перша дія вирощує паросток.",   need:1 },
  { id:1, img:"stage2",  name:"Паросток",        hint:"Перші кроки. Ще трохи поливу.",                need:2 },
  { id:2, img:"stage3",  name:"Міцний паросток", hint:"Росте! Не зупиняйтесь.",                       need:2 },
  { id:3, img:"stage4",  name:"Деревце",         hint:"Вже має форму. Розвивайте далі.",               need:3 },
  { id:4, img:"stage5",  name:"Молоде дерево",   hint:"Добре зміцніло. Продовжуйте!",                 need:3 },
  { id:5, img:"stage6",  name:"Дерево",          hint:"Міцне й стале.",                               need:3 },
  { id:6, img:"stage7",  name:"Могутнє дерево",  hint:"Коріння глибоке. Вже майже!",                  need:3 },
  { id:7, img:"stage8",  name:"Цвітіння 🌸",     hint:"У всій красі. Плоди зовсім близько.",          need:3 },
  { id:8, img:"stage9",  name:"Перший плід 🍎",  hint:"Перший результат! Далі більше.",               need:3 },
  { id:9, img:"stage10", name:"Урожай 🍎🍎🍎",   hint:"Проєкт приносить плоди! Можна збирати.",       need:0 },
]
const FIRST_HARVEST = 8

const KEY = "asuna_v1"
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6)
const fmt = (ms) => new Date(ms).toLocaleDateString("uk-UA",{day:"numeric",month:"short"})

function dayPhase() { const h = new Date().getHours() + new Date().getMinutes()/60; return h/24 }
function skyFor(p) {
  const h = p * 24
  if (h < 5 || h >= 21) return { top:"#0d1530", bot:"#1c2647", dark:true }
  if (h < 8)  return { top:"#46598c", bot:"#f0b27a", dark:false }
  if (h < 17) return { top:"#86cfe8", bot:"#eef6df", dark:false }
  return { top:"#ea7d5a", bot:"#f6cd8c", dark:false }
}

function lineageLayout(trees) {
  const NW=92, NH=104, GAP_X=20, GAP_Y=64, TREE_GAP=48
  const active = trees.filter(t => !t.wilted && !t.finished)
  if (!active.length) return { nodes:[], edges:[], w:0, h:0, NW, NH }

  const childMap = {}
  active.forEach(t => {
    const p = t.parentId || "__root__"
    if (!childMap[p]) childMap[p] = []
    childMap[p].push(t)
  })

  function leafCount(t) {
    const ch = childMap[t.id] || []
    if (!ch.length) return 1
    return ch.reduce((s,c) => s + leafCount(c), 0)
  }

  const nodes = []

  function place(t, depth, startX) {
    const ch = childMap[t.id] || []
    const leaves = leafCount(t)
    const totalW = leaves * (NW + GAP_X) - GAP_X
    const cx = startX + totalW / 2 - NW / 2
    const cy = depth * (NH + GAP_Y)
    nodes.push({ tree:t, x:cx, y:cy })
    let childX = startX
    ch.forEach(c => {
      const cLeaves = leafCount(c)
      const cW = cLeaves * (NW + GAP_X) - GAP_X
      place(c, depth + 1, childX)
      childX += cW + GAP_X
    })
    return totalW
  }

  const roots = childMap["__root__"] || []
  let curX = 0
  roots.forEach(r => {
    const usedW = place(r, 0, curX)
    curX += usedW + TREE_GAP
  })

  const edges = active
    .filter(t => t.parentId)
    .map(t => {
      const from = nodes.find(n => n.tree.id === t.parentId)
      const to   = nodes.find(n => n.tree.id === t.id)
      if (!from || !to) return null
      return { id:t.id, x1:from.x+NW/2, y1:from.y+NH, x2:to.x+NW/2, y2:to.y }
    }).filter(Boolean)

  const maxX = nodes.reduce((m,n) => Math.max(m, n.x+NW+20), 300)
  const maxY = nodes.reduce((m,n) => Math.max(m, n.y+NH+20), 200)
  return { nodes, edges, w:maxX, h:maxY, NW, NH }
}

export default function App() {
  const { useState, useEffect, useCallback, useMemo } = React

  const [trees, setTrees]   = useState([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(null)
  const [newName, setNewName] = useState("")
  const [selId, setSelId]   = useState(null)
  const [preview, setPreview] = useState(null)
  const [filter, setFilter] = useState("active")
  const [view, setView]     = useState("garden")
  const [phase, setPhase]   = useState(dayPhase())
  const [splash, setSplash] = useState(null)

  const sky = skyFor(phase)
  const dark = sky.dark
  const txt  = dark ? "#e8f0d8" : "#1e3810"
  const soft = dark ? "#8ba87a" : "#5a7a4a"
  const bg   = `linear-gradient(180deg, ${sky.top} 0%, ${sky.bot} 100%)`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setTrees(JSON.parse(saved))
    } catch(e) {}
    setLoaded(true)
    const i = setInterval(() => setPhase(dayPhase()), 60000)
    return () => clearInterval(i)
  }, [])

  const save = useCallback(next => {
    setTrees(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch(e) {}
  }, [])

  const byId = id => trees.find(t => t.id === id)
  const sel  = byId(selId)

  const plant = () => {
    const name = newName.trim(); if(!name) return
    const parentId = adding?.parentId || null
    const parent = parentId ? byId(parentId) : null
    const gen = parent ? (parent.gen||0)+1 : 0
    const entry = parent ? `Посаджено як гілку від «${parent.name}»` : "Посаджено сімʼячко 🌱"
    save([{ id:uid(), name, parentId, gen, stage:0, drops:0, picked:0, harvests:0, basket:0,
            wilted:false, finished:false, plantedAt:Date.now(),
            log:[{t:Date.now(),text:entry}] }, ...trees])
    setNewName(""); setAdding(null)
  }

  const water = useCallback(id => {
    setSplash({id, k:Date.now()}); setTimeout(()=>setSplash(null), 900)
    save(trees.map(t => {
      if(t.id!==id||t.wilted||t.finished||t.stage===9) return t
      const need = STAGES[t.stage].need
      let drops = t.drops+1, stage = t.stage
      const log = [...t.log]
      if(drops>=need){ stage=Math.min(t.stage+1,9); drops=0; log.push({t:Date.now(),text:`🌱 Виросло → ${STAGES[stage].name}`}) }
      else log.push({t:Date.now(),text:`💧 Полито (${drops}/${need})`})
      return {...t, stage, drops, log}
    }))
  }, [trees, save])

  const rollback = useCallback(id => {
    save(trees.map(t => {
      if(t.id!==id||t.wilted) return t
      let {stage,drops} = t; const log=[...t.log]
      if(drops>0){ drops-=1; log.push({t:Date.now(),text:"↩ Прибрано полив"}) }
      else if(stage>0){ stage-=1; drops=Math.max(STAGES[stage].need-1,0); log.push({t:Date.now(),text:`↩ Відкат → ${STAGES[stage].name}`}) }
      else return t
      return {...t, stage, drops, log}
    }))
  }, [trees, save])

  const pick = useCallback(id => {
    save(trees.map(t => {
      if(t.id!==id||t.stage<FIRST_HARVEST) return t
      const basket=(t.basket||0)+1, picked=(t.picked||0)+1
      return {...t, basket, picked, log:[...t.log,{t:Date.now(),text:`🍎 Зібрано плід #${picked}`}]}
    }))
  }, [trees, save])

  const harvest = useCallback(id => {
    save(trees.map(t => {
      if(t.id!==id) return t
      const harvests=(t.harvests||0)+1, basket=t.basket||0
      return {...t, harvests, basket:0, stage:5, drops:0, log:[...t.log,{t:Date.now(),text:`🧺 Урожай #${harvests} (${basket} плодів)`}]}
    }))
  }, [trees, save])

  const wilt = useCallback(id => {
    save(trees.map(t => {
      if(t.id!==id) return t
      const w=!t.wilted
      return {...t, wilted:w, log:[...t.log,{t:Date.now(),text:w?"🍂 Зів'яло":"🌱 Ожило"}]}
    }))
  }, [trees, save])

  const finish = useCallback(id => {
    save(trees.map(t => t.id!==id ? t : {...t, finished:true, log:[...t.log,{t:Date.now(),text:"✅ Проєкт завершено"}]}))
    setSelId(null)
  }, [trees, save])

  const remove = useCallback(id => {
    save(trees.filter(t=>t.id!==id)); setSelId(null)
  }, [trees, save])

  const stats = useMemo(()=>({
    total:    trees.filter(t=>!t.wilted&&!t.finished).length,
    growing:  trees.filter(t=>!t.wilted&&!t.finished&&t.stage>=4).length,
    fruiting: trees.filter(t=>!t.wilted&&!t.finished&&t.stage>=FIRST_HARVEST).length,
    basket:   trees.reduce((s,t)=>s+(t.basket||0),0),
  }), [trees])

  const filtered = useMemo(()=>trees.filter(t=>{
    if(filter==="active")   return !t.wilted&&!t.finished
    if(filter==="fruiting") return !t.wilted&&!t.finished&&t.stage>=FIRST_HARVEST
    if(filter==="done")     return t.finished
    if(filter==="wilted")   return t.wilted
    return true
  }), [trees, filter])

  if(!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      background:"linear-gradient(180deg,#86cfe8,#eef6df)",fontSize:64}}>🌱</div>
  )

  const card = { borderRadius:18, border:"1px solid", cursor:"pointer", position:"relative" }
  const chip = { padding:"5px 12px", borderRadius:20, border:"1px solid", fontSize:12,
                 fontWeight:600, cursor:"pointer", fontFamily:"inherit" }
  const btn  = { padding:"12px 0", borderRadius:14, border:"none", fontSize:15,
                 fontWeight:700, cursor:"pointer", fontFamily:"inherit" }

  // ── ADD MODAL ──────────────────────────────────────────────
  if(adding!==null) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"flex-end",zIndex:200,fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"28px 24px 44px",
        width:"100%",boxSizing:"border-box"}}>
        <div style={{fontSize:44,textAlign:"center",marginBottom:4}}>🌱</div>
        <h2 style={{textAlign:"center",color:"#3a6b2a",margin:"0 0 6px",fontSize:20}}>Посадити насінину</h2>
        <p style={{textAlign:"center",color:"#888",fontSize:13,margin:"0 0 16px"}}>
          {adding.parentId ? `Гілка від «${byId(adding.parentId)?.name}»` : "Новий проєкт"}
        </p>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&plant()} placeholder="Назва проєкту або ідеї..." autoFocus
          style={{width:"100%",padding:"13px 16px",fontSize:16,border:"2px solid #c8e6c9",
            borderRadius:14,outline:"none",boxSizing:"border-box",marginBottom:12,fontFamily:"inherit"}}/>
        <button onClick={plant} style={{...btn,width:"100%",background:"#4caf50",color:"#fff",marginBottom:10}}>
          Посадити 🌱
        </button>
        <button onClick={()=>{setAdding(null);setNewName("")}}
          style={{...btn,width:"100%",background:"transparent",color:"#888",border:"2px solid #eee"}}>
          Скасувати
        </button>
      </div>
    </div>
  )

  // ── DETAIL MODAL ───────────────────────────────────────────
  if(selId && sel) {
    const t = sel
    const pv = preview !== null ? preview : t.stage
    const st = STAGES[pv]
    const isPv = preview!==null && preview!==t.stage
    const isDone = t.stage===9; const canPick = t.stage>=FIRST_HARVEST
    const parent = t.parentId ? byId(t.parentId) : null
    const kids = trees.filter(c=>c.parentId===t.id)

    return (
      <div onClick={()=>{setSelId(null);setPreview(null)}}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",
          flexDirection:"column",justifyContent:"flex-end",zIndex:100,fontFamily:"'Segoe UI',sans-serif"}}>
        <div onClick={e=>e.stopPropagation()}
          style={{background:"#fff",borderRadius:"24px 24px 0 0",maxHeight:"88vh",overflowY:"auto"}}>
          <div style={{width:40,height:4,background:"#ddd",borderRadius:2,margin:"14px auto 0"}}/>
          <div style={{display:"flex",alignItems:"center",padding:"10px 20px 0"}}>
            <button onClick={()=>{setSelId(null);setPreview(null)}}
              style={{background:"#f5f5f5",border:"none",borderRadius:50,width:36,height:36,fontSize:18,cursor:"pointer"}}>←</button>
            <div style={{fontWeight:800,fontSize:18,color:"#1a3a0a",flex:1,textAlign:"center"}}>{t.name}</div>
            <div style={{width:36}}/>
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:"6px 20px 0"}}>
            <button onClick={()=>setPreview(Math.max(0,pv-1))}
              style={{background:"none",border:"none",fontSize:22,cursor:"pointer",opacity:pv>0?1:0.2}}>‹</button>
            <div style={{fontSize:13,color:"#888",minWidth:120,textAlign:"center"}}>
              {isPv?(pv>t.stage?`📍 ${pv-t.stage} стадій попереду`:"📍 позаду"):"поточна стадія"}
            </div>
            <button onClick={()=>setPreview(Math.min(9,pv+1))}
              style={{background:"none",border:"none",fontSize:22,cursor:"pointer",opacity:pv<9?1:0.2}}>›</button>
          </div>
          {isPv && <div style={{textAlign:"center"}}>
            <button onClick={()=>setPreview(null)}
              style={{fontSize:12,color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>← Поточна</button>
          </div>}

          <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
            <img src={IMGS[st.img]} alt={st.name}
              style={{height:150,width:"auto",objectFit:"contain",filter:t.wilted?"grayscale(70%)":"none"}}/>
          </div>
          <div style={{textAlign:"center",fontWeight:700,color:"#3a6b2a",fontSize:16,marginBottom:2}}>{st.name}</div>
          <div style={{textAlign:"center",color:"#888",fontSize:13,marginBottom:4,padding:"0 20px"}}>{st.hint}</div>

          {(parent||kids.length>0) && (
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",padding:"0 20px 6px"}}>
              {parent&&<div style={{background:"#f0f8e8",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#4a8a2a"}}>⬆ {parent.name}</div>}
              {kids.map(k=><div key={k.id} onClick={()=>{setSelId(k.id);setPreview(null)}}
                style={{background:"#e8f5e9",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#2a7a4a",cursor:"pointer"}}>⬇ {k.name}</div>)}
            </div>
          )}

          <div style={{padding:"8px 20px 40px"}}>
            {!isPv&&!isDone&&!t.wilted&&!t.finished&&STAGES[t.stage].need>0&&(
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",marginBottom:5}}>
                  <span>До наступної стадії</span><span>{t.drops}/{STAGES[t.stage].need}</span>
                </div>
                <div style={{display:"flex",gap:5}}>
                  {Array.from({length:STAGES[t.stage].need}).map((_,i)=>(
                    <div key={i} style={{flex:1,height:8,borderRadius:4,
                      background:i<t.drops?"#4caf50":"#eee",transition:"background .3s"}}/>
                  ))}
                </div>
              </div>
            )}

            {(t.basket>0||t.harvests>0)&&(
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                {t.basket>0&&<div style={{flex:1,background:"#fff8e1",borderRadius:12,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>🧺</div><div style={{fontSize:11,color:"#888"}}>у кошику</div>
                  <div style={{fontWeight:700,color:"#e8a33d"}}>{t.basket}</div></div>}
                {t.harvests>0&&<div style={{flex:1,background:"#f3e5f5",borderRadius:12,padding:"8px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>🌾</div><div style={{fontSize:11,color:"#888"}}>врожаїв</div>
                  <div style={{fontWeight:700,color:"#9c27b0"}}>{t.harvests}</div></div>}
              </div>
            )}

            {!t.finished&&!t.wilted&&(
              <div style={{display:"grid",gridTemplateColumns:isDone?"1fr":"1fr 1fr",gap:10,marginBottom:10}}>
                {!isDone&&<button onClick={()=>water(t.id)} style={{...btn,background:"#4caf50",color:"#fff"}}>💧 Полити</button>}
                {canPick&&<button onClick={()=>pick(t.id)} style={{...btn,background:"#e53935",color:"#fff"}}>🍎 Зірвати</button>}
                <button onClick={()=>rollback(t.id)} style={{...btn,background:"#f5f5f5",color:"#555"}}>↩ Відкат</button>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <button onClick={()=>{setAdding({parentId:t.id});setSelId(null)}}
                style={{...btn,background:"#e8f5e9",color:"#2e7d32",fontSize:13}}>+ Гілка</button>
              {canPick&&!t.finished&&<button onClick={()=>harvest(t.id)}
                style={{...btn,background:"#fff8e1",color:"#e65100",fontSize:13}}>🧺 Зібрати все</button>}
              <button onClick={()=>wilt(t.id)}
                style={{...btn,background:"#fafafa",color:"#999",border:"1px solid #eee",fontSize:13}}>
                {t.wilted?"🌱 Оживити":"🍂 Зів'яло"}</button>
              {!t.finished&&<button onClick={()=>finish(t.id)}
                style={{...btn,background:"#fafafa",color:"#999",border:"1px solid #eee",fontSize:13}}>✅ Завершити</button>}
              <button onClick={()=>remove(t.id)}
                style={{...btn,background:"#ffebee",color:"#c62828",fontSize:13}}>🗑 Видалити</button>
            </div>

            {t.log?.length>0&&(
              <div>
                <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#bbb",marginBottom:6}}>Журнал</div>
                <div style={{maxHeight:120,overflowY:"auto"}}>
                  {[...t.log].reverse().slice(0,12).map((l,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f5f5f5"}}>
                      <span style={{fontSize:12,color:"#444"}}>{l.text}</span>
                      <span style={{fontSize:11,color:"#bbb",marginLeft:8,flexShrink:0}}>{fmt(l.t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── LINEAGE VIEW ───────────────────────────────────────────
  const LineageView = () => {
    const { nodes, edges, w, h, NW, NH } = lineageLayout(trees)
    if(!nodes.length) return (
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
        flexDirection:"column",gap:8,color:dark?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.4)"}}>
        <div style={{fontSize:64}}>🌳</div>
        <div style={{fontSize:16}}>Родовід порожній</div>
        <div style={{fontSize:13}}>Додайте проєкти і зв'яжіть їх гілками</div>
      </div>
    )
    return (
      <div style={{flex:1,overflow:"auto",padding:"10px 16px 20px"}}>
        <svg width={Math.max(w,300)} height={Math.max(h,200)} style={{display:"block"}}>
          {edges.map(e=>(
            <path key={e.id}
              d={`M${e.x1} ${e.y1} C${e.x1} ${(e.y1+e.y2)/2}, ${e.x2} ${(e.y1+e.y2)/2}, ${e.x2} ${e.y2}`}
              stroke={dark?"rgba(167,139,208,0.8)":"rgba(76,175,80,0.7)"}
              strokeWidth={2} fill="none" strokeLinecap="round"/>
          ))}
          {nodes.map(n=>{
            const t=n.tree; const s=STAGES[t.stage]
            const isFruit=t.stage>=FIRST_HARVEST
            return (
              <g key={t.id} onClick={()=>{setSelId(t.id);setPreview(null)}} style={{cursor:"pointer"}}>
                <rect x={n.x} y={n.y} width={NW} height={NH} rx={14}
                  fill="rgba(255,255,255,0.93)"
                  stroke={isFruit?"#e53935":t.parentId?"rgba(167,139,208,0.8)":"rgba(76,175,80,0.8)"}
                  strokeWidth={isFruit?2:1.5}/>
                <image href={IMGS[s.img]} x={n.x+6} y={n.y+4} width={NW-12} height={60}
                  preserveAspectRatio="xMidYMid meet"/>
                <text x={n.x+NW/2} y={n.y+74} textAnchor="middle" fontSize={11}
                  fontWeight="700" fill="#1a3a0a" fontFamily="'Segoe UI',sans-serif">
                  {t.name.length>11?t.name.slice(0,10)+"…":t.name}
                </text>
                <text x={n.x+NW/2} y={n.y+90} textAnchor="middle" fontSize={9}
                  fill="#5a8a4a" fontFamily="'Segoe UI',sans-serif">
                  {s.name.length>13?s.name.slice(0,12)+"…":s.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // ── GARDEN VIEW ────────────────────────────────────────────
  const GardenView = () => (
    <div style={{flex:1,overflowY:"auto",padding:"0 14px 80px"}}>
      <div style={{display:"flex",gap:7,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {[["active","Активні"],["fruiting","Плодоносять"],["done","Завершені"],["wilted","Зів'ялі"],["all","Усі"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{...chip,flexShrink:0,
              background:filter===k?(dark?"#5b7cc4":"#3e5631"):"rgba(255,255,255,0.18)",
              color:filter===k?"#fff":txt,
              borderColor:filter===k?"transparent":"rgba(255,255,255,0.25)"}}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"50px 20px",color:soft}}>
          <div style={{fontSize:60,marginBottom:12}}>🌱</div>
          <div style={{fontSize:16,fontWeight:600,color:txt}}>
            {trees.length===0?"Сад порожній":"Тут нічого"}
          </div>
          <div style={{fontSize:13,marginTop:8}}>
            {trees.length===0?"Натисніть + щоб посадити першу насінину":"Спробуйте інший фільтр"}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
        {filtered.map(t=>{
          const s=STAGES[t.stage]; const isSplash=splash?.id===t.id
          const parent=t.parentId?byId(t.parentId):null
          const kids=trees.filter(c=>c.parentId===t.id).length
          const isFruit=t.stage>=FIRST_HARVEST
          return (
            <div key={t.id} onClick={()=>{setSelId(t.id);setPreview(null)}}
              style={{...card,
                background:dark?"rgba(30,42,74,0.5)":"rgba(255,255,255,0.75)",
                borderColor:dark?"rgba(120,150,220,0.25)":isFruit?"rgba(229,57,53,0.35)":"rgba(62,86,49,0.2)",
                opacity:t.wilted?0.65:t.finished?0.8:1,
                padding:"12px 12px 48px"}}>
              <div style={{display:"flex",justifyContent:"center",height:90,alignItems:"center",position:"relative"}}>
                {isSplash&&<div style={{position:"absolute",top:0,fontSize:22,zIndex:2}}>💧</div>}
                <img src={IMGS[s.img]} alt={s.name}
                  style={{maxHeight:88,maxWidth:"100%",objectFit:"contain",
                    filter:t.wilted?"grayscale(70%)":"none"}}/>
              </div>
              <div style={{fontWeight:700,color:txt,fontSize:14,textAlign:"center",marginTop:4,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
              <div style={{fontSize:11,fontWeight:600,textAlign:"center",marginBottom:5,
                color:t.wilted?"#c4a878":t.finished?"#888":isFruit?"#e53935":"#4a8a2a"}}>
                {t.wilted?"🍂 Зів'яло":t.finished?"✅ Завершено":s.name}
              </div>
              {parent&&<div style={{fontSize:10,color:soft,textAlign:"center",marginBottom:2}}>⬆ {parent.name}</div>}
              {kids>0&&<div style={{fontSize:10,color:soft,textAlign:"center",marginBottom:2}}>⬇ {kids} гілок</div>}
              {!t.wilted&&!t.finished&&!isFruit&&s.need>0&&(
                <div style={{display:"flex",gap:3,justifyContent:"center",marginBottom:4}}>
                  {Array.from({length:s.need}).map((_,i)=>(
                    <div key={i} style={{width:14,height:4,borderRadius:2,
                      background:i<t.drops?"#4caf50":"rgba(0,0,0,0.1)"}}/>
                  ))}
                </div>
              )}
              {t.basket>0&&<div style={{fontSize:11,color:"#e8a33d",textAlign:"center"}}>🧺 {t.basket}</div>}

              {!t.wilted&&!t.finished&&t.stage<9&&(
                <button onClick={e=>{e.stopPropagation();e.preventDefault();water(t.id)}}
                  style={{position:"absolute",bottom:10,right:10,width:38,height:38,borderRadius:50,
                    background:"#4caf50",color:"#fff",border:"none",fontSize:18,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:"0 2px 8px rgba(76,175,80,0.5)",zIndex:5}}>
                  💧
                </button>
              )}
              {isFruit&&!t.finished&&(
                <button onClick={e=>{e.stopPropagation();e.preventDefault();pick(t.id)}}
                  style={{position:"absolute",bottom:10,right:10,width:38,height:38,borderRadius:50,
                    background:"#e53935",color:"#fff",border:"none",fontSize:18,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:"0 2px 8px rgba(229,57,53,0.5)",zIndex:5}}>
                  🍎
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{height:"100svh",background:bg,display:"flex",flexDirection:"column",
      fontFamily:"'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{padding:"52px 16px 10px",flexShrink:0}}>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[["garden","🌳 Сад"],["lineage","🧬 Родовід"]].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)}
              style={{...chip,
                background:view===k?(dark?"#5b7cc4":"#3e5631"):"rgba(255,255,255,0.18)",
                color:view===k?"#fff":txt,
                borderColor:"transparent",fontWeight:700,fontSize:13}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["всього",stats.total,txt],["ростуть",stats.growing,"#7cc35a"],
            ["плодоносять",stats.fruiting,"#ff7a6b"],["🧺",stats.basket,"#e8a33d"]].map(([l,v,c])=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,
              padding:"5px 4px",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:16,color:c}}>{v}</div>
              <div style={{fontSize:10,color:dark?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.45)"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {view==="garden" ? <GardenView/> : <LineageView/>}

      <button onClick={()=>setAdding({parentId:null})}
        style={{position:"fixed",bottom:24,right:20,width:54,height:54,borderRadius:50,
          background:"#4caf50",color:"#fff",border:"none",fontSize:28,cursor:"pointer",
          boxShadow:"0 4px 16px rgba(76,175,80,0.5)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:50}}>
        +
      </button>
    </div>
  )
}
