/* Home Dashboard — app.js ultra-léger, compatible Android 8.1 */
(function(){
"use strict";
var TZ = "Europe/Brussels";

/* ---------- utils ---------- */
function $(id){ return document.getElementById(id); }
function pad(n){ return (n<10?"0":"")+n; }
function fmtTime(d){
  try { return new Intl.DateTimeFormat("fr-BE",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:TZ}).format(d); }
  catch(e){ return pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds()); }
}
function fmtDateLong(d){
  try { return new Intl.DateTimeFormat("fr-BE",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:TZ}).format(d); }
  catch(e){ return d.toLocaleDateString("fr-BE"); }
}
function fmtDayShort(iso){
  try {
    var d = new Date(iso+"T00:00:00");
    return new Intl.DateTimeFormat("fr-BE",{weekday:"short",day:"numeric",month:"numeric"}).format(d);
  } catch(e){ return iso; }
}
function fmtMatchDate(dateUtc){
  var d = new Date(String(dateUtc).replace(" ","T"));
  try {
    return new Intl.DateTimeFormat("fr-BE",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit",timeZone:TZ}).format(d);
  } catch(e){ return String(dateUtc).slice(0,16); }
}
function timeAgo(pub){
  var t = new Date(pub).getTime();
  if(isNaN(t)) return "";
  var s = Math.floor((Date.now()-t)/1000);
  if(s<60) return "à l'instant";
  if(s<3600) return "il y a "+Math.floor(s/60)+" min";
  if(s<86400) return "il y a "+Math.floor(s/3600)+" h";
  return "il y a "+Math.floor(s/86400)+" j";
}
function setUpdated(id){
  try {
    $(id).textContent = new Intl.DateTimeFormat("fr-BE",{hour:"2-digit",minute:"2-digit",timeZone:TZ}).format(new Date());
  } catch(e){ $(id).textContent = "—"; }
}
function setOffline(){
  var off = !navigator.onLine;
  $("offline-badge").classList.toggle("hidden", !off);
}
window.addEventListener("online", setOffline);
window.addEventListener("offline", setOffline);
setOffline();

/* ---------- horloge + salutation ---------- */
function tickClock(){
  var now = new Date();
  $("clock").textContent = fmtTime(now);
  $("date-line").textContent = fmtDateLong(now);
  var h = parseInt(new Intl.DateTimeFormat("fr-BE",{hour:"numeric",hour12:false,timeZone:TZ}).format(now),10);
  var g = "Bonne nuit";
  if(h>=6 && h<12) g = "Bonjour ☕";
  else if(h>=12 && h<18) g = "Bon après-midi ☀️";
  else if(h>=18 && h<22) g = "Bonsoir 🌙";
  $("greeting").textContent = g + " · Court-Saint-Etienne";
}
tickClock();
setInterval(tickClock, 1000);

/* ---------- thème auto dark/light ---------- */
var themeMode = localStorage.getItem("dash-theme-mode") || "auto"; // auto|dark|light
function applyTheme(){
  var html = document.documentElement;
  var effective = themeMode;
  if(themeMode==="auto"){
    try{
      var h = parseInt(new Intl.DateTimeFormat("fr-BE",{hour:"numeric",hour12:false,timeZone:TZ}).format(new Date()),10);
      effective = (h>=20 || h<7) ? "dark" : "light";
    }catch(e){ effective = "dark"; }
  }
  html.setAttribute("data-theme", effective);
  $("theme-btn").textContent = effective==="dark" ? "☾" : "☀";
  $("theme-btn").title = "Thème : "+themeMode+" (cliquer pour changer)";
}
$("theme-btn").addEventListener("click", function(){
  themeMode = themeMode==="auto" ? "dark" : themeMode==="dark" ? "light" : "auto";
  localStorage.setItem("dash-theme-mode", themeMode);
  applyTheme();
});
applyTheme();
setInterval(function(){ if(themeMode==="auto") applyTheme(); }, 60000);

/* ---------- météo Open-Meteo ---------- */
var WMO = {
  0:["Ensoleillé","☀️"],1:["Éclaircies","🌤️"],2:["Partiellement nuageux","⛅"],3:["Couvert","☁️"],
  45:["Brouillard","🌫️"],48:["Brouillard givrant","🌫️"],
  51:["Bruine légère","🌦️"],53:["Bruine","🌦️"],55:["Bruine forte","🌧️"],
  61:["Pluie faible","🌧️"],63:["Pluie","🌧️"],65:["Pluie forte","⛈️"],
  71:["Neige légère","🌨️"],73:["Neige","🌨️"],75:["Neige forte","❄️"],
  80:["Averses","🌧️"],81:["Averses","🌧️"],82:["Fortes averses","⛈️"],
  95:["Orage","⛈️"],96:["Orage grêle","⛈️"],99:["Orage grêle","⛈️"]
};
function wmo(code){
  return WMO[code] || ["—","🌡️"];
}
function loadWeather(){
  var url = "https://api.open-meteo.com/v1/forecast?latitude=50.64&longitude=4.57&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FBrussels&forecast_days=7";
  fetch(url).then(function(r){ return r.json(); }).then(function(j){
    localStorage.setItem("wx-cache", JSON.stringify({t:Date.now(), j:j}));
    renderWeather(j);
  }).catch(function(){
    try{
      var c = JSON.parse(localStorage.getItem("wx-cache")||"null");
      if(c) renderWeather(c.j);
      else $("weather-now").innerHTML = '<div class="w-desc">Météo indisponible (hors ligne)</div>';
    }catch(e){}
  });
}
function renderWeather(j){
  try{
    var cur = j.current, code = cur.weather_code, info = wmo(code);
    $("weather-now").innerHTML = '<div class="w-temp">'+Math.round(cur.temperature_2m)+'°C</div><div class="w-desc">'+info[1]+' '+info[0]+'</div>';
    $("weather-meta").textContent = "Vent "+Math.round(cur.wind_speed_10m)+" km/h · Humidité "+cur.relative_humidity_2m+"%";
    $("header-weather").textContent = "Court-Saint-Etienne · "+Math.round(cur.temperature_2m)+"°C "+info[1];
    // hourly : prochaines 8 tranches de 3h
    var html = "", nowH = new Date().getHours(), count = 0;
    var times = j.hourly.time, temps = j.hourly.temperature_2m, probs = j.hourly.precipitation_probability || [];
    // trouve index heure actuelle
    var startIdx = 0;
    var nowStr = "";
    try{ nowStr = new Intl.DateTimeFormat("fr-BE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hour12:false}).format(new Date()); }catch(e){}
    for(var i=0;i<times.length && count<4;i++){
      // times format "2026-10-13T14:00" local Brussels déjà
      var hh = parseInt(times[i].slice(11,13),10);
      if(i<2 && count===0){ /* prend quand même les prochaines */ }
      if(count<4 && i%3===0){
        html += '<div class="hour"><b>'+hh+'h</b>'+Math.round(temps[i])+'°<br><span style="color:var(--muted)">'+(probs[i]||0)+'%</span></div>';
        count++;
      }
    }
    if(!html){
      for(var k=0;k<4;k++){ html += '<div class="hour"><b>'+((nowH+k*3)%24)+'h</b>'+Math.round(temps[k*3]||0)+'°</div>'; }
    }
    $("weather-hourly").innerHTML = html;
    // daily 7j
    var dh = "";
    for(var d=0; d<j.daily.time.length; d++){
      var di = wmo(j.daily.weather_code[d]);
      dh += '<div class="day"><span>'+(d===0?"Auj.":fmtDayShort(j.daily.time[d]))+' '+di[1]+'</span><span>'+Math.round(j.daily.temperature_2m_min[d])+'° / <b>'+Math.round(j.daily.temperature_2m_max[d])+'°</b></span></div>';
    }
    $("weather-daily").innerHTML = dh;
    setUpdated("weather-updated");
  }catch(e){ /* ignore */ }
}
loadWeather();
setInterval(loadWeather, 30*60*1000);

/* ---------- news ---------- */
var FEEDS = {
  be: [
    {name:"RTBF", url:"https://rss.rtbf.be/article/rss/highlight_rtbf_info.xml"},
    {name:"Belgique", url:"https://news.google.com/rss?cf=all&hl=fr&gl=BE&ceid=BE:fr"}
  ],
  world: [
    {name:"BBC Monde", url:"https://feeds.bbci.co.uk/news/world/rss.xml"},
    {name:"Le Monde", url:"https://www.lemonde.fr/rss/une.xml"}
  ]
};
var newsCache = {be:[], world:[]};
var activeTab = "be";
try{
  var nc = JSON.parse(localStorage.getItem("news-cache")||"null");
  if(nc) newsCache = nc;
}catch(e){}

function fetchFeed(feed){
  // NOTE: ne pas ajouter &count= : rss2json exige désormais une clé API pour ce paramètre (erreur 422)
  var api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
  return fetch(api).then(function(r){
    if(!r.ok) throw new Error("rss http "+r.status);
    return r.json();
  }).then(function(j){
    if(j.status!=="ok" || !j.items) throw new Error("rss");
    return j.items.slice(0,8).map(function(it){
      return {title:it.title, link:it.link, pub:it.pubDate, img:it.thumbnail||(it.enclosure&&it.enclosure.link)||"", src:feed.name};
    });
  });
}
function loadNews(){
  ["be","world"].forEach(function(tab){
    var promises = FEEDS[tab].map(fetchFeed);
    Promise.all(promises.map(function(p){ return p.catch(function(){ return []; }); })).then(function(results){
      var merged = [];
      results.forEach(function(arr){ merged = merged.concat(arr); });
      merged.sort(function(a,b){ return new Date(b.pub)-new Date(a.pub); });
      merged = merged.slice(0,10);
      if(merged.length){
        newsCache[tab]=merged;
        localStorage.setItem("news-cache", JSON.stringify(newsCache));
        if(tab===activeTab) renderNews();
        setUpdated("news-updated");
      } else if(newsCache[tab].length && tab===activeTab){
        renderNews();
      }
    });
  });
}
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function renderNews(){
  var list = newsCache[activeTab] || [];
  if(!list.length){
    $("news-list").innerHTML = '<div class="loading">Chargement…<br><span style="font-size:11px">Si ça persiste : quota rss2json atteint, réessai auto dans 15 min.</span></div>';
    return;
  }
  var html = "";
  list.slice(0,7).forEach(function(n){
    var img = n.img ? '<img src="'+esc(n.img)+'" loading="lazy" alt="" onerror="this.style.display=\'none\'">' : "";
    html += '<a class="news-item" href="'+esc(n.link)+'" target="_blank" rel="noopener">'+img+
      '<div class="ni-body"><h3>'+esc(n.title)+'</h3><div class="meta">'+esc(n.src)+' · '+esc(timeAgo(n.pub))+'</div></div></a>';
  });
  $("news-list").innerHTML = html;
}
var tabs = document.querySelectorAll(".tab");
for(var ti=0; ti<tabs.length; ti++){
  tabs[ti].addEventListener("click", function(){
    for(var k=0;k<tabs.length;k++) tabs[k].classList.remove("active");
    this.classList.add("active");
    activeTab = this.getAttribute("data-tab");
    renderNews();
  });
}
renderNews();
loadNews();
setInterval(loadNews, 15*60*1000);
// rotation douce : remonte en haut toutes les 60s
setInterval(function(){
  var el = $("news-list");
  if(el) el.scrollTop = 0;
}, 60000);

/* ---------- Arsenal : toutes compétitions (CORS-friendly) ----------
   fixturedownload.com ne renvoie pas Access-Control-Allow-Origin -> fetch
   bloqué dans le navigateur. On utilise à la place :
   - TheSportsDB (gratuit, CORS *) : prochains + derniers toutes compétitions
   - OpenFootball via GitHub raw (CORS *) : saison complète Premier League */
var ARS_TSB_NEXT = "https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=133604";
var ARS_TSB_LAST = "https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=133604";
var ARS_PL_URL = "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json";
var nextMatchDate = null;

function shortTeam(n){
  n = String(n||"").replace(/\s+FC$/,"");
  if(n==="Nottingham Forest") return "Nott'm Forest";
  return n;
}
function frComp(c){
  if(c==="English Premier League") return "Premier League";
  if(c==="UEFA Champions League") return "Ligue des Champions";
  if(c==="English FA Cup") return "FA Cup";
  if(c==="English League Cup") return "Carabao Cup";
  return c || "";
}
function tsbToMatch(e){
  var dt = null;
  try{
    var raw = e.strTimestamp ? String(e.strTimestamp).replace(" ","T") : (e.dateEvent+"T"+(e.strTime||"15:00:00"));
    dt = new Date(raw);
  }catch(err){ dt = null; }
  var hs = (e.intHomeScore!==null && e.intHomeScore!==undefined && String(e.intHomeScore)!=="") ? parseInt(e.intHomeScore,10) : null;
  var as = (e.intAwayScore!==null && e.intAwayScore!==undefined && String(e.intAwayScore)!=="") ? parseInt(e.intAwayScore,10) : null;
  if(hs!==null && isNaN(hs)) hs = null;
  if(as!==null && isNaN(as)) as = null;
  return {home:shortTeam(e.strHomeTeam), away:shortTeam(e.strAwayTeam), comp:frComp(e.strLeague),
    date:dt, venue:e.strVenue||"", hs:hs, as:as};
}
function plToMatch(m){
  var dt = null;
  try{ dt = new Date(m.date+"T"+(m.time||"15:00:00")); }catch(err){}
  var hs = null, as = null;
  if(m.score && m.score.ft && m.score.ft.length===2){ hs = m.score.ft[0]; as = m.score.ft[1]; }
  return {home:shortTeam(m.team1), away:shortTeam(m.team2), comp:"Premier League",
    date:dt, venue:"", hs:hs, as:as};
}
function fetchArsenal(){
  var pNext = fetch(ARS_TSB_NEXT).then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){ return (j.events||[]).map(tsbToMatch); }).catch(function(){ return []; });
  var pLast = fetch(ARS_TSB_LAST).then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){ return (j.results||j.events||[]).map(tsbToMatch); }).catch(function(){ return []; });
  var pPL = fetch(ARS_PL_URL).then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(j){
      return (j.matches||[]).filter(function(m){ return m.team1==="Arsenal FC"||m.team2==="Arsenal FC"; }).map(plToMatch);
    }).catch(function(){ return []; });
  Promise.all([pNext, pLast, pPL]).then(function(parts){
    var seen = {}, all = [];
    parts.forEach(function(arr){
      arr.forEach(function(m){
        if(!m.date || isNaN(m.date.getTime())) return;
        // clé jour+équipes : les sources (TheSportsDB / OpenFootball) peuvent
        // différer d'1h sur l'horaire, on évite les doublons d'un même match
        var day = m.date.getFullYear()+"-"+(m.date.getMonth()+1)+"-"+m.date.getDate();
        var k = day+"|"+m.home+"|"+m.away;
        if(seen[k]) return;
        seen[k] = true;
        all.push(m);
      });
    });
    all.sort(function(a,b){ return a.date - b.date; });
    if(all.length){
      renderArsenal(all);
      try {
        localStorage.setItem("ars-cache-v2", JSON.stringify({t:Date.now(),
          all:all.map(function(m){ return {home:m.home, away:m.away, comp:m.comp, date:m.date.toISOString(), venue:m.venue, hs:m.hs, as:m.as}; })}));
      } catch(e){}
    } else {
      try{
        var c = JSON.parse(localStorage.getItem("ars-cache-v2")||"null");
        if(c && c.all){
          c.all.forEach(function(m){ m.date = new Date(m.date); });
          renderArsenal(c.all);
        } else {
          $("arsenal-next").innerHTML = '<div class="loading">Calendrier indisponible<br><span style="font-size:11px">Vérifie la connexion, réessai auto dans 6h.</span></div>';
        }
      }catch(e){}
    }
  });
}
function fmtMatchDateObj(d){
  try {
    return new Intl.DateTimeFormat("fr-BE",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit",timeZone:TZ}).format(d);
  } catch(e){ return d.toLocaleString("fr-BE"); }
}
function shortScore(m){
  if(m.hs==null || m.as==null) return "vs";
  return m.hs+" - "+m.as;
}
function resultClass(m){
  if(m.hs==null) return "";
  var arsenalHome = (m.home==="Arsenal");
  var gf = arsenalHome ? m.hs : m.as, ga = arsenalHome ? m.as : m.hs;
  if(gf>ga) return "win";
  if(gf<ga) return "loss";
  return "draw";
}
function renderArsenal(all){
  var now = Date.now();
  // garde-fou : accepte aussi les dates en texte (vieux cache)
  all.forEach(function(m){ if(!(m.date instanceof Date)) m.date = new Date(m.date); });
  all = all.filter(function(m){ return m.date && !isNaN(m.date.getTime()); });
  var upcoming = all.filter(function(m){ return m.date.getTime() >= now-2*3600*1000; });
  var past = all.filter(function(m){ return m.date.getTime() < now-2*3600*1000; }).reverse();
  // prochain
  if(upcoming.length){
    var nx = upcoming[0];
    nextMatchDate = nx.date.getTime();
    var homeAway = nx.home + " vs " + nx.away;
    $("arsenal-next").innerHTML =
      '<div class="comp">'+esc(nx.comp)+'</div>'+
      '<div class="teams">'+esc(homeAway)+'</div>'+
      '<div class="count" id="countdown">…</div>'+
      '<div class="stade">'+esc(fmtMatchDateObj(nx.date))+(nx.venue ? ' · '+esc(nx.venue) : '')+'</div>';
    tickCountdown();
  } else {
    $("arsenal-next").innerHTML = '<div class="teams">Saison terminée</div>';
  }
  // 5 suivants
  var uh = "";
  upcoming.slice(0,5).forEach(function(m){
    uh += '<div class="match"><span>'+esc(m.home)+' - '+esc(m.away)+'<br><span style="color:var(--muted);font-size:11px">'+esc(m.comp)+'</span></span><span class="m-date">'+esc(fmtMatchDateObj(m.date))+'</span></div>';
  });
  $("arsenal-upcoming").innerHTML = uh || '<div class="loading">Aucun match à venir</div>';
  // 3 derniers
  var ph = "";
  past.slice(0,3).forEach(function(m){
    ph += '<div class="match"><span>'+esc(m.home)+' - '+esc(m.away)+'<br><span style="color:var(--muted);font-size:11px">'+esc(m.comp)+'</span></span><span class="score '+resultClass(m)+'">'+esc(shortScore(m))+'</span></div>';
  });
  $("arsenal-results").innerHTML = ph || '<div class="loading">—</div>';
  setUpdated("arsenal-updated");
}
function tickCountdown(){
  if(!nextMatchDate) return;
  var el = $("countdown");
  if(!el) return;
  var diff = nextMatchDate - Date.now();
  if(diff<=0){ el.textContent = "Coup d'envoi imminent !"; return; }
  var d = Math.floor(diff/86400000), h = Math.floor(diff%86400000/3600000),
      m = Math.floor(diff%3600000/60000), s = Math.floor(diff%60000/1000);
  el.textContent = d>0 ? ("J-"+d+" · "+pad(h)+":"+pad(m)+":"+pad(s)) : (pad(h)+":"+pad(m)+":"+pad(s));
}
setInterval(tickCountdown, 1000);
fetchArsenal();
setInterval(fetchArsenal, 6*60*60*1000);

})();
