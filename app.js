'use strict';
const KEY='veckoapp-web-v1',names=['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];
const $=id=>document.getElementById(id);
const defaults=()=>({start:-1,end:-1,mode:0,manual:420,lead:60,musicId:''});
let data;try{data=JSON.parse(localStorage.getItem(KEY))||{}}catch{data={}}
let parity=isoWeek(new Date())%2,day=(new Date().getDay()+6)%7,clipboard=null;
let pasteSelection=new Set();
let musicDb=null,musicTracks=[],playingUrl=null;
function isoWeek(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil((((x-y)/86400000)+1)/7)}
function slot(p,d){return String(p)+'_'+String(d)}
function get(p,d){return {...defaults(),...(data[slot(p,d)]||{})}}
function persist(){localStorage.setItem(KEY,JSON.stringify(data))}
function clock(m){return m<0?'':String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function minutes(v){if(!/^\d\d:\d\d$/.test(v))return -1;const [h,m]=v.split(':').map(Number);return h<24&&m<60?h*60+m:-1}
function render(){const now=new Date(),w=isoWeek(now);$('today').textContent=new Intl.DateTimeFormat('sv-SE',{weekday:'long',day:'numeric',month:'long'}).format(now);$('week').textContent=w;$('parityLabel').textContent=w%2?'Udda vecka':'Jämn vecka';const today=get(w%2,(now.getDay()+6)%7);$('todayShift').textContent=today.start<0?'Idag: Ledig':'Idag: '+clock(today.start)+' – '+clock(today.end);document.querySelectorAll('[data-parity]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.parity)===parity)});$('days').replaceChildren();for(let i=0;i<7;i++){const v=get(parity,i),b=document.createElement('button');b.className='day'+(i===day?' selected':'');b.innerHTML='<span><span class="name">'+names[i]+'</span><small>'+(['Inget alarm','Manuellt alarm','Automatiskt alarm','Dubbla alarm'][v.mode]||'Inget alarm')+'</small></span><span class="time">'+(v.start<0?'Ledig':clock(v.start)+' – '+clock(v.end))+'</span>';b.onclick=()=>{day=i;render()};$('days').append(b)}const v=get(parity,day);$('editTitle').textContent=names[day];$('off').checked=v.start<0;$('start').value=clock(v.start);$('end').value=clock(v.end);$('mode').value=String(v.mode);$('manual').value=clock(v.manual);$('lead').value=v.lead;$('musicChoice').value=v.musicId||'';$('start').disabled=$('end').disabled=v.start<0;$('paste').disabled=!clipboard;renderPasteTargets();if(musicDb)refreshMusic().catch(()=>{})}
function save(){const v=get(parity,day);if($('off').checked){v.start=-1;v.end=-1}else{v.start=minutes($('start').value);v.end=minutes($('end').value);if(v.start<0)v.start=540;if(v.end<0)v.end=1020}v.mode=Number($('mode').value);v.manual=minutes($('manual').value);if(v.manual<0)v.manual=420;v.lead=Math.max(0,Math.min(720,Number($('lead').value)||0));v.musicId=$('musicChoice').value;data[slot(parity,day)]=v;persist();render()}
$('off').onchange=()=>{if(!$('off').checked){$('start').value='09:00';$('end').value='17:00'}save()};
for(const id of ['start','end','mode','manual','lead','musicChoice'])$(id).addEventListener('change',save);
document.querySelectorAll('[data-parity]').forEach(b=>b.onclick=()=>{parity=Number(b.dataset.parity);render()});
$('copy').onclick=()=>{clipboard=structuredClone(get(parity,day));$('paste').disabled=false;$('saved').textContent='Dag kopierad (inklusive alarm)'};
function renderPasteTargets(){const el=$('pasteTargets');if(!el)return;el.replaceChildren();for(const p of [1,0]){const group=document.createElement('div');group.className='paste-group';const heading=document.createElement('strong');heading.textContent=p?'Udda veckor':'Jämna veckor';group.append(heading);for(let d=0;d<7;d++){const key=slot(p,d),label=document.createElement('label'),cb=document.createElement('input');label.className='target';cb.type='checkbox';cb.checked=pasteSelection.has(key);cb.onchange=()=>{if(cb.checked)pasteSelection.add(key);else pasteSelection.delete(key)};label.append(cb,document.createTextNode(names[d]));group.append(label)}el.append(group)}}
$('paste').onclick=()=>{if(!clipboard)return;const panel=$('pastePanel');panel.hidden=!panel.hidden;if(!panel.hidden)renderPasteTargets()};
$('selectAll').onclick=()=>{if(pasteSelection.size===14)pasteSelection.clear();else for(let p=0;p<2;p++)for(let d=0;d<7;d++)pasteSelection.add(slot(p,d));renderPasteTargets()};
$('applyPaste').onclick=()=>{if(!clipboard||!pasteSelection.size){alert('Markera minst en dag.');return}const count=pasteSelection.size;if(!confirm('Ersätta schemat för '+count+' markerade dagar, inklusive alarm?'))return;for(const key of pasteSelection)data[key]=structuredClone(clipboard);persist();pasteSelection.clear();$('pastePanel').hidden=true;render();$('saved').textContent='Klistrade in på '+count+' dagar'};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'veckoapp-web-v1',days:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='veckoapp-schema.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(o.format!=='veckoapp-web-v1'||!o.days||typeof o.days!=='object'||Array.isArray(o.days))throw Error('Fel filformat');const clean={};for(let p=0;p<2;p++)for(let d=0;d<7;d++){const x=o.days[slot(p,d)];if(!x)continue;const v={};for(const field of ['start','end','mode','manual','lead']){if(!Number.isInteger(x[field]))throw Error('Ogiltigt schema');v[field]=x[field]}if(v.start < -1||v.start>1439||v.end < -1||v.end>1439||v.mode<0||v.mode>3||v.manual<0||v.manual>1439||v.lead<0||v.lead>720)throw Error('Ogiltiga tider');v.musicId=typeof x.musicId==='string'&&x.musicId.length<100?x.musicId:'';clean[slot(p,d)]=v}if(!confirm('Ersätta nuvarande schema med det importerade?'))return;data=clean;persist();render()}catch(err){alert('Kunde inte importera: '+err.message)}finally{e.target.value=''}};
render();initMusic().catch(e=>{$('musicStatus').textContent='Musikbiblioteket kunde inte öppnas: '+e.message});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});


// Music files are kept in this browser's IndexedDB, never uploaded to the website.
const MUSIC_DB='veckoapp-music-v1',MUSIC_STORE='tracks';
function musicRequest(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function initMusic(){
  musicDb=await new Promise((resolve,reject)=>{const req=indexedDB.open(MUSIC_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(MUSIC_STORE))req.result.createObjectStore(MUSIC_STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  await refreshMusic();
}
async function refreshMusic(){
  musicTracks=await musicRequest(musicDb.transaction(MUSIC_STORE,'readonly').objectStore(MUSIC_STORE).getAll());
  musicTracks.sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  const choice=$('musicChoice'),current=get(parity,day).musicId||'';
  choice.replaceChildren(new Option('Standard (ingen egen låt)',''));
  for(const track of musicTracks)choice.add(new Option(track.name,track.id));
  choice.value=musicTracks.some(t=>t.id===current)?current:'';
  const list=$('musicList');list.replaceChildren();
  if(!musicTracks.length){const empty=document.createElement('p');empty.className='notice';empty.textContent='Inga låtar tillagda ännu.';list.append(empty)}
  for(const track of musicTracks){
    const row=document.createElement('div');row.className='music-row';
    const name=document.createElement('span');name.textContent=track.name;name.title=track.name;
    const play=document.createElement('button');play.type='button';play.textContent='Spela';play.onclick=()=>previewMusic(track);
    const remove=document.createElement('button');remove.type='button';remove.className='subtle';remove.textContent='Ta bort';remove.onclick=()=>deleteMusic(track);
    row.append(name,play,remove);list.append(row);
  }
}
async function previewMusic(track){
  const player=$('musicPlayer');player.pause();
  if(playingUrl)URL.revokeObjectURL(playingUrl);
  playingUrl=URL.createObjectURL(track.file);player.src=playingUrl;
  try{await player.play();$('musicStatus').textContent='Spelar: '+track.name}catch{$('musicStatus').textContent='Tryck på spela i ljudspelaren för att lyssna.'}
}
async function deleteMusic(track){
  if(!confirm('Ta bort '+track.name+' från den här enheten?'))return;
  await musicRequest(musicDb.transaction(MUSIC_STORE,'readwrite').objectStore(MUSIC_STORE).delete(track.id));
  for(const value of Object.values(data))if(value.musicId===track.id)value.musicId='';
  if(clipboard&&clipboard.musicId===track.id)clipboard.musicId='';
  persist();await refreshMusic();render();
  $('musicStatus').textContent='Låten har tagits bort.';
}
$('musicUpload').onchange=async e=>{
  const files=Array.from(e.target.files);let added=0,skipped=0;
  try{
    for(const file of files){
      if(!(/\.mp3$/i.test(file.name)||file.type==='audio/mpeg')||file.size===0||file.size>40*1024*1024){skipped++;continue}
      const track={id:crypto.randomUUID(),name:file.name.slice(0,180),file};
      await musicRequest(musicDb.transaction(MUSIC_STORE,'readwrite').objectStore(MUSIC_STORE).put(track));added++;
    }
    await refreshMusic();render();
    $('musicStatus').textContent=added+' låt(ar) sparade lokalt.'+(skipped?' '+skipped+' fil(er) hoppades över (endast MP3, max 40 MB per fil).':'');
  }catch(err){$('musicStatus').textContent='Kunde inte spara filerna. Kontrollera ledigt lagringsutrymme: '+err.message}
  finally{e.target.value=''}
};


// A home-screen shortcut and an optional compact, widget-like view.
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event});
function installInstructions(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  $('installText').textContent=standalone?'Veckoapp är redan öppnad från hemskärmen.':ios?'Öppna sidan i Safari, tryck på Dela (fyrkanten med pil uppåt) och välj Lägg till på hemskärmen. Välj sedan Lägg till. Det skapar en appikon, inte en riktig iOS-widget.':deferredInstallPrompt?'Tryck på Installera appen för att lägga Veckoapp på hemskärmen.':'Öppna webbläsarens meny och välj Lägg till på startskärmen eller Installera app. Det skapar en genväg, inte en riktig widget.';
  $('nativeInstall').hidden=!deferredInstallPrompt||standalone;
}
$('installHelp').onclick=()=>{$('installPanel').hidden=false;installInstructions()};
$('closeInstall').onclick=()=>{$('installPanel').hidden=true};
$('nativeInstall').onclick=async()=>{if(!deferredInstallPrompt)return;const prompt=deferredInstallPrompt;deferredInstallPrompt=null;await prompt.prompt();installInstructions()};
let compact=false;try{compact=localStorage.getItem('veckoapp-compact')==='1'}catch{}
function applyCompact(){document.body.classList.toggle('compact-view',compact);$('compactToggle').textContent=compact?'Visa hela appen':'Visa kompakt läge'}
$('compactToggle').onclick=()=>{compact=!compact;try{localStorage.setItem('veckoapp-compact',compact?'1':'0')}catch{}applyCompact()};
applyCompact();
