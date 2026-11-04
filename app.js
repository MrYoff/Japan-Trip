// ===== Japan Trip Planner — extra features (Today, trains & luggage, hotels & SOS, voting, journal) =====
// Loaded BEFORE the main script; the main script calls these functions.
const TRIP_START='2027-03-19', TRIP_END='2027-03-28';
const TRIP_DATES=(()=>{const a=[];let d=new Date(TRIP_START+'T12:00:00');const e=new Date(TRIP_END+'T12:00:00');while(d<=e){a.push(isoOf(d));d.setDate(d.getDate()+1)}return a})();
function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function todayISO(){return isoOf(new Date())}
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dowOf(iso){return DOW[new Date(iso+'T12:00:00').getDay()]}
function fmtDay(iso){return new Date(iso+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
function dayNum(iso){const i=TRIP_DATES.indexOf(iso);return i<0?null:i+1}
const HOLIDAYS={'2027-03-21':'🎌 Vernal Equinox Day — public holiday, expect crowds','2027-03-22':'🎌 Substitute holiday — places normally closed Mondays often open today and close Tuesday instead (check)'};

// ---- seeds for new shared data ----
const SEED_EXTRA={ // extra fields merged into the original seeded ideas
 18:{hours:'9:30–17:00',closed:'Mon'},
 6:{hours:'10:00–17:00 (check site)',closed:'Wed'}
};
const SEED_HOTELS=[
 {id:'h1',stop:'Tokyo',checkin:'2027-03-19',checkout:'2027-03-23'},
 {id:'h2',stop:'Kawaguchiko',checkin:'2027-03-23',checkout:'2027-03-24'},
 {id:'h3',stop:'Kyoto',checkin:'2027-03-24',checkout:'2027-03-26'},
 {id:'h4',stop:'Nara / Osaka area',checkin:'2027-03-26',checkout:'2027-03-27'},
 {id:'h5',stop:'Osaka',checkin:'2027-03-27',checkout:'2027-03-28'}
].map(h=>({name:'',name_ja:'',address:'',address_ja:'',phone:'',confirmation:'',hospital:'',hospital_address:'',hospital_phone:'',...h}));
const SEED_LEGS=[
 {id:'l1',date:'2027-03-19',from:'Airport',to:'Tokyo hotel',how:"Narita: Keisei Skyliner or N'EX · Haneda: Keikyu Line or Tokyo Monorail",time:'',fare:0,jr:'Not JR',reserve:'Fill in once flights are booked.',luggage:'All bags with you.'},
 {id:'l2',date:'2027-03-23',from:'Shinjuku',to:'Kawaguchiko',how:'Fuji Excursion limited express — direct, about 2 hours',time:'',fare:4200,jr:'Partly JR',reserve:'Reserve seats. Tickets go on sale 1 month ahead (Feb 23, 2027) and sell out fast. Budget backup: highway bus from Busta Shinjuku.',luggage:'Forward big suitcases straight from the Tokyo hotel to the Kyoto hotel. Bring just an overnight bag to Kawaguchiko.'},
 {id:'l3',date:'2027-03-24',from:'Kawaguchiko',to:'Kyoto',how:'Not decided yet — night bus (see Booking Deadlines) or bus to Mishima + Tokaido Shinkansen',time:'',fare:0,jr:'Partly JR',reserve:'Pick one, then fill in the fare and time.',luggage:'Overnight bag only, if suitcases were forwarded to Kyoto.'},
 {id:'l4',date:'2027-03-26',from:'Kyoto',to:'Nara',how:'Kintetsu Kyoto Line (or JR Nara Line), about 35–50 min',time:'',fare:760,jr:'Not JR',reserve:'No reservation needed — just tap your IC card.',luggage:'Coin lockers at Nara stations, or forward suitcases to the next hotel.'},
 {id:'l5',date:'2027-03-27',from:'Nara',to:'Osaka',how:'Kintetsu Nara Line to Osaka-Namba, about 40 min',time:'',fare:700,jr:'Not JR',reserve:'No reservation needed.',luggage:''},
 {id:'l6',date:'2027-03-28',from:'Osaka',to:'Kansai Airport (KIX)',how:'Nankai Rapi:t from Namba, or JR Haruka from Tennoji / Shin-Osaka',time:'',fare:1500,jr:'Not JR',reserve:'Rapi:t / Haruka seats can be reserved; regular trains need nothing.',luggage:'All bags with you.'}
].map(l=>({booked:false,...l}));
const SEED_TASKS=[
 'Passports valid for the whole trip (check expiry dates)',
 'Fill in Visit Japan Web (immigration & customs QR codes)',
 'eSIM or pocket Wi-Fi for every phone',
 'Add Suica / PASMO to Apple Wallet (or plan to buy IC cards at the airport)',
 'Get some yen (7-Eleven ATMs take US cards)',
 'Tell banks/cards about the trip; check foreign transaction fees',
 'Travel insurance',
 'Download Google Translate Japanese (offline) + offline Google Maps',
 'Book Fuji Excursion seats (on sale Feb 23)',
 'Decide on luggage forwarding / big-suitcase seats on the Shinkansen',
 'Fill in hotel names + Japanese addresses (Hotels & SOS tab)',
 'Add this planner to everyone\'s home screen'
].map((t,i)=>({id:'t'+(i+1),text:t,who:'',done:false}));
const JR_PASS_OFFICIAL=50000, JR_PASS_AGENT=53000;

let travelers=[],votes={},hotels=SEED_HOTELS,legs=SEED_LEGS,backups={},tasks=SEED_TASKS,contacts=[],journal=[];
let me='';try{me=localStorage.getItem('jtp-me')||''}catch(e){}
let viewDay=null;

// ---- small helpers ----
const telHref=n=>'tel:'+String(n).replace(/[^\d+]/g,'');
const mapsHref=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
function hotelFor(iso){return hotels.find(h=>h.checkin<=iso&&iso<h.checkout)}
function closedWarn(i,iso){iso=iso||i.trip_date;if(!i.closed||!iso)return'';const dw=dowOf(iso);
 if(!new RegExp('\\b'+dw,'i').test(i.closed))return'';
 return `<div class="warn">⚠️ Closed on ${esc(i.closed)} — ${fmtDay(iso)} is a ${dw}${HOLIDAYS[iso]?' (but it\'s a holiday, so check — it may be open)':''}. Move it to another day?</div>`}
function voteNames(id){return votes[id]||[]}

// ---- modal / forms ----
function modal(html){const m=$('modal');m.querySelector('.mbox').innerHTML=html;m.classList.add('on');}
function closeModal(){$('modal').classList.remove('on')}
window.closeModal=closeModal;
function openForm(title,fields,obj,onSave,onDelete){
 modal(`<h3 style="margin-top:0">${esc(title)}</h3><form id="mform">${fields.map(([k,label,type,opts])=>{const v=obj[k]??'';
  if(type==='textarea')return `<label class="fl">${label}<textarea name="${k}" rows="3">${esc(v)}</textarea></label>`;
  if(type==='select')return `<label class="fl">${label}<select name="${k}">${opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<label class="fl">${label}<input name="${k}" type="${type||'text'}" value="${esc(v)}"></label>`}).join('')}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn primary">Save</button><button class="btn" type="button" onclick="closeModal()">Cancel</button>${onDelete?'<button class="btn danger" type="button" id="mdel" style="margin-left:auto">Delete</button>':''}</div></form>`);
 $('mform').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const o={...obj};fields.forEach(([k,,type])=>{o[k]=type==='number'?Number(f.get(k)||0):String(f.get(k)||'').trim()});closeModal();onSave(o)};
 if(onDelete)$('mdel').onclick=()=>{if(confirm('Delete this?')){closeModal();onDelete()}};
}

// ---- who am I (for votes, tasks, journal) ----
function setMe(n){me=n;try{localStorage.setItem('jtp-me',n)}catch(e){}if(n&&!travelers.includes(n)){travelers.push(n);save()}renderMeBtn();render()}
function pickMe(after){
 modal(`<h3 style="margin-top:0">Who are you?</h3><p class="small">So votes, tasks and journal entries show your name. This is remembered on this phone.</p>
 <div style="display:flex;gap:8px;flex-wrap:wrap">${travelers.map(t=>`<button class="btn" type="button" data-n="${esc(t)}">${esc(t)}</button>`).join('')}</div>
 <form id="meForm" style="margin-top:12px"><input name="n" placeholder="${travelers.length?'Or type a new name':'Your first name'}" required><button class="btn primary">OK</button></form>`);
 $('modal').querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{closeModal();setMe(b.dataset.n);after&&after()});
 $('meForm').onsubmit=e=>{e.preventDefault();const n=new FormData(e.target).get('n').trim();if(n){closeModal();setMe(n);after&&after()}};
}

function renderMeBtn(){const b=$('meBtn');if(b)b.textContent='👤 '+(me||'Who are you?')}

// ---- votes ----
window.vote=id=>{if(!me)return pickMe(()=>window.vote(id));const l=voteNames(id);votes[id]=l.includes(me)?l.filter(x=>x!==me):[...l,me];save();render()};
function voteBtn(i){const l=voteNames(i.id),mine=me&&l.includes(me);
 return `<button class="vbtn ${mine?'on':''}" type="button" onclick="vote(${JSON.stringify(i.id)})" title="${mine?'Remove your vote':'Vote for this'}">👍 ${l.length}</button>${l.length?` <span class="small">${l.map(esc).join(', ')}</span>`:''}`}

// ---- edit idea ----
window.editIdea=id=>{const i=ideas.find(x=>x.id===id);if(!i)return;
 openForm('Edit idea',[['title','Title'],['city','City'],['category','Category','select',['Sight','Food','Shopping','History','Experience','Transport']],['trip_date','Day','date'],['priority','Priority','select',['must-do','nice-to-have']],['estimated_cost_yen','Cost per person (¥)','number'],['hours','Opening hours (e.g. 10:00–17:00)'],['closed','Closed days (e.g. Mon, Wed)'],['notes','Notes','textarea'],['website_url','Website link','url']],i,
 o=>{Object.assign(i,o);save();filters();render()})};

// ---- countdown ----
function renderCountdown(){const t=todayISO(),el=$('countdown');if(!el)return;
 if(t<TRIP_START){const n=Math.round((new Date(TRIP_START+'T12:00:00')-new Date(t+'T12:00:00'))/864e5);el.textContent=`⏳ ${n} day${n===1?'':'s'} to go`}
 else if(t<=TRIP_END)el.textContent=`📍 Day ${dayNum(t)} of ${TRIP_DATES.length} — have fun!`;
 else el.textContent='🏠 Trip complete — relive it in the Journal';}

// ---- TODAY ----
window.setViewDay=d=>{viewDay=d;renderToday()};
function legCard(l){return `<div class="leg"><strong>🚆 ${esc(l.from)} → ${esc(l.to)}</strong>${l.time?` · ${esc(l.time)}`:''}${l.booked?' <span class="badge ok">✓ booked</span>':''}<br><span class="small">${esc(l.how)}</span>${l.fare?`<br><span class="small">${YEN(l.fare)} / person</span>`:''}${l.reserve?`<br><span class="small">🎫 ${esc(l.reserve)}</span>`:''}${l.luggage?`<br><span class="small">🧳 ${esc(l.luggage)}</span>`:''}</div>`}
function renderToday(){const box=$('todayBox');if(!box)return;const t=todayISO();
 const d=viewDay||(t>=TRIP_START&&t<=TRIP_END?t:TRIP_START);
 const n=dayNum(d),h=hotelFor(d),dayIdeas=ideas.filter(i=>i.trip_date===d),dayLegs=legs.filter(l=>l.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 let top='';if(t<TRIP_START&&!viewDay)top=`<p class="small">The trip hasn't started yet, so this is a preview of Day 1. During the trip this page opens on the current day automatically.</p>`;
 box.innerHTML=`<div class="chips">${TRIP_DATES.map(x=>`<button class="chip ${x===d?'on':''}" onclick="setViewDay('${x}')">${dayNum(x)}<small>${fmtDay(x).replace(',','<br>')}</small></button>`).join('')}</div>${top}
 <h2 style="margin:10px 0 2px">Day ${n} · ${fmtDay(d)}</h2>${HOLIDAYS[d]?`<p class="small">${HOLIDAYS[d]}</p>`:''}
 <div class="day"><h3>🏨 ${d===TRIP_END?'Flying home today':'Tonight\'s hotel'}</h3>${d===TRIP_END?'<p>Check out, then head to the airport — trains are below.</p>':h?hotelBlock(h,true):'<p class="small">No hotel set for this night.</p>'}</div>
 <div class="day"><h3>🚆 Trains today</h3>${dayLegs.length?dayLegs.map(legCard).join(''):'<p class="small">No train legs today — just local subway/bus with your IC card.</p>'}</div>
 <div class="day"><h3>🗺️ The plan</h3>${dayIdeas.length?dayIdeas.map(i=>`<div class="leg"><strong>${SHAPE[i.category]||'●'} ${esc(i.title)}</strong>${i.priority==='must-do'?' <span class="badge must">★</span>':''}<br><span class="small">${esc(i.city)}${i.hours?' · 🕘 '+esc(i.hours):''}${i.estimated_cost_yen?' · '+YEN(i.estimated_cost_yen)+'/person':''}</span>${closedWarn(i,d)}<br><a href="${mapsHref(i.place_label||i.title+' '+i.city)}" target="_blank" rel="noopener">Directions</a>${i.website_url?` · <a href="${esc(i.website_url)}" target="_blank" rel="noopener">Website</a>`:''}</div>`).join(''):'<p class="small">Nothing planned yet — add ideas with this date on the Ideas tab.</p>'}</div>
 <div class="day"><h3>☔ Rainy-day backup</h3><p>${backups[d]?esc(backups[d]).replace(/\n/g,'<br>'):'<span class="small">None set — add one on the Itinerary tab.</span>'}</p></div>
 <div class="sosrow"><a class="btn danger" href="tel:110">🚓 110 Police</a><a class="btn danger" href="tel:119">🚑 119 Ambulance</a><a class="btn" href="#" onclick="goTab('sos');return false">🆘 More help</a></div>`;}
window.goTab=id=>{const b=document.querySelector(`nav button[data-tab="${id}"]`);if(b)b.click()};

// ---- ITINERARY (day by day + backups) ----
function renderItinerary(){const box=$('days');if(!box)return;
 const undated=ideas.filter(i=>!i.trip_date||!TRIP_DATES.includes(i.trip_date));
 box.innerHTML=TRIP_DATES.map(d=>{const arr=ideas.filter(i=>i.trip_date===d),ls=legs.filter(l=>l.date===d),h=hotelFor(d);
  return `<div class="day"><h3 style="margin-bottom:2px">Day ${dayNum(d)} · ${fmtDay(d)}</h3><p class="small" style="margin-top:0">${h?'🏨 '+esc(h.stop)+(h.name?' — '+esc(h.name):''):d===TRIP_END?'✈️ Fly home':''}${HOLIDAYS[d]?'<br>'+HOLIDAYS[d]:''}</p>
  ${ls.map(l=>`<p>🚆 <strong>${esc(l.from)} → ${esc(l.to)}</strong> <span class="small">${esc(l.how)}</span></p>`).join('')}
  ${arr.map(i=>`<p>${SHAPE[i.category]||'●'} <strong>${esc(i.title)}</strong> — ${esc(i.city)} · ${YEN(i.estimated_cost_yen||0)}${i.priority==='must-do'?' · ★ Must-do':''}${voteNames(i.id).length?' · 👍 '+voteNames(i.id).length:''}${i.hours?' <span class="small">🕘 '+esc(i.hours)+'</span>':''}</p>${closedWarn(i,d)}`).join('')||'<p class="small">Nothing planned yet.</p>'}
  <label class="small">☔ Rainy-day backup<br><textarea class="bk" data-d="${d}" rows="2" placeholder="Indoor plan if it rains or Fuji is hidden…">${esc(backups[d]||'')}</textarea></label></div>`}).join('')
  +(undated.length?`<div class="day"><h3>No date set</h3>${undated.map(i=>`<p>${SHAPE[i.category]||'●'} <strong>${esc(i.title)}</strong> — ${esc(i.city)}${voteNames(i.id).length?' · 👍 '+voteNames(i.id).length:''}</p>`).join('')}</div>`:'');
 box.querySelectorAll('textarea.bk').forEach(ta=>ta.onchange=()=>{backups[ta.dataset.d]=ta.value.trim();save()});}

// ---- GETTING AROUND ----
function renderTravel(){const box=$('travelBox');if(!box)return;
 const per=legs.reduce((s,l)=>s+Number(l.fare||0),0),jr=legs.filter(l=>l.jr!=='Not JR').reduce((s,l)=>s+Number(l.fare||0),0);
 const worth=jr>JR_PASS_OFFICIAL;
 box.innerHTML=`<div class="day"><h3>🎫 Is a JR Pass worth it?</h3>
 <div class="stats"><div class="stat"><b>${YEN(per)}</b>Train fares listed below, per person</div><div class="stat"><b>${YEN(jr)}</b>Of that on JR lines (roughly)</div><div class="stat"><b>${YEN(JR_PASS_OFFICIAL)}</b>7-day JR Pass (official site)</div></div>
 <p>${worth?'✅ Your JR fares are above the pass price — the pass could pay off. Double-check the dates fit in 7 days.':'❌ <strong>Not worth it for this route.</strong> Buy tickets leg by leg and use IC cards (Suica/PASMO) for local rides.'}</p>
 <p class="small">The 7-day pass is ¥50,000 on the official JR Pass site and ¥53,000 through overseas agents since Oct 1, 2026. It doesn't cover the Fujikyu part of the Fuji Excursion, Kintetsu, Nankai, or buses. Fill in the "not decided" leg to make this more accurate.</p></div>
 <div class="day"><h3>🚆 Train & transit legs</h3><p class="small">Tap Edit to fill in times, fares and whether it's booked. Everyone sees the same list.</p>
 ${legs.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(l=>`<div class="leg"><label style="float:right"><input type="checkbox" ${l.booked?'checked':''} onchange="toggleLeg('${l.id}',this.checked)"> booked</label><span class="small">${fmtDay(l.date)}${l.time?' · '+esc(l.time):''} · ${esc(l.jr)}</span><br><strong>${esc(l.from)} → ${esc(l.to)}</strong>${l.fare?` · ${YEN(l.fare)}/person (${YEN(l.fare*4)} for 4)`:''}<br>${esc(l.how)}${l.reserve?`<br><span class="small">🎫 ${esc(l.reserve)}</span>`:''}${l.luggage?`<br><span class="small">🧳 ${esc(l.luggage)}</span>`:''}<br><a href="#" onclick="editLeg('${l.id}');return false">Edit</a></div>`).join('')}
 <button class="btn" onclick="editLeg()">➕ Add a leg</button></div>
 <div class="day"><h3>🧳 Luggage plan</h3>
 <p><strong>Luggage forwarding (takkyubin)</strong> — the hotel front desk or a konbini ships your suitcase to the next hotel, usually by the next day, for roughly a couple thousand yen per bag depending on size. Send bags <strong>2 days ahead</strong> to be safe, and label them with the next hotel's name, your check-in date and your name.</p>
 <p><strong>Best move for this trip:</strong> Kawaguchiko is only one night, so forward the big suitcases straight from the Tokyo hotel to the Kyoto hotel and take just a small overnight bag to Fuji.</p>
 <p><strong>Big suitcases on the Shinkansen</strong> — bags whose length + width + height add up to more than 160 cm need a reserved "seat with oversized baggage area" on the Tokaido Shinkansen (book it with your seat), or you pay an extra fee on board. Bags over 250 cm can't go on.</p>
 <p><strong>Day trips</strong> — coin lockers at big stations fit carry-ons; large lockers fill up by mid-morning.</p></div>`;}
window.toggleLeg=(id,v)=>{const l=legs.find(x=>x.id===id);if(l){l.booked=v;save();render()}};
window.editLeg=id=>{const l=id?legs.find(x=>x.id===id):{id:'l'+Date.now(),date:TRIP_START,from:'',to:'',how:'',time:'',fare:0,jr:'Not JR',reserve:'',luggage:'',booked:false};
 openForm(id?'Edit leg':'Add a leg',[['date','Date','date'],['time','Departure time','time'],['from','From'],['to','To'],['how','Train / bus'],['fare','Fare per person (¥)','number'],['jr','JR line?','select',['JR','Partly JR','Not JR']],['reserve','Booking notes','textarea'],['luggage','Luggage notes','textarea']],l,
 o=>{if(id)Object.assign(l,o);else legs.push(o);save();render()},id?()=>{legs=legs.filter(x=>x.id!==id);save();render()}:null)};

// ---- HOTELS & SOS ----
function hotelBlock(h,compact){
 return `<p style="margin:4px 0"><strong>${esc(h.name||h.stop+' hotel (not filled in yet)')}</strong>${h.name_ja?`<br><span class="ja">${esc(h.name_ja)}</span>`:''}</p>
 ${h.address_ja?`<p class="ja" style="margin:4px 0">${esc(h.address_ja)}</p>`:''}${h.address?`<p class="small" style="margin:4px 0">${esc(h.address)}</p>`:''}
 <p class="small" style="margin:4px 0">${fmtDay(h.checkin)} → ${fmtDay(h.checkout)}${h.confirmation?' · Conf # '+esc(h.confirmation):''}</p>
 <div class="sosrow"><button class="btn primary" type="button" onclick="showDriver('${h.id}')">🚕 Show to driver</button>${(h.address_ja||h.address||h.name)?`<a class="btn" href="${mapsHref(h.address_ja||h.address||h.name)}" target="_blank" rel="noopener">Directions</a>`:''}${h.phone?`<a class="btn" href="${telHref(h.phone)}">📞 Call</a>`:''}${compact?'':`<button class="btn" type="button" onclick="editHotel('${h.id}')">Edit</button>`}</div>
 ${compact?'':(h.hospital?`<p class="small">🏥 Nearest hospital: <strong>${esc(h.hospital)}</strong>${h.hospital_address?' — '+esc(h.hospital_address):''}${h.hospital_phone?` · <a href="${telHref(h.hospital_phone)}">${esc(h.hospital_phone)}</a>`:''}</p>`:'<p class="small">🏥 Nearest hospital: not filled in yet.</p>')}`}
window.showDriver=id=>{const h=hotels.find(x=>x.id===id);if(!h)return;
 if(!h.address_ja&&!h.name_ja&&!h.address){alert('Fill in this hotel\'s Japanese address first (Edit on the Hotels & SOS tab).');return}
 const o=$('driver');o.innerHTML=`<button class="btn" style="position:absolute;top:14px;right:14px" onclick="this.parentNode.classList.remove('on')">✕ Close</button>
 <p style="font-size:26px;margin:0 0 18px">この住所までお願いします。</p>
 <p style="font-size:40px;font-weight:800;margin:0 0 16px;line-height:1.25">${esc(h.name_ja||h.name)}</p>
 <p style="font-size:30px;line-height:1.35;margin:0 0 16px">${esc(h.address_ja||h.address)}</p>
 ${h.phone?`<p style="font-size:26px">☎ ${esc(h.phone)}</p>`:''}<p style="font-size:16px;color:#555;margin-top:30px">"Please take me to this address."</p>`;o.classList.add('on')};
window.editHotel=id=>{const h=hotels.find(x=>x.id===id);
 openForm('Hotel — '+h.stop,[['name','Hotel name (English)'],['name_ja','Hotel name in Japanese (copy from the booking site or Google Maps)'],['address','Address (English)'],['address_ja','Address in Japanese'],['phone','Hotel phone'],['confirmation','Confirmation #'],['checkin','Check-in','date'],['checkout','Check-out','date'],['hospital','Nearest hospital'],['hospital_address','Hospital address'],['hospital_phone','Hospital phone']],h,
 o=>{Object.assign(h,o);save();render()})};
window.editContact=ix=>{const c=ix==null?{name:'',phone:'',note:''}:contacts[ix];
 openForm(ix==null?'Add a contact':'Edit contact',[['name','Name'],['phone','Phone (with country code, e.g. +1 919…)'],['note','Note (e.g. "Dad", "travel insurance")']],c,
 o=>{if(ix==null)contacts.push(o);else contacts[ix]=o;save();render()},ix==null?null:()=>{contacts.splice(ix,1);save();render()})};
function renderSOS(){const box=$('sosBox');if(!box)return;
 box.innerHTML=`<div class="day"><h3>🆘 Emergency numbers (Japan)</h3><div class="sosrow">
 <a class="btn danger" href="tel:110">🚓 110 — Police</a><a class="btn danger" href="tel:119">🚑 119 — Ambulance / Fire</a></div>
 <p><a href="tel:+815038162787">☎️ Japan Visitor Hotline: 050-3816-2787</a> — 24/7 in English, for accidents, illness, disasters, or "we're stuck, what do we do?"</p>
 <p><a href="tel:+81332245000">🇺🇸 US Embassy Tokyo: 03-3224-5000</a><br><a href="tel:+81663155900">🇺🇸 US Consulate Osaka-Kobe: 06-6315-5900</a> — lost passport or serious trouble</p>
 <p class="small">110 and 119 work from any phone, even without a Japanese SIM.</p></div>
 <div class="day"><h3>🗣️ Phrases for emergencies</h3><div class="phr"><div class="ja">助けてください</div><span class="small"><em>Tasukete kudasai</em> — Please help</span></div><div class="phr"><div class="ja">救急車をお願いします</div><span class="small"><em>Kyūkyūsha o onegai shimasu</em> — Please call an ambulance</span></div><div class="phr"><div class="ja">病院はどこですか？</div><span class="small"><em>Byōin wa doko desu ka?</em> — Where is the hospital?</span></div><div class="phr"><div class="ja">道に迷いました</div><span class="small"><em>Michi ni mayoimashita</em> — We\'re lost</span></div><div class="phr"><div class="ja">英語を話せる人はいますか？</div><span class="small"><em>Eigo o hanaseru hito wa imasu ka?</em> — Does anyone speak English?</span></div></div>
 <h2>🏨 Hotels</h2><p class="small">Fill in each hotel's Japanese name and address once booked (copy them from the booking confirmation or Google Maps in Japanese). Then "Show to driver" puts it on screen in big text for a taxi driver or anyone you ask for directions.</p>
 ${hotels.map(h=>`<div class="day"><h3 style="margin-bottom:2px">${esc(h.stop)}</h3>${hotelBlock(h,false)}</div>`).join('')}
 <div class="day"><h3>📇 Group contacts</h3>${contacts.length?contacts.map((c,ix)=>`<p><strong>${esc(c.name)}</strong>${c.note?' <span class="small">('+esc(c.note)+')</span>':''} — ${c.phone?`<a href="${telHref(c.phone)}">${esc(c.phone)}</a>`:''} · <a href="#" onclick="editContact(${ix});return false">Edit</a></p>`).join(''):'<p class="small">Add everyone\'s phone numbers, plus anyone back home to call.</p>'}<button class="btn" onclick="editContact()">➕ Add contact</button></div>`;}

// ---- PREP: travelers + pre-trip tasks ----
function renderTasks(){const box=$('taskBox');if(!box)return;
 box.innerHTML=`<p class="small">Travelers: ${travelers.length?travelers.map(esc).join(', '):'none yet'} · <a href="#" onclick="editTravelers();return false">Edit names</a></p>
 ${tasks.map(t=>`<div class="task ${t.done?'done':''}"><label><input type="checkbox" ${t.done?'checked':''} onchange="taskDone('${t.id}',this.checked)"> ${esc(t.text)}</label>
 <select onchange="taskWho('${t.id}',this.value)"><option value="">Who?</option>${travelers.map(n=>`<option ${n===t.who?'selected':''}>${esc(n)}</option>`).join('')}</select>
 <a href="#" class="small" onclick="delTask('${t.id}');return false">✕</a></div>`).join('')}
 <form id="taskForm" style="margin-top:8px"><input name="t" placeholder="Add a task" required size="30"><button class="btn">Add</button></form>
 <p class="small">${tasks.filter(t=>t.done).length} of ${tasks.length} done</p>`;
 $('taskForm').onsubmit=e=>{e.preventDefault();const v=new FormData(e.target).get('t').trim();if(v){tasks.push({id:'t'+Date.now(),text:v,who:'',done:false});save();renderTasks()}};}
window.taskDone=(id,v)=>{const t=tasks.find(x=>x.id===id);t.done=v;save();renderTasks()};
window.taskWho=(id,v)=>{const t=tasks.find(x=>x.id===id);t.who=v;save()};
window.delTask=id=>{if(confirm('Remove this task?')){tasks=tasks.filter(x=>x.id!==id);save();renderTasks()}};
window.editTravelers=()=>{const v=prompt('Everyone on the trip, separated by commas:',travelers.join(', '));if(v===null)return;travelers=v.split(',').map(s=>s.trim()).filter(Boolean);save();render()};

// ---- JOURNAL (each entry is its own Firestore doc so photos don't bloat the plan) ----
let journalCol=null,journalUnsub=null;
function startJournal(db){journalCol=db.collection('trips');
 journalUnsub=journalCol.where('kind','==','journal').onSnapshot(s=>{journal=s.docs.map(d=>({_id:d.id,...d.data()}));renderJournal()},e=>{$('jStatus')&&($('jStatus').textContent='⚠️ Journal sync error: '+e.message)})}
function shrinkPhoto(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height,m=1100;if(w>m||h>m){const r=Math.min(m/w,m/h);w=Math.round(w*r);h=Math.round(h*r)}
 const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);let q=.72,u=c.toDataURL('image/jpeg',q);while(u.length>700000&&q>.35){q-=.1;u=c.toDataURL('image/jpeg',q)}URL.revokeObjectURL(img.src);res(u)};img.onerror=rej;img.src=URL.createObjectURL(file)})}
function renderJournal(){const box=$('jList');if(!box)return;
 const by={};journal.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.created||0)-(a.created||0)).forEach(j=>{(by[j.date]=by[j.date]||[]).push(j)});
 box.innerHTML=Object.keys(by).length?Object.entries(by).map(([d,arr])=>`<div class="day"><h3>${dayNum(d)?'Day '+dayNum(d)+' · ':''}${fmtDay(d)}</h3>${arr.map(j=>`<div class="jentry">${j.photo?`<img src="${j.photo}" alt="" loading="lazy">`:''}<p>${esc(j.text).replace(/\n/g,'<br>')}</p><p class="small">— ${esc(j.who||'someone')} · <a href="#" onclick="delJournal('${j._id}');return false">Delete</a></p></div>`).join('')}</div>`).join(''):'<p class="small">No entries yet. During the trip, add a photo and a few lines each day — after the trip this becomes your scrapbook.</p>';}
window.delJournal=id=>{if(!confirm('Delete this journal entry?'))return;if(journalCol)journalCol.doc(id).delete();else{journal=journal.filter(j=>j._id!==id);try{localStorage.setItem('jtp-journal',JSON.stringify(journal))}catch(e){}renderJournal()}};
function initJournalForm(){const f=$('jForm');if(!f)return;const t=todayISO();f.date.value=(t>=TRIP_START&&t<=TRIP_END)?t:TRIP_START;
 f.onsubmit=async e=>{e.preventDefault();if(!me)return pickMe(()=>f.requestSubmit());const btn=f.querySelector('button');btn.disabled=true;btn.textContent='Saving…';
  try{const file=f.photo.files[0];const entry={kind:'journal',date:f.date.value,text:f.text.value.trim(),who:me,created:Date.now(),photo:file?await shrinkPhoto(file):''};
   if(journalCol)await Promise.race([journalCol.doc('journal-'+entry.created).set(entry),new Promise(r=>setTimeout(r,1500))]); // offline: queued, resolves later
   else{journal.push({_id:'journal-'+entry.created,...entry});try{localStorage.setItem('jtp-journal',JSON.stringify(journal))}catch(e){}renderJournal()}
   f.text.value='';f.photo.value='';}
  catch(err){alert('Could not save: '+err.message)}
  btn.disabled=false;btn.textContent='Add entry'}}

function renderExtras(){renderCountdown();renderMeBtn();renderToday();renderItinerary();renderTravel();renderSOS();renderTasks()}
