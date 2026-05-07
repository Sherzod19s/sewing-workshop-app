// Sewing Workshop App — Russian, Tajikistan (+992), Somoni (смн)
// Full monthly finance with bar chart, order tracking, expenses
// Usage: drop into any React 18 project with persistent storage API

import { useState, useEffect } from "react";

const STATUSES = [
  { key:"new",       label:"Новый",    col:"#6b7280", bg:"#f3f4f6" },
  { key:"working",   label:"В работе", col:"#2563eb", bg:"#dbeafe" },
  { key:"ready",     label:"Готов ✓",  col:"#b45309", bg:"#fef3c7" },
  { key:"delivered", label:"Выдан",    col:"#16a34a", bg:"#dcfce7" },
  { key:"cancelled", label:"Отменён",  col:"#dc2626", bg:"#fee2e2" },
];
const ECATS = ["Ткани","Нитки и фурнитура","Оборудование","Аренда","Коммунальные","Реклама","Прочее"];

const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today    = () => new Date().toISOString().slice(0,10);
const fmtDate  = d  => d ? new Date(d+"T12:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"}) : "—";
const daysDiff = d  => { if(!d) return null; return Math.ceil((new Date(d+"T12:00")-new Date(today()+"T12:00"))/86400000); };
const money    = n  => Math.round(Number(n)||0).toLocaleString("ru-RU") + " смн";
// Compact somoni for tight spaces (chart labels). <1000 → exact, ≥1000 → "1.4к"
const moneyShort = n => {
  const a = Math.abs(Math.round(Number(n)||0));
  if (a < 1000) return String(a);
  return (Math.round(a/100)/10) + "к";
};
// Strip spaces/dashes from phone for tel: links so dialers handle them reliably
const telHref = p => "tel:" + (p||"").replace(/[\s\-()]/g,"");
const getThisMonth = () => new Date().toISOString().slice(0,7); // recomputes each call
const monthKey  = d => (d||"").slice(0,7);
const fmtMonth  = m => {
  if (!m) return "";
  const [y,mo] = m.split("-");
  return new Date(+y, +mo-1, 1).toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
};

async function dbGet(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch{ return null; }}
async function dbSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }

const SAMPLE_ORDERS = [
  {id:"m1",name:"Нилуфар Саидова",phone:"+992 90 111 2233",desc:"Пошив вечернего платья",measurements:"Грудь 88 · Талия 70 · Бёдра 94",fabric:"Бордовый бархат",notes:"Молния сзади, длина макси",status:"delivered",dueDate:"2026-03-20",total:900,paid:900,createdAt:"2026-03-05"},
  {id:"m2",name:"Хуршеда Камолова",phone:"+992 91 222 3344",desc:"Ушивка брюк (2 шт)",measurements:"Длина 98 см",fabric:"—",notes:"Укоротить на 4 см",status:"delivered",dueDate:"2026-03-25",total:160,paid:160,createdAt:"2026-03-10"},
  {id:"m3",name:"Мунира Зиёева",phone:"+992 92 333 4455",desc:"Пошив детского платья",measurements:"Рост 110 см",fabric:"Розовый хлопок",notes:"С бантом сзади",status:"delivered",dueDate:"2026-03-28",total:350,paid:350,createdAt:"2026-03-15"},
  {id:"s4",name:"Гулнора Назарова",phone:"+992 93 456 7890",desc:"Замена подкладки пиджака",measurements:"Размер M",fabric:"Тёмно-синий полиэстер",notes:"Винтажный пиджак — осторожно",status:"delivered",dueDate:"2026-04-30",total:350,paid:350,createdAt:"2026-04-20"},
  {id:"a2",name:"Шахло Юсупова",phone:"+992 90 444 5566",desc:"Свадебный наряд на заказ",measurements:"Грудь 86 · Талия 68 · Бёдра 92",fabric:"Белый шёлк + кружево",notes:"Срочно! Свадьба 28 апреля",status:"delivered",dueDate:"2026-04-26",total:1800,paid:1800,createdAt:"2026-04-01"},
  {id:"a3",name:"Парвина Рашидова",phone:"+992 91 555 6677",desc:"Подгонка делового костюма",measurements:"Размер 46",fabric:"—",notes:"Ушить пиджак и брюки",status:"delivered",dueDate:"2026-04-15",total:400,paid:400,createdAt:"2026-04-05"},
  {id:"s1",name:"Мадина Рахимова",phone:"+992 90 123 4567",desc:"Подгонка свадебного платья",measurements:"Грудь 86 · Талия 68 · Бёдра 92 · Длина 150",fabric:"Белое шёлковое кружево",notes:"Убрать в талии 3 см, укоротить подол 5 см",status:"working",dueDate:"2026-05-10",total:1200,paid:600,createdAt:"2026-04-28"},
  {id:"s2",name:"Зарина Каримова",phone:"+992 91 234 5678",desc:"Национальное платье на заказ",measurements:"Грудь 84 · Талия 66 · Бёдра 90 · Рост 162",fabric:"Атлас — клиент предоставит",notes:"Высокий воротник, вышивка по краю",status:"new",dueDate:"2026-05-20",total:850,paid:300,createdAt:"2026-05-01"},
  {id:"s3",name:"Дилбар Холова",phone:"+992 92 345 6789",desc:"Подгиб школьной формы (3 шт)",measurements:"Все на 5 см выше колена",fabric:"Тёмно-синяя — уже принесли",notes:"3 платья, одинаковая длина",status:"ready",dueDate:"2026-05-06",total:240,paid:240,createdAt:"2026-05-02"},
  {id:"m9",name:"Феруза Турсунова",phone:"+992 93 777 8899",desc:"Пошив блузки",measurements:"Грудь 90 · Рост 165",fabric:"Белый лён",notes:"",status:"working",dueDate:"2026-05-18",total:480,paid:200,createdAt:"2026-05-04"},
];
const SAMPLE_EXPENSES = [
  {id:"x1",desc:"Ткань оптом — март",amount:800,cat:"Ткани",date:"2026-03-02"},
  {id:"x2",desc:"Аренда — март",amount:3500,cat:"Аренда",date:"2026-03-01"},
  {id:"x3",desc:"Нитки и молнии",amount:120,cat:"Нитки и фурнитура",date:"2026-03-10"},
  {id:"x4",desc:"Шёлк для свадебного платья",amount:1100,cat:"Ткани",date:"2026-04-02"},
  {id:"x5",desc:"Аренда — апрель",amount:3500,cat:"Аренда",date:"2026-04-01"},
  {id:"x6",desc:"Новые ножницы",amount:280,cat:"Оборудование",date:"2026-04-12"},
  {id:"e1",desc:"Закупка ткани оптом",amount:1200,cat:"Ткани",date:"2026-05-01"},
  {id:"e2",desc:"Нитки и иглы — пополнение",amount:180,cat:"Нитки и фурнитура",date:"2026-05-03"},
  {id:"e3",desc:"Аренда мастерской — май",amount:3500,cat:"Аренда",date:"2026-05-01"},
];

const C = {
  purpleMid:"#7c3aed",
  bg:"#f7f6fb", card:"#ffffff",
  text:"#111827", muted:"#6b7280", faint:"#9ca3af",
  border:"#e5e7eb", divider:"#f3f4f6",
  red:"#dc2626", redBg:"#fef2f2",
  green:"#16a34a", greenBg:"#f0fdf4",
  amber:"#b45309", amberBg:"#fef3c7",
  blue:"#1d4ed8",
};

export default function App() {
  const [orders,   setOrders]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [screen,   setScreen]   = useState("list");
  const [tab,      setTab]      = useState("orders");
  const [aid,      setAid]      = useState(null);
  const [eaid,     setEaid]     = useState(null);     // active expense id being edited
  const [isEdit,   setIsEdit]   = useState(false);
  const [of,       setOf]       = useState({});
  const [ef,       setEf]       = useState({desc:"",amount:"",cat:"Ткани",date:today()});
  const [listFilt, setListFilt] = useState("active");
  const [selMonth, setSelMonth] = useState(getThisMonth());
  const [loaded,   setLoaded]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [confirmDel,setConfirmDel]=useState(false);   // two-tap delete confirmation

  // Reset delete-confirm whenever user navigates away
  useEffect(()=>{setConfirmDel(false);},[screen]);

  useEffect(()=>{
    (async()=>{
      let o=await dbGet("sw-tj2-orders");
      let e=await dbGet("sw-tj2-expenses");
      if(!o){o=SAMPLE_ORDERS;await dbSet("sw-tj2-orders",o);}
      if(!e){e=SAMPLE_EXPENSES;await dbSet("sw-tj2-expenses",e);}
      setOrders(o);setExpenses(e);setLoaded(true);
    })();
  },[]);

  const saveO=arr=>{setOrders(arr);dbSet("sw-tj2-orders",arr);};
  const saveE=arr=>{setExpenses(arr);dbSet("sw-tj2-expenses",arr);};
  const toast_=msg=>{setToast(msg);setTimeout(()=>setToast(null),2400);};

  const goTab=t=>{
    setTab(t);
    if(t==="orders") setScreen("list");
    if(t==="finance"){setSelMonth(getThisMonth());setScreen("finance");}
    if(t==="today")  setScreen("today");
  };

  const openDetail=id=>{setAid(id);setScreen("detail");};
  const openAdd=()=>{
    setOf({name:"",phone:"",desc:"",measurements:"",fabric:"",notes:"",status:"new",dueDate:"",total:"",paid:"",createdAt:today()});
    setIsEdit(false);setScreen("order-form");
  };
  const openEdit=id=>{
    const o=orders.find(x=>x.id===id);
    setOf({...o});setAid(id);setIsEdit(true);setScreen("order-form");
  };
  const saveOrder=()=>{
    if(!of.name?.trim()||!of.desc?.trim()){toast_("Заполните имя и описание");return;}
    let upd;
    if(isEdit) upd=orders.map(o=>o.id===aid?{...of,id:aid}:o);
    else       upd=[...orders,{...of,id:uid()}];
    saveO(upd);toast_("Заказ сохранён ✓");
    setScreen(isEdit?"detail":"list");
  };
  const delOrder=id=>{
    saveO(orders.filter(o=>o.id!==id));setScreen("list");toast_("Заказ удалён");
  };
  const setStatus=(id,s)=>{
    saveO(orders.map(o=>o.id===id?{...o,status:s}:o));toast_("Статус изменён ✓");
  };
  // Create new OR update existing expense
  const saveExpense=()=>{
    if(!ef.desc?.trim()||!ef.amount){toast_("Заполните описание и сумму");return;}
    let upd;
    if(eaid){
      upd=expenses.map(x=>x.id===eaid?{...ef,id:eaid,amount:parseFloat(ef.amount)}:x);
    }else{
      upd=[...expenses,{...ef,id:uid(),amount:parseFloat(ef.amount)}];
    }
    saveE(upd);
    setEf({desc:"",amount:"",cat:"Ткани",date:today()});
    setEaid(null);
    toast_(eaid?"Расход обновлён ✓":"Расход добавлен ✓");
    setScreen("finance");
  };
  const deleteExpense=()=>{
    if(!eaid)return;
    saveE(expenses.filter(x=>x.id!==eaid));
    setEf({desc:"",amount:"",cat:"Ткани",date:today()});
    setEaid(null);
    toast_("Расход удалён");
    setScreen("finance");
  };
  // Open form to add a new expense
  const openAddExpense=()=>{
    setEf({desc:"",amount:"",cat:"Ткани",date:today()});
    setEaid(null);
    setScreen("add-expense");
  };
  // Open form to edit existing expense
  const openEditExpense=id=>{
    const e=expenses.find(x=>x.id===id);
    if(!e)return;
    setEf({...e,amount:String(e.amount)});
    setEaid(id);
    setScreen("add-expense");
  };

  const ao=orders.find(o=>o.id===aid);

  const allMonths=[...new Set([
    ...orders.map(o=>monthKey(o.dueDate||o.createdAt)),
    ...expenses.map(e=>monthKey(e.date)),
  ])].filter(Boolean).sort().reverse();

  const monthStats=m=>{
    const mOrders=orders.filter(o=>monthKey(o.dueDate||o.createdAt)===m);
    const mExp=expenses.filter(e=>monthKey(e.date)===m);
    const income=mOrders.reduce((s,o)=>s+Number(o.paid||0),0);
    const expTotal=mExp.reduce((s,e)=>s+Number(e.amount||0),0);
    return{income,expTotal,profit:income-expTotal,mOrders,mExp};
  };

  const totalOwed=orders
    .filter(o=>o.status!=="delivered"&&o.status!=="cancelled")
    .reduce((s,o)=>s+Math.max(0,Number(o.total||0)-Number(o.paid||0)),0);

  const active   =orders.filter(o=>o.status!=="delivered"&&o.status!=="cancelled");
  const overdue  =active.filter(o=>{const d=daysDiff(o.dueDate);return d!==null&&d<0;});
  const dueToday_=active.filter(o=>daysDiff(o.dueDate)===0);
  const dueSoon_ =active.filter(o=>{const d=daysDiff(o.dueDate);return d!==null&&d>0&&d<=3;});
  const readyPU  =orders.filter(o=>o.status==="ready");
  const urgentCount=overdue.length+dueToday_.length+readyPU.length;

  const displayOrders=[...orders]
    .filter(o=>listFilt==="active"?(o.status!=="delivered"&&o.status!=="cancelled"):true)
    .sort((a,b)=>{
      if(!a.dueDate&&!b.dueDate)return 0;
      if(!a.dueDate)return 1;if(!b.dueDate)return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const maxIncome=Math.max(1,...allMonths.map(m=>monthStats(m).income));

  const S={
    app:    {fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:C.bg},
    hdr:    {background:C.card,padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10},
    htitle: {fontSize:18,fontWeight:700,color:C.text,letterSpacing:"-0.02em"},
    body:   {paddingBottom:76},
    nav:    {position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20},
    ntab:   a=>({flex:1,padding:"10px 4px 8px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:a?C.purpleMid:C.muted,fontSize:10,fontWeight:a?700:400,position:"relative"}),
    card:   {background:C.card,borderRadius:12,margin:"6px 12px",padding:"14px",border:`1px solid ${C.border}`},
    input:  {width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:16,background:C.card,outline:"none",boxSizing:"border-box",fontFamily:"inherit",color:C.text},
    textarea:{width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:15,background:C.card,outline:"none",resize:"vertical",minHeight:80,boxSizing:"border-box",fontFamily:"inherit",color:C.text},
    select: {width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:16,background:C.card,outline:"none",boxSizing:"border-box",fontFamily:"inherit",color:C.text},
    label:  {fontSize:13,fontWeight:600,color:"#374151",marginBottom:5,display:"block"},
    fg:     {marginBottom:14,padding:"0 12px"},
    btnP:   {width:"100%",padding:"14px",borderRadius:10,border:"none",fontSize:16,fontWeight:700,cursor:"pointer",background:C.purpleMid,color:"#fff",marginBottom:8},
    btnS:   {width:"100%",padding:"14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:16,fontWeight:500,cursor:"pointer",background:C.card,color:C.muted,marginBottom:8},
    btnD:   {width:"100%",padding:"14px",borderRadius:10,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:C.redBg,color:C.red,marginBottom:8},
    fab:    {position:"fixed",bottom:80,right:16,width:54,height:54,borderRadius:27,background:C.purpleMid,border:"none",color:"#fff",fontSize:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(109,40,217,0.4)",zIndex:15,lineHeight:1},
    tag:    (col,bg)=>({fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,color:col,background:bg,display:"inline-block",lineHeight:"1.5",whiteSpace:"nowrap"}),
    row:    {display:"flex",alignItems:"center",justifyContent:"space-between",gap:6},
    sl:     {padding:"14px 12px 6px",fontSize:11,fontWeight:700,color:C.faint,textTransform:"uppercase",letterSpacing:"0.06em"},
    statC:  {background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,flex:1},
    aRow:   col=>({background:col+"13",borderLeft:`3px solid ${col}`,margin:"4px 12px",padding:"11px 12px",borderRadius:"0 8px 8px 0",cursor:"pointer"}),
    pill:   (a,col)=>({padding:"7px 14px",borderRadius:20,border:a?`2px solid ${col}`:`1px solid ${C.border}`,background:a?col+"1a":C.card,color:a?col:C.muted,fontSize:12,fontWeight:a?700:400,cursor:"pointer"}),
    toast_: {position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#fff",padding:"9px 18px",borderRadius:20,fontSize:13,fontWeight:500,zIndex:100,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,0.25)"},
    backBtn:{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted,padding:"0 2px",lineHeight:1},
    textBtn:col=>({background:"none",border:"none",fontSize:14,cursor:"pointer",color:col||C.purpleMid,fontWeight:700,padding:"4px 4px"}),
    divider:{height:1,background:C.divider,margin:"10px 0"},
  };

  function Badge({status}){
    const st=STATUSES.find(x=>x.key===status)||STATUSES[0];
    return <span style={S.tag(st.col,st.bg)}>{st.label}</span>;
  }
  function DuePill({dueDate,status}){
    if(status==="delivered"||status==="cancelled")return null;
    const d=daysDiff(dueDate);
    if(d===null)return null;
    if(d<0) return <span style={S.tag(C.red,"#fef2f2")}>Просрочка {Math.abs(d)} дн</span>;
    if(d===0)return <span style={S.tag(C.amber,C.amberBg)}>Срок сегодня</span>;
    if(d<=3) return <span style={S.tag(C.amber,C.amberBg)}>Через {d} дн</span>;
    return <span style={{fontSize:12,color:C.muted}}>{fmtDate(dueDate)}</span>;
  }

  function renderList(){return(<>
    <div style={S.hdr}>
      <span style={S.htitle}>🧵 Заказы</span>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.pill(listFilt==="active",C.purpleMid),padding:"6px 13px"}} onClick={()=>setListFilt("active")}>Активные</button>
        <button style={{...S.pill(listFilt==="all",C.purpleMid),padding:"6px 13px"}} onClick={()=>setListFilt("all")}>Все</button>
      </div>
    </div>
    <div style={S.body}>
      {displayOrders.length===0&&<div style={{textAlign:"center",padding:"52px 20px",color:C.faint}}><div style={{fontSize:44,marginBottom:12}}>🧷</div><div style={{fontSize:16,fontWeight:600,color:C.muted}}>Пока нет заказов</div><div style={{fontSize:13,marginTop:6}}>Нажмите ＋, чтобы добавить заказ</div></div>}
      {displayOrders.map(o=>{
        const bal=Math.max(0,Number(o.total||0)-Number(o.paid||0));
        const od=daysDiff(o.dueDate)<0&&o.status!=="delivered"&&o.status!=="cancelled"&&o.dueDate;
        return(<div key={o.id} style={{...S.card,borderLeft:od?`3px solid ${C.red}`:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>openDetail(o.id)}>
          <div style={{...S.row,marginBottom:5}}><span style={{fontSize:15,fontWeight:700,color:C.text,flex:1,marginRight:8}}>{o.name}</span><Badge status={o.status}/></div>
          <div style={{fontSize:13,color:C.muted,marginBottom:9}}>{o.desc}</div>
          <div style={S.row}><DuePill dueDate={o.dueDate} status={o.status}/>{bal>0?<span style={{fontSize:13,fontWeight:700,color:C.amber}}>Долг {money(bal)}</span>:<span style={{fontSize:12,fontWeight:600,color:C.green}}>Оплачено ✓</span>}</div>
        </div>);
      })}
      <div style={{height:16}}/>
    </div>
    <button style={S.fab} onClick={openAdd}>＋</button>
  </>);}

  function renderDetail(){
    if(!ao)return null;
    const bal=Math.max(0,Number(ao.total||0)-Number(ao.paid||0));
    const od=daysDiff(ao.dueDate)<0&&ao.status!=="delivered"&&ao.status!=="cancelled";
    return(<>
      <div style={S.hdr}><button style={S.backBtn} onClick={()=>setScreen("list")}>←</button><span style={{...S.htitle,flex:1,textAlign:"center",fontSize:16,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",margin:"0 8px"}}>{ao.name}</span><button style={S.textBtn()} onClick={()=>openEdit(ao.id)}>Изменить</button></div>
      <div style={S.body}>
        <div style={{background:C.card,padding:"12px 12px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:8,textTransform:"uppercase"}}>Изменить статус</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{STATUSES.map(st=><button key={st.key} style={S.pill(ao.status===st.key,st.col)} onClick={()=>setStatus(ao.id,st.key)}>{st.label}</button>)}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 12px 4px"}}>
          <div style={S.statC}><div style={{fontSize:11,color:C.faint,marginBottom:4}}>Срок</div><div style={{fontSize:15,fontWeight:700,color:od?C.red:C.text}}>{fmtDate(ao.dueDate)}</div>{od&&<div style={{fontSize:10,color:C.red,fontWeight:700,marginTop:2}}>ПРОСРОЧЕНО</div>}{!od&&ao.dueDate&&daysDiff(ao.dueDate)>=0&&daysDiff(ao.dueDate)<=3&&<div style={{fontSize:10,color:C.amber,fontWeight:600,marginTop:2}}>Скоро срок</div>}</div>
          <div style={S.statC}><div style={{fontSize:11,color:C.faint,marginBottom:5}}>Телефон</div>{ao.phone?<a href={telHref(ao.phone)} style={{fontSize:14,fontWeight:700,color:C.purpleMid,textDecoration:"none"}}>📞 {ao.phone}</a>:<div style={{fontSize:13,color:C.faint}}>—</div>}</div>
        </div>
        <div style={{...S.card,margin:"4px 12px"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10,textTransform:"uppercase"}}>💰 Оплата</div>
          <div style={{...S.row,marginBottom:7}}><span style={{fontSize:14,color:C.muted}}>Общая сумма</span><span style={{fontSize:15,fontWeight:700}}>{money(ao.total)}</span></div>
          <div style={{...S.row,marginBottom:7}}><span style={{fontSize:14,color:C.muted}}>Получено</span><span style={{fontSize:15,fontWeight:600,color:C.green}}>{money(ao.paid)}</span></div>
          {Number(ao.total)>0&&<div style={{marginBottom:7}}><div style={{height:4,background:C.divider,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,Math.round(Number(ao.paid||0)/Number(ao.total)*100))}%`,background:bal>0?C.amber:C.green,borderRadius:4}}/></div></div>}
          <div style={S.divider}/>
          <div style={S.row}><span style={{fontSize:14,fontWeight:700,color:bal>0?C.amber:C.green}}>Остаток</span><span style={{fontSize:20,fontWeight:700,color:bal>0?C.amber:C.green}}>{money(bal)}</span></div>
        </div>
        {ao.desc&&<div style={{...S.card,margin:"4px 12px"}}><div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:6,textTransform:"uppercase"}}>📋 Заказ</div><div style={{fontSize:15,color:C.text}}>{ao.desc}</div></div>}
        {ao.measurements&&<div style={{...S.card,margin:"4px 12px"}}><div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:6,textTransform:"uppercase"}}>📐 Мерки</div><div style={{fontSize:13,color:C.text,whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.8,background:"#fafaf8",padding:"8px 10px",borderRadius:6}}>{ao.measurements}</div></div>}
        {ao.fabric&&<div style={{...S.card,margin:"4px 12px"}}><div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:6,textTransform:"uppercase"}}>🪡 Ткань</div><div style={{fontSize:14,color:C.text}}>{ao.fabric}</div></div>}
        {ao.notes&&<div style={{...S.card,margin:"4px 12px"}}><div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:6,textTransform:"uppercase"}}>📝 Заметки</div><div style={{fontSize:14,color:C.text,lineHeight:1.6}}>{ao.notes}</div></div>}
        <div style={{padding:"8px 12px 16px"}}><button style={{...S.btnD,background:confirmDel?C.red:C.redBg,color:confirmDel?"#fff":C.red}} onClick={()=>{
          if(confirmDel){delOrder(ao.id);}
          else{setConfirmDel(true);setTimeout(()=>setConfirmDel(false),3000);}
        }}>{confirmDel?"Нажмите ещё раз для удаления":"Удалить заказ"}</button></div>
      </div>
    </>);
  }

  function renderOrderForm(){
    const f=of;const set=(k,v)=>setOf(p=>({...p,[k]:v}));
    const bal=Math.max(0,Number(f.total||0)-Number(f.paid||0));
    return(<>
      <div style={S.hdr}><button style={S.backBtn} onClick={()=>setScreen(isEdit?"detail":"list")}>←</button><span style={{...S.htitle,flex:1,textAlign:"center",fontSize:16}}>{isEdit?"Редактировать":"Новый заказ"}</span><div style={{width:40}}/></div>
      <div style={S.body}>
        <div style={{height:12}}/>
        <div style={S.fg}><label style={S.label}>Имя клиента *</label><input style={S.input} value={f.name||""} onChange={e=>set("name",e.target.value)} placeholder="напр. Мадина Рахимова"/></div>
        <div style={S.fg}><label style={S.label}>Телефон</label><input style={S.input} type="tel" value={f.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="напр. +992 90 123 4567"/></div>
        <div style={S.fg}><label style={S.label}>Описание *</label><input style={S.input} value={f.desc||""} onChange={e=>set("desc",e.target.value)} placeholder="напр. Подгонка свадебного платья"/></div>
        <div style={S.fg}><label style={S.label}>Срок / дата выдачи</label><input style={S.input} type="date" value={f.dueDate||""} onChange={e=>set("dueDate",e.target.value)}/></div>
        <div style={S.fg}><label style={S.label}>Статус</label><select style={S.select} value={f.status||"new"} onChange={e=>set("status",e.target.value)}>{STATUSES.map(st=><option key={st.key} value={st.key}>{st.label}</option>)}</select></div>
        <div style={{background:"#faf9ff",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:"12px 12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.purpleMid,marginBottom:12,textTransform:"uppercase"}}>💰 Оплата</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={S.label}>Сумма (смн)</label><input style={S.input} type="number" inputMode="numeric" value={f.total||""} onChange={e=>set("total",e.target.value)} placeholder="0"/></div>
            <div><label style={S.label}>Получено (смн)</label><input style={S.input} type="number" inputMode="numeric" value={f.paid||""} onChange={e=>set("paid",e.target.value)} placeholder="0"/></div>
          </div>
          {Number(f.total)>0&&<div style={S.row}><span style={{fontSize:13,color:C.muted}}>Остаток:</span><span style={{fontSize:14,fontWeight:700,color:bal>0?C.amber:C.green}}>{money(bal)}</span></div>}
        </div>
        <div style={{padding:"0 12px 4px",fontSize:12,fontWeight:700,color:C.text,textTransform:"uppercase"}}>📐 Мерки и детали</div>
        <div style={{height:8}}/>
        <div style={S.fg}><label style={S.label}>Мерки</label><textarea style={S.textarea} value={f.measurements||""} onChange={e=>set("measurements",e.target.value)} placeholder="Грудь, талия, бёдра, длина..."/></div>
        <div style={S.fg}><label style={S.label}>Ткань и материалы</label><textarea style={S.textarea} value={f.fabric||""} onChange={e=>set("fabric",e.target.value)} placeholder="Тип ткани, цвет, кто предоставит..."/></div>
        <div style={S.fg}><label style={S.label}>Заметки</label><textarea style={S.textarea} value={f.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Подгонка, особые пожелания клиента..."/></div>
        <div style={{padding:"4px 12px 16px"}}><button style={S.btnP} onClick={saveOrder}>Сохранить</button><button style={S.btnS} onClick={()=>setScreen(isEdit?"detail":"list")}>Отмена</button></div>
      </div>
    </>);
  }

  function renderFinance(){
    const {income,expTotal,profit,mOrders,mExp}=monthStats(selMonth);
    const isCurrentMonth=selMonth===getThisMonth();
    const sortedMonths=[...allMonths].sort();
    const idx=sortedMonths.indexOf(selMonth);
    const prevM=idx>0?sortedMonths[idx-1]:null;
    const nextM=idx<sortedMonths.length-1?sortedMonths[idx+1]:null;
    return(<>
      <div style={S.hdr}><span style={S.htitle}>💰 Финансы</span><button style={{...S.textBtn(),fontSize:13}} onClick={openAddExpense}>+ Расход</button></div>
      <div style={S.body}>
        <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:C.faint,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Доход по месяцам</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:64,overflowX:"auto",paddingBottom:4}}>
            {sortedMonths.map(m=>{
              const {income:inc,profit:pft}=monthStats(m);
              const barH=Math.max(4,Math.round((inc/maxIncome)*56));
              const isSelected=m===selMonth;
              const mo=new Date(m+"-01").toLocaleDateString("ru-RU",{month:"short"});
              return(<div key={m} onClick={()=>setSelMonth(m)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",minWidth:44,flex:1}}>
                <div style={{fontSize:9,fontWeight:700,color:pft>=0?C.green:C.red,whiteSpace:"nowrap",opacity:isSelected?1:0.6}}>{pft>=0?"+":"−"}{moneyShort(pft)}</div>
                <div style={{width:"100%",maxWidth:36,height:barH,borderRadius:"4px 4px 0 0",background:isSelected?C.purpleMid:(pft>=0?"#86efac":"#fca5a5"),transition:"all 0.2s",border:isSelected?`2px solid ${C.purpleMid}`:"none"}}/>
                <div style={{fontSize:9,color:isSelected?C.purpleMid:C.muted,fontWeight:isSelected?700:400,textAlign:"center",lineHeight:1.2}}>{mo}</div>
              </div>);
            })}
          </div>
          <div style={{fontSize:10,color:C.faint,marginTop:6,textAlign:"center"}}>Нажмите на месяц, чтобы посмотреть детали</div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 4px"}}>
          <button onClick={()=>prevM&&setSelMonth(prevM)} style={{...S.backBtn,fontSize:20,opacity:prevM?1:0.2}}>←</button>
          <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:C.text,textTransform:"capitalize"}}>{fmtMonth(selMonth)}</div>{isCurrentMonth&&<div style={{fontSize:10,color:C.purpleMid,fontWeight:600,marginTop:2}}>Текущий месяц</div>}</div>
          <button onClick={()=>nextM&&setSelMonth(nextM)} style={{...S.backBtn,fontSize:20,opacity:nextM?1:0.2}}>→</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"6px 12px 4px"}}>
          <div style={{...S.statC,borderTop:`3px solid ${C.green}`}}><div style={{fontSize:10,color:C.faint,marginBottom:4}}>Доход</div><div style={{fontSize:16,fontWeight:700,color:C.green}}>{money(income)}</div></div>
          <div style={{...S.statC,borderTop:`3px solid ${C.red}`}}><div style={{fontSize:10,color:C.faint,marginBottom:4}}>Расходы</div><div style={{fontSize:16,fontWeight:700,color:C.red}}>{money(expTotal)}</div></div>
          <div style={{...S.statC,borderTop:`3px solid ${profit>=0?C.green:C.red}`,background:profit>=0?C.greenBg:C.redBg}}><div style={{fontSize:10,color:profit>=0?C.green:C.red,marginBottom:4}}>Прибыль</div><div style={{fontSize:16,fontWeight:700,color:profit>=0?C.green:C.red}}>{money(profit)}</div></div>
        </div>
        {totalOwed>0&&<div style={{...S.card,margin:"4px 12px",borderLeft:`3px solid ${C.amber}`,background:C.amberBg}}><div style={S.row}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>К получению</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>Долг по всем активным заказам</div></div><div style={{fontSize:20,fontWeight:700,color:C.amber}}>{money(totalOwed)}</div></div></div>}
        <div style={S.sl}>Заказы ({mOrders.length})</div>
        {mOrders.length===0?<div style={{textAlign:"center",padding:"14px",color:C.faint,fontSize:13}}>Нет заказов в этом месяце</div>
          :[...mOrders].sort((a,b)=>(a.dueDate||a.createdAt||"").localeCompare(b.dueDate||b.createdAt||"")).map(o=>{
            const bal=Math.max(0,Number(o.total||0)-Number(o.paid||0));
            const pct=Number(o.total)>0?Math.min(100,Math.round(Number(o.paid||0)/Number(o.total)*100)):0;
            return(<div key={o.id} style={{...S.card,margin:"4px 12px",cursor:"pointer"}} onClick={()=>openDetail(o.id)}>
              <div style={{...S.row,marginBottom:6}}><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{o.name}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{o.desc}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:700,color:bal>0?C.amber:C.green}}>{bal>0?`Долг ${money(bal)}`:"Оплачено ✓"}</div>{Number(o.total)>0&&<div style={{fontSize:11,color:C.faint,marginTop:2}}>{money(o.paid)} / {money(o.total)}</div>}</div></div>
              {Number(o.total)>0&&<div style={{height:3,background:C.divider,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:bal>0?C.amber:C.green,borderRadius:3}}/></div>}
            </div>);
          })}
        <div style={{...S.sl,display:"flex",alignItems:"center",justifyContent:"space-between",paddingRight:12}}><span>Расходы ({mExp.length})</span>{isCurrentMonth&&<button style={S.textBtn()} onClick={openAddExpense}>Добавить</button>}</div>
        {mExp.length===0?<div style={{textAlign:"center",padding:"14px",color:C.faint,fontSize:13}}>Расходов нет</div>
          :[...mExp].reverse().map(e=>(<div key={e.id} style={{...S.card,margin:"4px 12px",cursor:"pointer"}} onClick={()=>openEditExpense(e.id)}><div style={S.row}><div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:C.text}}>{e.desc}</div><div style={{fontSize:11,color:C.faint,marginTop:3}}>{e.cat} · {fmtDate(e.date)}</div></div><div style={{fontSize:15,fontWeight:700,color:C.red}}>−{money(e.amount)}</div></div></div>))}
        <div style={{height:16}}/>
      </div>
    </>);
  }

  function renderAddExpense(){
    const f=ef;const set=(k,v)=>setEf(p=>({...p,[k]:v}));
    const isEditExp=!!eaid;
    return(<>
      <div style={S.hdr}><button style={S.backBtn} onClick={()=>setScreen("finance")}>←</button><span style={{...S.htitle,flex:1,textAlign:"center",fontSize:16}}>{isEditExp?"Редактировать расход":"Добавить расход"}</span><div style={{width:40}}/></div>
      <div style={S.body}>
        <div style={{height:16}}/>
        <div style={S.fg}><label style={S.label}>Описание *</label><input style={S.input} value={f.desc||""} onChange={e=>set("desc",e.target.value)} placeholder="напр. Закупка ткани"/></div>
        <div style={S.fg}><label style={S.label}>Сумма (смн) *</label><input style={S.input} type="number" inputMode="numeric" value={f.amount||""} onChange={e=>set("amount",e.target.value)} placeholder="0"/></div>
        <div style={S.fg}><label style={S.label}>Категория</label><select style={S.select} value={f.cat} onChange={e=>set("cat",e.target.value)}>{ECATS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={S.fg}><label style={S.label}>Дата</label><input style={S.input} type="date" value={f.date||today()} onChange={e=>set("date",e.target.value)}/></div>
        <div style={{padding:"4px 12px 16px"}}>
          <button style={S.btnP} onClick={saveExpense}>Сохранить</button>
          <button style={S.btnS} onClick={()=>setScreen("finance")}>Отмена</button>
          {isEditExp&&<button style={{...S.btnD,background:confirmDel?C.red:C.redBg,color:confirmDel?"#fff":C.red}} onClick={()=>{
            if(confirmDel){deleteExpense();}
            else{setConfirmDel(true);setTimeout(()=>setConfirmDel(false),3000);}
          }}>{confirmDel?"Нажмите ещё раз для удаления":"Удалить расход"}</button>}
        </div>
      </div>
    </>);
  }

  function renderToday(){
    const all=overdue.length+dueToday_.length+dueSoon_.length+readyPU.length;
    return(<>
      <div style={S.hdr}><span style={S.htitle}>⚡ Сегодня</span><span style={{fontSize:12,color:C.muted}}>{new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"short"})}</span></div>
      <div style={S.body}>
        {all===0&&<div style={{textAlign:"center",padding:"52px 20px",color:C.faint}}><div style={{fontSize:44,marginBottom:12}}>✅</div><div style={{fontSize:16,fontWeight:600,color:C.muted}}>Всё под контролем!</div><div style={{fontSize:13,marginTop:6}}>Срочных дел нет.</div></div>}
        {overdue.length>0&&<><div style={S.sl}>🔴 Просрочено ({overdue.length})</div>{overdue.map(o=><div key={o.id} style={S.aRow(C.red)} onClick={()=>openDetail(o.id)}><div style={S.row}><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{o.desc}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>Срок был {fmtDate(o.dueDate)}</div><div style={{marginTop:4}}><Badge status={o.status}/></div></div></div></div>)}</>}
        {dueToday_.length>0&&<><div style={S.sl}>🟡 На сегодня ({dueToday_.length})</div>{dueToday_.map(o=><div key={o.id} style={S.aRow(C.amber)} onClick={()=>openDetail(o.id)}><div style={S.row}><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{o.desc}</div></div><Badge status={o.status}/></div></div>)}</>}
        {readyPU.length>0&&<><div style={S.sl}>🛍 Готовы к выдаче ({readyPU.length})</div>{readyPU.map(o=>{const bal=Math.max(0,Number(o.total||0)-Number(o.paid||0));return(<div key={o.id} style={S.aRow(C.green)} onClick={()=>openDetail(o.id)}><div style={S.row}><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{o.desc}</div>{bal>0&&<div style={{fontSize:12,fontWeight:700,color:C.amber,marginTop:4}}>При выдаче получить {money(bal)}</div>}</div>{o.phone&&<a href={telHref(o.phone)} onClick={e=>e.stopPropagation()} style={{fontSize:13,color:C.purpleMid,fontWeight:700,textDecoration:"none",padding:"6px 0"}}>📞 Позвонить</a>}</div></div>);})}</>}
        {dueSoon_.length>0&&<><div style={S.sl}>🔵 Через 1–3 дня ({dueSoon_.length})</div>{dueSoon_.map(o=><div key={o.id} style={S.aRow(C.blue)} onClick={()=>openDetail(o.id)}><div style={S.row}><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{o.desc}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600,color:C.blue}}>Срок {fmtDate(o.dueDate)}</div><div style={{marginTop:4}}><Badge status={o.status}/></div></div></div></div>)}</>}
        <div style={{height:16}}/>
      </div>
    </>);
  }

  if(!loaded) return <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><div style={{color:C.faint,fontSize:14}}>Загрузка…</div></div>;

  return(
    <div style={S.app}>
      {screen==="list"        &&renderList()}
      {screen==="detail"      &&renderDetail()}
      {screen==="order-form"  &&renderOrderForm()}
      {screen==="finance"     &&renderFinance()}
      {screen==="add-expense" &&renderAddExpense()}
      {screen==="today"       &&renderToday()}
      {toast&&<div style={S.toast_}>{toast}</div>}
      <nav style={S.nav}>
        <button style={S.ntab(tab==="orders")} onClick={()=>goTab("orders")}><span style={{fontSize:22}}>📋</span><span>Заказы</span></button>
        <button style={S.ntab(tab==="finance")} onClick={()=>goTab("finance")}><span style={{fontSize:22}}>💰</span><span>Финансы</span></button>
        <button style={S.ntab(tab==="today")} onClick={()=>goTab("today")}>
          <span style={{fontSize:22}}>⚡</span><span>Сегодня{urgentCount>0?` (${urgentCount})`:""}</span>
          {urgentCount>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 14px)",width:8,height:8,borderRadius:4,background:C.red,border:`2px solid ${C.card}`}}/>}
        </button>
      </nav>
    </div>
  );
}