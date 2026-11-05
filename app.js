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
 'Fill in hotel names + Japanese addresses (Plan → Hotels)',
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
function legCard(l){const fl=l.id==='l1'&&typeof flights!=='undefined'&&flights[0]&&flights[0].to?flights[0].to+' airport':l.from;return `<div class="leg"><strong>🚆 ${esc(fl)} → ${esc(l.to)}</strong>${l.time?` · ${esc(l.time)}`:''}${l.booked?' <span class="badge ok">✓ booked</span>':''}<br><span class="small">${esc(l.how)}</span>${l.fare?`<br><span class="small">${YEN(l.fare)} / person</span>`:''}${l.reserve?`<br><span class="small">🎫 ${esc(l.reserve)}</span>`:''}${l.luggage?`<br><span class="small">🧳 ${esc(l.luggage)}</span>`:''}</div>`}
function renderToday(){const box=$('todayBox');if(!box)return;const t=todayISO();
 const d=viewDay||(t>=TRIP_START&&t<=TRIP_END?t:TRIP_START);
 const n=dayNum(d),h=hotelFor(d),dayIdeas=ideas.filter(i=>i.trip_date===d),dayLegs=legs.filter(l=>l.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 let top='';if(t<TRIP_START&&!viewDay)top=`<p class="small">The trip hasn't started yet, so this is a preview of Day 1. During the trip this page opens on the current day automatically.</p>`;
 box.innerHTML=`<div class="chips">${TRIP_DATES.map(x=>`<button class="chip ${x===d?'on':''}" onclick="setViewDay('${x}')">${dayNum(x)}<small>${fmtDay(x).replace(',','<br>')}</small></button>`).join('')}</div>${top}
 <h2 style="margin:10px 0 2px">Day ${n} · ${fmtDay(d)}</h2><p style="margin:2px 0">${wxLine(d)}</p>${sakuraLine(d)?`<p style="margin:2px 0">${sakuraLine(d)}</p>`:''}${HOLIDAYS[d]?`<p class="small">${HOLIDAYS[d]}</p>`:''}
 ${flightsOn(d).length?`<div class="day"><h3>✈️ Flights today</h3>${flightsOn(d).map(f=>flightCard(f,false)).join('')}</div>`:(d===TRIP_START||d===TRIP_END)&&!flights.some(f=>f.number)?`<div class="day"><h3>✈️ Flights</h3><p class="small">No flight details yet — <a href="#" onclick="goTab('travel');return false">add them under Plan → Flights &amp; trains</a>.</p></div>`:''}
 <div class="day"><h3>🏨 ${d===TRIP_END?'Flying home today':'Tonight\'s hotel'}</h3>${d===TRIP_END?'<p>Check out, then head to the airport — trains are below.</p>':h?hotelBlock(h,true):'<p class="small">No hotel set for this night.</p>'}</div>
 <div class="day"><h3>🚆 Trains today</h3>${dayLegs.length?dayLegs.map(legCard).join(''):'<p class="small">No train legs today — just local subway/bus with your IC card.</p>'}</div>
 <div class="day"><h3>🗺️ The plan</h3>${dayIdeas.length?dayIdeas.map(i=>`<div class="leg"><strong>${SHAPE[i.category]||'●'} ${esc(i.title)}</strong>${i.priority==='must-do'?' <span class="badge must">★</span>':''}<br><span class="small">${esc(i.city)}${i.hours?' · 🕘 '+esc(i.hours):''}${i.estimated_cost_yen?' · '+YEN(i.estimated_cost_yen)+'/person':''}</span>${closedWarn(i,d)}<br><a href="${mapsHref(i.place_label||i.title+' '+i.city)}" target="_blank" rel="noopener">Directions</a>${i.website_url?` · <a href="${esc(i.website_url)}" target="_blank" rel="noopener">Website</a>`:''}</div>`).join(''):'<p class="small">Nothing planned yet — add places with this date under Places.</p>'}</div>
 <div class="day"><h3>☔ Rainy-day backup</h3><p>${backups[d]?esc(backups[d]).replace(/\n/g,'<br>'):'<span class="small">None yet — add one under “All 10 days”.</span>'}</p></div>
 `;}
window.goTab=id=>go(id);

// ---- ITINERARY (day by day + backups) ----
function renderItinerary(){const box=$('days');if(!box)return;
 const undated=ideas.filter(i=>!i.trip_date||!TRIP_DATES.includes(i.trip_date));
 box.innerHTML=TRIP_DATES.map(d=>{const arr=ideas.filter(i=>i.trip_date===d),ls=legs.filter(l=>l.date===d),h=hotelFor(d);
  return `<div class="day"><h3 style="margin-bottom:2px">Day ${dayNum(d)} · ${fmtDay(d)}</h3><p style="margin:2px 0">${wxLine(d)}${sakuraLine(d)?'<br>'+sakuraLine(d):''}</p>${flightsOn(d).map(f=>`<p>✈️ <strong>${esc(f.from)} → ${esc(f.to)}</strong> ${esc(f.airline)} ${esc(f.number)}</p>`).join('')}<p class="small" style="margin-top:0">${h?'🏨 '+esc(h.stop)+(h.name?' — '+esc(h.name):''):d===TRIP_END?'✈️ Fly home':''}${HOLIDAYS[d]?'<br>'+HOLIDAYS[d]:''}</p>
  ${ls.map(l=>`<p>🚆 <strong>${esc(l.from)} → ${esc(l.to)}</strong> <span class="small">${esc(l.how)}</span></p>`).join('')}
  ${arr.map(i=>`<p>${SHAPE[i.category]||'●'} <strong>${esc(i.title)}</strong> — ${esc(i.city)} · ${YEN(i.estimated_cost_yen||0)}${i.priority==='must-do'?' · ★ Must-do':''}${voteNames(i.id).length?' · 👍 '+voteNames(i.id).length:''}${i.hours?' <span class="small">🕘 '+esc(i.hours)+'</span>':''}</p>${closedWarn(i,d)}`).join('')||'<p class="small">Nothing planned yet.</p>'}
  <label class="small">☔ Rainy-day backup<br><textarea class="bk" data-d="${d}" rows="2" placeholder="Indoor plan if it rains or Fuji is hidden…">${esc(backups[d]||'')}</textarea></label></div>`}).join('')
  +(undated.length?`<div class="day"><h3>No date set</h3>${undated.map(i=>`<p>${SHAPE[i.category]||'●'} <strong>${esc(i.title)}</strong> — ${esc(i.city)}${voteNames(i.id).length?' · 👍 '+voteNames(i.id).length:''}</p>`).join('')}</div>`:'');
 box.querySelectorAll('textarea.bk').forEach(ta=>ta.onchange=()=>{backups[ta.dataset.d]=ta.value.trim();save()});}

// ---- GETTING AROUND ----
function renderTravel(){const box=$('travelBox');if(!box)return;
 const per=legs.reduce((s,l)=>s+Number(l.fare||0),0),jr=legs.filter(l=>l.jr!=='Not JR').reduce((s,l)=>s+Number(l.fare||0),0);
 const worth=jr>JR_PASS_OFFICIAL;
 box.innerHTML=`<div class="day"><h3>✈️ Flights</h3>${flights.map(f=>flightCard(f,true)).join('')}<button class="btn" onclick="editFlight()">➕ Add a connecting flight</button></div><div class="day"><h3>🎫 Is a JR Pass worth it?</h3>
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
 if(!h.address_ja&&!h.name_ja&&!h.address){alert('Fill in this hotel\'s Japanese address first (Plan → Hotels → Edit).');return}
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
function renderHotels(){const box=$('hotelsBox');if(!box)return;box.innerHTML=`<p class="small">Fill in each hotel's Japanese name and address once booked (copy them from the booking confirmation or Google Maps in Japanese). Then "Show to driver" puts it on screen in big text for a taxi driver or anyone you ask for directions.</p>
 ${hotels.map(h=>`<div class="day"><h3 style="margin-bottom:2px">${esc(h.stop)}</h3>${hotelBlock(h,false)}</div>`).join('')}
 `}
function renderSOS(){const box=$('sosBox');if(!box)return;
 box.innerHTML=`<div class="day"><h3>🆘 Emergency numbers (Japan)</h3><div class="sosrow">
 <a class="btn danger" href="tel:110">🚓 110 — Police</a><a class="btn danger" href="tel:119">🚑 119 — Ambulance / Fire</a></div>
 <p><a href="tel:+815038162787">☎️ Japan Visitor Hotline: 050-3816-2787</a> — 24/7 in English, for accidents, illness, disasters, or "we're stuck, what do we do?"</p>
 <p><a href="tel:+81332245000">🇺🇸 US Embassy Tokyo: 03-3224-5000</a><br><a href="tel:+81663155900">🇺🇸 US Consulate Osaka-Kobe: 06-6315-5900</a> — lost passport or serious trouble</p>
 <p class="small">110 and 119 work from any phone, even without a Japanese SIM.</p></div>
 <div class="day"><h3>🗣️ Phrases for emergencies</h3><div class="phr"><div class="ja">助けてください</div><span class="small"><em>Tasukete kudasai</em> — Please help</span></div><div class="phr"><div class="ja">救急車をお願いします</div><span class="small"><em>Kyūkyūsha o onegai shimasu</em> — Please call an ambulance</span></div><div class="phr"><div class="ja">病院はどこですか？</div><span class="small"><em>Byōin wa doko desu ka?</em> — Where is the hospital?</span></div><div class="phr"><div class="ja">道に迷いました</div><span class="small"><em>Michi ni mayoimashita</em> — We\'re lost</span></div><div class="phr"><div class="ja">英語を話せる人はいますか？</div><span class="small"><em>Eigo o hanaseru hito wa imasu ka?</em> — Does anyone speak English?</span></div></div>
 ${phrasesCard()}${tzCard()}<div class="day"><h3>📇 Group contacts</h3>${contacts.length?contacts.map((c,ix)=>`<p><strong>${esc(c.name)}</strong>${c.note?' <span class="small">('+esc(c.note)+')</span>':''} — ${c.phone?`<a href="${telHref(c.phone)}">${esc(c.phone)}</a>`:''} · <a href="#" onclick="editContact(${ix});return false">Edit</a></p>`).join(''):'<p class="small">Add everyone\'s phone numbers, plus anyone back home to call.</p>'}<button class="btn" onclick="editContact()">➕ Add contact</button></div>`;}

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
function renderJournal(){const box=$('jList');if(!box)return;if(typeof renderHome==='function'&&navReady)renderHome();
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



// ===================== Round 2: flights, calendar, weather, sakura, time, souvenirs, phrases =====================
const SEED_FLIGHTS=[
 {id:'f1',dir:'Outbound',airline:'',number:'',from:'RDU',to:'',depart:'',arrive:'',confirmation:'',notes:''},
 {id:'f2',dir:'Return',airline:'',number:'',from:'KIX',to:'RDU',depart:'',arrive:'',confirmation:'',notes:''}];
const SAKURA_CITIES=['Tokyo','Kawaguchiko','Kyoto','Nara','Osaka'];
let flights=SEED_FLIGHTS,sakura={},souvenirs=[];
const HOME_TZ='America/New_York',JP_TZ='Asia/Tokyo';

// ---- helpers ----
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return isoOf(d)}
function fmtTZ(date,tz,opts){return date.toLocaleString('en-US',{timeZone:tz,...opts})}
function jstToLocal(jst){return fmtTZ(new Date(jst+':00+09:00'),HOME_TZ,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function fmtDT(v){if(!v)return'';const [d,t]=v.split('T');return fmtDay(d)+(t?' · '+new Date('2000-01-01T'+t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'')}

// ---- FLIGHTS ----
function flightCard(f,withEdit){const filled=f.number||f.depart;
 return `<div class="leg"><strong>✈️ ${esc(f.dir)}: ${esc(f.from||'?')} → ${esc(f.to||'?')}</strong>${f.airline||f.number?` · ${esc(f.airline)} ${esc(f.number)}`:''}<br>
 ${filled?`<span class="small">Departs ${esc(fmtDT(f.depart))||'?'} · Arrives ${esc(fmtDT(f.arrive))||'?'} (local times)</span>`:'<span class="small">Not filled in yet.</span>'}
 ${f.confirmation?`<br><span class="small">Confirmation: <strong>${esc(f.confirmation)}</strong></span>`:''}${f.notes?`<br><span class="small">${esc(f.notes)}</span>`:''}
 ${f.number?`<br><a href="https://www.flightaware.com/live/flight/${encodeURIComponent((f.number||'').replace(/\s/g,''))}" target="_blank" rel="noopener">Flight status</a>`:''}${withEdit?`${f.number?' · ':'<br>'}<a href="#" onclick="editFlight('${f.id}');return false">Edit</a>`:''}</div>`}
window.editFlight=id=>{const f=id?flights.find(x=>x.id===id):{id:'f'+Date.now(),dir:'Connection',airline:'',number:'',from:'',to:'',depart:'',arrive:'',confirmation:'',notes:''};
 openForm(id?'Flight — '+f.dir:'Add a flight',[['dir','Which flight','select',['Outbound','Connection','Return']],['airline','Airline'],['number','Flight number (e.g. AA 175)'],['from','From airport (e.g. RDU)'],['to','To airport (e.g. HND or NRT)'],['depart','Departs (local time there)','datetime-local'],['arrive','Arrives (local time there)','datetime-local'],['confirmation','Confirmation code'],['notes','Notes (seats, bags, terminal…)','textarea']],f,
 o=>{o.from=o.from.toUpperCase();o.to=o.to.toUpperCase();if(id)Object.assign(f,o);else flights.push(o);save();render()},id&&!['f1','f2'].includes(id)?()=>{flights=flights.filter(x=>x.id!==id);save();render()}:null)};
function flightsOn(d){return flights.filter(f=>(f.depart||'').slice(0,10)===d||(f.arrive||'').slice(0,10)===d)}

// ---- CALENDAR (.ics) ----
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\n/g,'\\n')}
function icsEvent(r,ix){const [date,title,desc,jst]=r,stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 const L=['BEGIN:VEVENT','UID:jtp-deadline-'+ix+'@mryoff.github.io','DTSTAMP:'+stamp,'SUMMARY:'+icsEsc('🌸 Japan trip: '+title)];
 if(jst){const s=new Date(jst+':00+09:00'),e=new Date(s.getTime()+30*60000),f=d=>d.toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  L.push('DTSTART:'+f(s),'DTEND:'+f(e),'DESCRIPTION:'+icsEsc(desc+'\nOpens '+jst.replace('T',' ')+' Japan time.\nhttps://mryoff.github.io/Japan-Trip/'),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(title),'TRIGGER:-P1D','END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(title),'TRIGGER:-PT30M','END:VALARM')}
 else{const d=date.replace(/-/g,''),n=addDays(date,1).replace(/-/g,'');
  L.push('DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+n,'DESCRIPTION:'+icsEsc(desc+'\nhttps://mryoff.github.io/Japan-Trip/'),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(title),'TRIGGER:-PT15H','END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(title),'TRIGGER:PT9H','END:VALARM')}
 L.push('END:VEVENT');return L.join('\r\n')}
function downloadICS(list,name){const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Japan Trip Planner//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Japan Trip deadlines',...list.map(([r,ix])=>icsEvent(r,ix)),'END:VCALENDAR'].join('\r\n');
 const url=URL.createObjectURL(new Blob([body],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},2000)}
window.calAll=()=>{const today=todayISO(),list=reminders.map((r,ix)=>[r,ix]).filter(([r,ix])=>!doneR[ix]&&r[0]>=today);if(!list.length)return alert('No upcoming deadlines left to add.');downloadICS(list,'japan-trip-deadlines.ics')};
window.calOne=ix=>downloadICS([[reminders[ix],ix]],'japan-trip-deadline.ics');
function renderRemindersX(){const box=$('reminders');if(!box)return;const today=todayISO();
 box.innerHTML=`<p><button class="btn primary" onclick="calAll()">📅 Add all upcoming deadlines to my calendar</button></p><p class="small">Downloads a calendar file. On iPhone, tap "Add All". Each one reminds you the day before and the day of. Already-checked items are skipped.</p>`+
 reminders.map((r,ix)=>[r,ix]).sort((a,b)=>(a[0][3]||a[0][0]).localeCompare(b[0][3]||b[0][0])).map(([r,ix])=>`<label class="chk ${r[0]<today&&!doneR[ix]?'late':''}"><input type="checkbox" ${doneR[ix]?'checked':''} onchange="doneR[${ix}]=this.checked;save()"> <strong>${fmtDay(r[0])}</strong> — ${esc(r[1])} <a href="#" class="small" onclick="calOne(${ix});return false" title="Add to calendar">📅</a><br><span class="small">${esc(r[2])}${r[3]?`<br>⏰ Opens ${r[3].slice(11)} Japan time = <strong>${jstToLocal(r[3])}</strong> Eastern`:''}</span></label>`).join('')}

// ---- WEATHER (Open-Meteo, free, no key) ----
const CITY_COORDS={Tokyo:[35.68,139.69],Kawaguchiko:[35.50,138.76],Kyoto:[35.01,135.77],Nara:[34.68,135.80],Osaka:[34.69,135.50]};
function cityFor(d){const c=ideas.filter(i=>i.trip_date===d).map(i=>i.city).find(c=>CITY_COORDS[c]);if(c)return c;const h=hotelFor(d);
 if(!h)return 'Osaka';return CITY_COORDS[h.stop]?h.stop:(h.stop.startsWith('Nara')?'Nara':'Osaka')}
let wx={};try{wx=JSON.parse(localStorage.getItem('jtp-wx')||'{}')}catch(e){}
let wxStarted=false;
async function fetchWeather(){if(wxStarted)return;wxStarted=true;const t=todayISO();
 if(addDays(t,15)<TRIP_START||t>TRIP_END)return; // forecasts only reach ~16 days out
 const cities=[...new Set(TRIP_DATES.map(cityFor))];let changed=false;
 for(const c of cities){if(wx[c]&&Date.now()-wx[c].t<3*3600e3)continue;const [la,lo]=CITY_COORDS[c];
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,cloud_cover_mean&temperature_unit=fahrenheit&timezone=Asia%2FTokyo&forecast_days=16`);
   const j=await r.json();if(j.daily){wx[c]={t:Date.now(),d:j.daily};changed=true}}catch(e){}}
 if(changed){try{localStorage.setItem('jtp-wx',JSON.stringify(wx))}catch(e){}renderToday();renderItinerary()}}
function wxEmoji(c){return c===0?'☀️':c<=2?'🌤️':c===3?'☁️':c<=48?'🌫️':c<=67?'🌧️':c<=77?'🌨️':c<=82?'🌦️':'⛈️'}
function wxLine(d){const c=cityFor(d),w=wx[c]&&wx[c].d,i=w?w.time.indexOf(d):-1;
 if(i>=0){const cc=w.cloud_cover_mean?w.cloud_cover_mean[i]:null;
  return `<span class="wx">${wxEmoji(w.weather_code[i])} ${Math.round(w.temperature_2m_max[i])}° / ${Math.round(w.temperature_2m_min[i])}°F · 💧${w.precipitation_probability_max[i]??'?'}% rain <span class="small">(${c})</span>${c==='Kawaguchiko'&&cc!=null?` · 🗻 Fuji ${cc<40?'likely visible':cc<70?'maybe visible — go early':'probably hidden by clouds'}`:''}</span>`}
 if(todayISO()>TRIP_END)return'';
 return `<span class="small">🌤️ Forecast for ${c} shows up around ${fmtDay(addDays(d,-15))}</span>`}

// ---- SAKURA TRACKER ----
function bloomStatus(city,d){const s=sakura[city];if(!s||!s.bloom)return null;const full=s.full||addDays(s.bloom,7);
 if(d<s.bloom){const n=Math.round((new Date(s.bloom+'T12:00:00')-new Date(d+'T12:00:00'))/864e5);return {e:'🌱',t:`Buds — first bloom in ~${n} day${n===1?'':'s'}`}}
 if(d<full)return {e:'🌸',t:'Blooming (not full yet)'};if(d<=addDays(full,6))return {e:'🌸🌸',t:'Full bloom'};return {e:'🍃',t:'Petals falling'}}
function sakuraLine(d){const c=cityFor(d),b=bloomStatus(c,d);return b?`<span class="small">${b.e} ${c}: ${b.t}</span>`:''}
window.editSakura=c=>{const s=sakura[c]||{bloom:'',full:'',source:''};
 openForm('Cherry blossom forecast — '+c,[['bloom','First bloom (kaika) date','date'],['full','Full bloom (mankai) date — leave blank to assume ~1 week later','date'],['source','Where this came from (e.g. Weathernews, Dec 10)']],s,
 o=>{sakura[c]={...o,updated:todayISO()};save();render()})};
function renderSakura(){const box=$('sakuraBox');if(!box)return;
 box.innerHTML=`<table><tr><th>City</th><th>First bloom</th><th>Full bloom</th><th></th></tr>${SAKURA_CITIES.map(c=>{const s=sakura[c]||{};return `<tr><td>${c}</td><td>${s.bloom?fmtDay(s.bloom):'—'}</td><td>${s.full?fmtDay(s.full):s.bloom?'~'+fmtDay(addDays(s.bloom,7)):'—'}</td><td><a href="#" onclick="editSakura('${c}');return false">Edit</a>${s.source?`<br><span class="small">${esc(s.source)}</span>`:''}</td></tr>`}).join('')}</table>
 <h4 style="margin-bottom:4px">Your days</h4><div class="chips">${TRIP_DATES.map(d=>{const c=cityFor(d),b=bloomStatus(c,d);return `<div class="chip" style="cursor:default" title="${b?b.t:'No forecast yet'}">${b?b.e:'❔'}<small>Day ${dayNum(d)}<br>${c}</small></div>`}).join('')}</div>
 <p class="small">Full bloom usually lasts about a week. Kawaguchiko typically blooms about a week after Tokyo.</p>`}

// ---- TIME ZONES ----
function renderClock(){document.querySelectorAll('.clock').forEach(el=>{const n=new Date();
 el.innerHTML=`🇯🇵 Japan: <strong>${fmtTZ(n,JP_TZ,{weekday:'short',hour:'numeric',minute:'2-digit'})}</strong> · 🏠 Home: <strong>${fmtTZ(n,HOME_TZ,{weekday:'short',hour:'numeric',minute:'2-digit'})}</strong>`})}
setInterval(renderClock,30000);
function tzOffset(tz,date){return (new Date(date.toLocaleString('en-US',{timeZone:tz}))-new Date(date.toLocaleString('en-US',{timeZone:'UTC'})))/36e5}
function tzCard(d){const at=new Date((d||TRIP_START)+'T12:00:00+09:00'),diff=tzOffset(JP_TZ,at)-tzOffset(HOME_TZ,at);
 return `<div class="day"><h3>🕐 Japan ↔ Home</h3><p class="clock"></p><p class="small">During the trip Japan is <strong>${diff} hours ahead</strong> of North Carolina (US daylight saving starts Mar 14). Easy time to call home: 7–10 PM in Japan = morning back home.</p>
 <p>If it's <input type="time" class="tzIn" value="19:00"> in Japan, it's <strong class="tzOut"></strong> at home.</p></div>`}
function wireTZ(d){document.querySelectorAll('.tzIn').forEach(inp=>{const out=inp.parentNode.querySelector('.tzOut');const f=()=>{if(!inp.value)return;out.textContent=fmtTZ(new Date((d||TRIP_START)+'T'+inp.value+':00+09:00'),HOME_TZ,{weekday:'short',hour:'numeric',minute:'2-digit'})};inp.oninput=f;f()});renderClock()}

// ---- SOUVENIRS ----
window.editSouv=id=>{const s=id?souvenirs.find(x=>x.id===id):{id:'s'+Date.now(),forWho:'',item:'',where:'',budget:0,buyer:me||'',bought:false};
 openForm(id?'Edit souvenir':'Add a souvenir',[['forWho','Who it\'s for'],['item','What'],['where','Where to get it'],['budget','Budget (¥)','number'],['buyer','Who\'s buying it','select',['',...travelers]]],s,
 o=>{if(id)Object.assign(s,o);else souvenirs.push(o);save();render()},id?()=>{souvenirs=souvenirs.filter(x=>x.id!==id);save();render()}:null)};
window.souvBought=(id,v)=>{const s=souvenirs.find(x=>x.id===id);s.bought=v;save();render()};
function renderSouv(){const box=$('souvBox');if(!box)return;const tot=souvenirs.reduce((a,s)=>a+Number(s.budget||0),0),done=souvenirs.filter(s=>s.bought).reduce((a,s)=>a+Number(s.budget||0),0);
 box.innerHTML=(souvenirs.length?`<table><tr><th>✓</th><th>For</th><th>What</th><th>Where</th><th>Budget</th><th></th></tr>${souvenirs.map(s=>`<tr class="${s.bought?'doneRow':''}"><td><input type="checkbox" ${s.bought?'checked':''} onchange="souvBought('${s.id}',this.checked)"></td><td>${esc(s.forWho)}</td><td>${esc(s.item)}${s.buyer?`<br><span class="small">${esc(s.buyer)} buying</span>`:''}</td><td>${esc(s.where)}</td><td>${YEN(s.budget||0)}</td><td><a href="#" onclick="editSouv('${s.id}');return false">Edit</a></td></tr>`).join('')}
 <tr><th colspan="4">Total budget (bought so far: ${YEN(done)})</th><th>${YEN(tot)}<br><span class="small">≈ ${USD(tot/RATE)}</span></th><th></th></tr></table>`:'<p class="small">Nothing yet — add who you\'re buying for and what.</p>')+
 `<p><button class="btn" onclick="editSouv()">➕ Add a souvenir</button></p>
 <div class="warn" style="background:var(--soft);border-color:var(--line);color:var(--ink)"><strong>Tax-free shopping changed on Nov 1, 2026.</strong> At stores with the Tax-Free sign you now pay the full price (including the 10% tax), show your passport, then get the tax refunded when you leave Japan: bring the items and receipts to customs at the airport <em>before</em> check-in. Keep tax-free items unused and in your carry-on, and leave extra time at KIX on Mar 28.</div>`}

// ---- EVERYDAY PHRASES ----
const PHRASES=[['すみません','Sumimasen','Excuse me / Sorry'],['ありがとうございます','Arigatō gozaimasu','Thank you'],['4人です','Yonin desu','Table for four'],['これをください','Kore o kudasai','This one, please'],['英語のメニューはありますか？','Eigo no menyū wa arimasu ka?','Do you have an English menu?'],['お会計をお願いします','O-kaikei o onegai shimasu','The check, please'],['カードで払えますか？','Kādo de haraemasu ka?','Can I pay by card?'],['トイレはどこですか？','Toire wa doko desu ka?','Where is the bathroom?'],['切符を4枚ください','Kippu o yonmai kudasai','Four tickets, please'],['写真を撮ってもいいですか？','Shashin o tottemo ii desu ka?','May I take a photo?'],['荷物を預かってもらえますか？','Nimotsu o azukatte moraemasu ka?','Can you hold our luggage?'],['この荷物を次のホテルに送りたいです','Kono nimotsu o tsugi no hoteru ni okuritai desu','We want to send this luggage to our next hotel'],['ごちそうさまでした','Gochisōsama deshita','Thank you for the meal (say it when leaving)']];
window.showBig=ix=>{const p=PHRASES[ix],o=$('driver');o.innerHTML=`<button class="btn" style="position:absolute;top:14px;right:14px" onclick="this.parentNode.classList.remove('on')">✕ Close</button><p style="font-size:44px;font-weight:800;line-height:1.3;margin:0 0 20px">${p[0]}</p><p style="font-size:22px;margin:0 0 8px"><em>${p[1]}</em></p><p style="font-size:18px;color:#555">${p[2]}</p>`;o.classList.add('on')};
function phrasesCard(){return `<div class="day"><h3>💬 Everyday phrases</h3><p class="small">Tap one to show it in big text.</p>${PHRASES.map((p,ix)=>`<div class="phr" style="cursor:pointer" onclick="showBig(${ix})"><div class="ja">${p[0]}</div><span class="small"><em>${p[1]}</em> — ${p[2]}</span></div>`).join('')}</div>`}

function renderRound2(){renderRemindersX();renderSakura();renderSouv();fetchWeather()}

function renderExtras(){initNav();renderHome();renderPlan();renderCountdown();renderMeBtn();renderToday();renderItinerary();renderTravel();renderSOS();renderHotels();wireTZ();renderTasks();renderRound2()}

// ===================== Round 3: simpler layout — intro, home, bottom tabs, plan hub =====================
const HERO={file:'Itsukushima-jinja_torii_at_sunset%2C_Miyajima%2C_Japan%2C_20240816_1829_4161.jpg',
 base:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/',credit:'Photo: Jakub Hałun · CC BY 4.0',
 page:'https://commons.wikimedia.org/wiki/File:Itsukushima-jinja_torii_at_sunset,_Miyajima,_Japan,_20240816_1829_4161.jpg'};
function heroURL(){const w=(window.innerWidth||400)*(window.devicePixelRatio||1)>1300?1920:1280;return `${HERO.base}${HERO.file}/${w}px-${HERO.file}`}
const PAGES={home:{t:'Japan Trip',tab:'home'},today:{t:'Day by day',tab:'today'},ideas:{t:'Places',tab:'ideas'},map:{sec:'placesMap',t:'Places',tab:'ideas'},
 plan:{t:'Plan',tab:'plan'},travel:{t:'Flights & trains',tab:'plan',back:'plan'},hotels:{t:'Hotels',tab:'plan',back:'plan'},bookings:{t:'Booking deadlines',tab:'plan',back:'plan'},
 checklists:{t:'Checklists',tab:'plan',back:'plan'},sakura:{t:'Cherry blossoms',tab:'plan',back:'plan'},budget:{t:'Budget & souvenirs',tab:'plan',back:'plan'},journal:{t:'Trip journal',tab:'plan',back:'plan'},
 sos:{t:'Help & phrases',tab:'sos'}};
const ALIAS={prep:'checklists',itinerary:'today',travelers:'checklists'};
let curPage='home';
function go(id,noHash){id=ALIAS[id]||id;const pg=PAGES[id]||PAGES.home;if(!PAGES[id])id='home';curPage=id;
 document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id===(pg.sec||id)));
 $('pageTitle').textContent=pg.t;$('backBtn').style.display=pg.back?'':'none';
 document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.go===pg.tab));
 document.body.classList.toggle('home',id==='home');window.scrollTo(0,0);
 if(id==='map')setTimeout(()=>{if(typeof initMap==='function')initMap();if(typeof mapObj!=='undefined'&&mapObj)mapObj.invalidateSize()},120);
 if(id==='today')setDayView(dayView);
 if(!noHash&&location.hash.slice(1)!==id){try{history.pushState(null,'','#'+id)}catch(e){location.hash=id}}}
window.go=go;
window.addEventListener('popstate',()=>go(location.hash.slice(1)||'home',true));
let dayView='one';
function setDayView(v){dayView=v;document.querySelectorAll('#today .seg button').forEach(b=>b.classList.toggle('on',b.dataset.dv===v));$('todayBox').style.display=v==='one'?'':'none';$('days').style.display=v==='all'?'':'none'}

// ---- intro ----
window.showIntro=()=>{const el=$('intro');el.style.backgroundImage=`url("${heroURL()}")`;const c=$('introCredit');c.textContent=HERO.credit;c.href=HERO.page;
 $('introNames').innerHTML=travelers.map(n=>`<button type="button" class="${n===me?'sel':''}" data-n="${esc(n)}" style="${n===me?'background:#fff;color:#13294b':''}">${esc(n)}</button>`).join('');
 $('introNames').querySelectorAll('button').forEach(b=>b.onclick=()=>{setMe(b.dataset.n);showIntro()});
 $('introForm').style.display=me&&travelers.includes(me)?'none':'flex';
 el.classList.add('on')};
function hideIntro(){$('intro').classList.remove('on');try{localStorage.setItem('jtp-intro','1')}catch(e){}}

// ---- home ----
function nextDeadlines(){const t=todayISO();return reminders.map((r,ix)=>({r,ix})).filter(x=>!doneR[x.ix]&&x.r[0]>=t).sort((a,b)=>(a.r[3]||a.r[0]).localeCompare(b.r[3]||b.r[0]))}
function renderHome(){const hero=$('hero');if(!hero)return;hero.style.backgroundImage=`url("${heroURL()}")`;$('heroCredit').textContent=HERO.credit;$('heroCredit').href=HERO.page;
 const t=todayISO(),nd=nextDeadlines();let html='';
 if(t>=TRIP_START&&t<=TRIP_END){const its=ideas.filter(i=>i.trip_date===t),h=hotelFor(t);
  html+=`<div class="panel" onclick="go('today')" style="cursor:pointer"><h3>📍 Today · Day ${dayNum(t)}</h3><p style="margin:2px 0">${wxLine(t)}</p><p class="small" style="margin:6px 0 0">${its.length?its.slice(0,3).map(i=>esc(i.title)).join(' · '):'Nothing planned — explore!'}${h?'<br>🏨 '+esc(h.name||h.stop):''}</p><p style="margin:8px 0 0;color:var(--blue);font-weight:600">Open today's plan ›</p></div>`}
 if(nd.length){const {r}=nd[0],d=new Date(r[0]+'T12:00:00');
  html+=`<div class="panel"><div class="small" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Next up</div><div class="next"><div class="when">${d.toLocaleDateString('en-US',{month:'short'})}<br><span style="font-size:22px">${d.getDate()}</span></div><div><b>${esc(r[1])}</b><div class="small">${r[3]?'Opens '+jstToLocal(r[3])+' your time':esc(r[2]).slice(0,110)}</div></div></div>${nd.length>1?`<p style="margin:10px 0 0"><a href="#" onclick="go('bookings');return false">See all ${nd.length} deadlines ›</a></p>`:''}</div>`}
 $('homeNow').innerHTML=html;
 const filledH=hotels.filter(h=>h.name).length,doneT=tasks.filter(x=>x.done).length,fl=flights.find(f=>f.number);
 const tiles=[['📅','Day by day','10 days · 5 stops','today'],['📍','Places & map',`${ideas.length} saved · ${ideas.filter(i=>i.priority==='must-do').length} must-dos`,'ideas'],
  ['✈️','Flights & trains',fl?`${esc(fl.airline)} ${esc(fl.number)}`:'Add flight details','travel'],['🏨','Hotels',`${filledH} of ${hotels.length} filled in`,'hotels'],
  ['⏰','Deadlines',nd.length?`${nd.length} coming up`:'All caught up','bookings'],['✅','Checklists',`${doneT} of ${tasks.length} done`,'checklists'],
  ['💴','Budget','Spending & souvenirs','budget'],['🌸','Blossoms',Object.keys(sakura).length?'Forecast added':'Forecasts mid-Dec','sakura'],
  ['📔','Journal',journal.length?`${journal.length} entries`:'Photos & notes','journal'],['🆘','Help','Emergency & phrases','sos']];
 $('tiles').innerHTML=tiles.map(([ic,t1,sub,id])=>`<button class="tile" onclick="go('${id}')"><span class="ic">${ic}</span><span><b>${t1}</b><small>${sub}</small></span></button>`).join('')}
function renderPlan(){const box=$('planList');if(!box)return;const nd=nextDeadlines(),fl=flights.find(f=>f.number);
 const rows=[['✈️','Flights & trains',fl?`${esc(fl.airline)} ${esc(fl.number)} · JR Pass check · luggage`:'Flights, train legs, JR Pass check, luggage','travel'],['🏨','Hotels',`${hotels.filter(h=>h.name).length} of ${hotels.length} filled in · show-to-driver cards`,'hotels'],
  ['⏰','Booking deadlines',nd.length?`${nd.length} coming up · add to calendar`:'All caught up','bookings'],['✅','Checklists',`${tasks.filter(x=>x.done).length} of ${tasks.length} done · packing list`,'checklists'],
  ['💴','Budget & souvenirs','Estimates, spending, souvenir list','budget'],['🌸','Cherry blossoms','Bloom forecast for each city','sakura'],['📔','Trip journal','Photos and notes from each day','journal']];
 box.innerHTML=`<div class="list">${rows.map(([ic,t1,sub,id])=>`<button onclick="go('${id}')"><span class="ic">${ic}</span><span class="txt">${t1}<small>${sub}</small></span><span class="chev">›</span></button>`).join('')}</div>`}

let navReady=false;
function initNav(){if(navReady)return;navReady=true;
 document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>go(b.dataset.go));
 $('backBtn').onclick=()=>go(PAGES[curPage].back||'home');
 document.querySelectorAll('#today .seg button').forEach(b=>b.onclick=()=>setDayView(b.dataset.dv));
 $('introGo').onclick=hideIntro;$('introForm').onsubmit=e=>{e.preventDefault();const n=new FormData(e.target).get('n').trim();if(n){setMe(n);showIntro()}};
 go(location.hash.slice(1)||'home',true);
 let seen='';try{seen=localStorage.getItem('jtp-intro')}catch(e){}if(!seen)showIntro();}
