// ehall/schedule.js - 课表弹窗
// 数据通过 background service worker 获取（绕过 CORS）
(function () {
  "use strict";

  if (!window.browser) window.browser = window.chrome;

  var CACHE_KEY = "potatoplus_schedule_cache";
  var CACHE_TTL = 7 * 24 * 3600 * 1000;
  var SLOT_H = 52;
  var TIMES = [
    ["08:00","08:50"],["09:00","09:50"],["10:10","11:00"],["11:10","12:00"],
    ["14:00","14:50"],["15:00","15:50"],["16:10","17:00"],["17:10","18:00"],
    ["18:30","19:20"],["19:30","20:20"],["20:30","21:20"]
  ];
  var WNAMES = ["","周一","周二","周三","周四","周五","周六","周日"];
  var COLORS = [
    "#5BA4CF","#7BC67E","#E8854A","#C278D1","#E06C75",
    "#56B6C2","#D19A66","#8E7CC3","#61AFEF","#98C379",
    "#E5C07B","#BE5046","#6796E6","#F78C6C","#A9C77D",
    "#C792EA","#F07178","#82AAFF","#FFCB6B","#89DDFF"
  ];

  // --- utils ---
  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  function weekStr(ws){
    if(!ws||!ws.length)return"";if(ws.length===1)return"第"+ws[0]+"周";
    var b=ws[0]+"-"+ws[ws.length-1]+"周",ok=true;
    for(var i=1;i<ws.length;i++)if(ws[i]-ws[0]!==i){ok=false;break;}
    if(ok)return b;ok=true;
    for(var i=1;i<ws.length;i++)if(ws[i]-ws[0]!==2*i){ok=false;break;}
    if(ok)return b+(ws[0]%2===1?"(单)":"(双)");return ws.join(",")+"周";
  }
  function monday(d){var x=new Date(d),day=x.getDay(),diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);x.setHours(0,0,0,0);return x;}
  function calcWeek(start){return Math.floor((monday(new Date())-monday(new Date(start)))/(7*864e5))+1;}
  function dayDate(wk,dow,start){var d=new Date(monday(new Date(start)));d.setDate(d.getDate()+(wk-1)*7+(dow-1));return d;}
  function ccolor(n){var h=0;for(var i=0;i<n.length;i++){h=((h<<5)-h)+n.charCodeAt(i);h|=0;}return COLORS[Math.abs(h)%COLORS.length];}

  // --- cache ---
  function getCache(){try{var c=JSON.parse(localStorage.getItem(CACHE_KEY));return c&&c.timestamp&&c.courses?c:null;}catch(e){return null;}}
  function setCache(d){var obj={timestamp:Date.now(),courses:d.courses,termName:d.termName};if(d.semesterStartMonday)obj.semesterStartMonday=d.semesterStartMonday;localStorage.setItem(CACHE_KEY,JSON.stringify(obj));}

  // --- fetch via background ---
  function fetchViaBackground(force){
    return new Promise(function(resolve,reject){
      browser.runtime.sendMessage({type:"pp-schedule-fetch",force:!!force},function(resp){
        if(browser.runtime.lastError){reject(new Error(browser.runtime.lastError.message));return;}
        if(!resp){reject(new Error("无响应"));return;}
        if(resp.error){reject(new Error(resp.error));return;}
        resolve(resp);
      });
    });
  }

  async function getData(force){
    var c=getCache();
    if(!force&&c&&Date.now()-c.timestamp<CACHE_TTL)return c;
    if(!force&&c){
      try{var f=await fetchViaBackground(false);setCache(f);return f;}catch(e){console.warn("[PotatoPlus] 刷新失败，用旧缓存:",e);return c;}
    }
    var d=await fetchViaBackground(true);setCache(d);return d;
  }

  // --- state ---
  var data=null,curWeek=1,semStart=null,tipEl=null;

  function rmTip(){if(tipEl){tipEl.remove();tipEl=null;}}

  function showTip(course,ev){
    rmTip();var tip=document.createElement("div");tip.className="pp-sched-tip";
    var ts=WNAMES[course.weekTime]+" 第"+course.startTime+"-"+course.endTime+"节";
    if(course.startTime>0&&course.startTime<=TIMES.length){
      ts+=" ("+TIMES[course.startTime-1][0]+"-"+TIMES[Math.min(course.endTime,TIMES.length)-1][1]+")";
    }
    tip.innerHTML='<div class="pp-tip-n">'+esc(course.name)+'</div>'+
      '<div class="pp-tip-r"><span class="pp-tip-i">📍</span>'+esc(course.classroom||"未知")+'</div>'+
      '<div class="pp-tip-r"><span class="pp-tip-i">👤</span>'+esc(course.teacher||"未知")+'</div>'+
      '<div class="pp-tip-r"><span class="pp-tip-i">🕐</span>'+esc(ts)+'</div>'+
      '<div class="pp-tip-r"><span class="pp-tip-i">📅</span>'+esc(weekStr(course.weeks))+'</div>';
    document.body.appendChild(tip);tipEl=tip;
    moveTip(ev);
  }
  function moveTip(e){
    if(!tipEl)return;var x=e.clientX+12,y=e.clientY+12;
    var tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
    if(x+tw>window.innerWidth-10)x=e.clientX-tw-12;
    if(y+th>window.innerHeight-10)y=e.clientY-th-12;
    tipEl.style.left=x+"px";tipEl.style.top=y+"px";
  }

  // --- render ---
  function openSchedule(){
    injectCSS();
    var ov=document.createElement("div");ov.className="pp-sched-ov";ov.id="pp-sched-ov";
    ov.addEventListener("click",function(e){if(e.target===ov)closeSchedule();});
    var modal=document.createElement("div");modal.className="pp-sched-modal";
    ov.appendChild(modal);document.body.appendChild(ov);
    var escH=function(e){if(e.key==="Escape"){closeSchedule();document.removeEventListener("keydown",escH);}};
    document.addEventListener("keydown",escH);

    modal.innerHTML='<div class="pp-sched-load"><div class="pp-sched-spin"></div><span>正在加载课表...</span></div>';

    getData(false).then(function(d){
      data=d;semStart=d.semesterStartMonday;
      if(semStart)curWeek=Math.max(1,calcWeek(semStart));
      buildModal(modal);
    }).catch(function(e){
      console.error("[PotatoPlus]",e);
      showError(modal,e.message);
    });
  }

  function closeSchedule(){rmTip();var o=document.getElementById("pp-sched-ov");if(o)o.remove();}

  function showError(modal,msg){
    modal.innerHTML='<div class="pp-sched-err"><div style="font-size:28px">😥</div><div class="pp-sched-err-m">'+esc(msg||"加载失败")+'</div><button class="pp-sched-retry">重试</button></div>';
    modal.querySelector(".pp-sched-retry").addEventListener("click",function(){
      modal.innerHTML='<div class="pp-sched-load"><div class="pp-sched-spin"></div><span>重新加载中...</span></div>';
      fetchViaBackground(true).then(function(d){
        setCache(d);data=d;semStart=d.semesterStartMonday;
        if(semStart)curWeek=Math.max(1,calcWeek(semStart));
        buildModal(modal);
      }).catch(function(e){showError(modal,e.message);});
    });
  }

  function buildModal(modal){
    modal.innerHTML="";
    var hd=document.createElement("div");hd.className="pp-sched-hd";
    var hl=document.createElement("div");hl.style.cssText="display:flex;align-items:center";
    hl.innerHTML='<span class="pp-sched-tt">📅 课表</span><span class="pp-sched-st">'+esc(data.termName||"")+'</span>';
    var hr=document.createElement("div");hr.className="pp-sched-acts";

    var ws=document.createElement("div");ws.className="pp-wk-sel";
    var pb=document.createElement("button");pb.className="pp-wk-b";pb.textContent="◀";
    pb.onclick=function(){if(curWeek>1){curWeek--;renderGrid();}};
    var wl=document.createElement("span");wl.className="pp-wk-l";wl.id="pp-wk-l";wl.title="点击回到本周";
    wl.onclick=function(){if(semStart)curWeek=Math.max(1,calcWeek(semStart));renderGrid();};
    var nb=document.createElement("button");nb.className="pp-wk-b";nb.textContent="▶";
    nb.onclick=function(){curWeek++;renderGrid();};
    ws.appendChild(pb);ws.appendChild(wl);ws.appendChild(nb);

    var rb=document.createElement("button");rb.className="pp-sched-ib";rb.id="pp-sched-refresh";rb.textContent="🔄";rb.title="刷新课表";
    rb.onclick=function(){
      rb.classList.add("spin");
      fetchViaBackground(true).then(function(f){
        setCache(f);data=f;semStart=f.semesterStartMonday;
        if(semStart)curWeek=Math.max(1,calcWeek(semStart));
        renderGrid();
      }).catch(function(e){alert("刷新失败: "+e.message);}).finally(function(){rb.classList.remove("spin");});
    };

    var cb=document.createElement("button");cb.className="pp-sched-ib";cb.textContent="✕";cb.onclick=closeSchedule;

    hr.appendChild(ws);hr.appendChild(rb);hr.appendChild(cb);
    hd.appendChild(hl);hd.appendChild(hr);modal.appendChild(hd);

    var body=document.createElement("div");body.className="pp-sched-body";body.id="pp-sched-body";
    modal.appendChild(body);
    renderGrid();
  }

  function renderGrid(){
    rmTip();
    var body=document.getElementById("pp-sched-body");if(!body)return;body.innerHTML="";

    var wl=document.getElementById("pp-wk-l");
    if(wl){
      var actual=semStart?calcWeek(semStart):curWeek;
      wl.textContent="第"+curWeek+"周";
      wl.className="pp-wk-l"+(curWeek===actual?" pp-wk-cur":"");
    }

    if(!data||!data.courses||!data.courses.length){
      body.innerHTML='<div class="pp-sched-load" style="color:#ccc">暂无课表数据</div>';return;
    }

    var grid=document.createElement("div");grid.className="pp-sched-grid";

    var corner=document.createElement("div");corner.className="pp-sched-corner";grid.appendChild(corner);
    var today=new Date();var todayDow=today.getDay();if(todayDow===0)todayDow=7;
    var todayWeek=semStart?calcWeek(semStart):null;

    for(var d=1;d<=7;d++){
      var dh=document.createElement("div");dh.className="pp-sched-dh";
      if(todayWeek===curWeek&&todayDow===d)dh.classList.add("today");
      var dateStr="";
      if(semStart){var dt=dayDate(curWeek,d,semStart);dateStr=(dt.getMonth()+1)+"/"+dt.getDate();}
      dh.innerHTML='<div>'+WNAMES[d]+'</div>'+(dateStr?'<div class="pp-sched-dd">'+dateStr+'</div>':"");
      grid.appendChild(dh);
    }

    for(var s=0;s<TIMES.length;s++){
      var tl=document.createElement("div");tl.className="pp-sched-tl";
      tl.innerHTML='<div class="pp-sched-tn">'+(s+1)+'</div><div class="pp-sched-tr">'+TIMES[s][0]+'</div>';
      grid.appendChild(tl);
      var row=document.createElement("div");row.className="pp-sched-row";
      for(var c=0;c<7;c++){var cell=document.createElement("div");cell.className="pp-sched-cell";row.appendChild(cell);}
      grid.appendChild(row);
    }

    var layer=document.createElement("div");layer.className="pp-sched-layer";layer.id="pp-sched-layer";
    grid.appendChild(layer);
    body.appendChild(grid);

    // --- 重叠处理 ---
    var placed={};
    function courseKey(c){return c.weekTime+"-"+c.startTime+"-"+c.endTime+"-"+c.name;}

    var sorted=data.courses.filter(function(c){return c.weekTime>=1&&c.weekTime<=7&&c.startTime>=1;});
    sorted.sort(function(a,b){return a.weekTime===b.weekTime?a.startTime-b.startTime:a.weekTime-b.weekTime;});

    var groups=[],used={};
    sorted.forEach(function(c){
      var k=courseKey(c);if(used[k])return;
      var group=[c];used[k]=true;
      var changed=true;
      while(changed){
        changed=false;
        sorted.forEach(function(c2){
          var k2=courseKey(c2);if(used[k2])return;
          if(c2.weekTime!==c.weekTime)return;
          for(var i=0;i<group.length;i++){
            var g=group[i];
            if(c2.startTime<=g.endTime&&c2.endTime>=g.startTime){
              group.push(c2);used[k2]=true;changed=true;return;
            }
          }
        });
      }
      groups.push(group);
    });

    groups.forEach(function(group){
      if(group.length===1){placed[courseKey(group[0])]={col:0,total:1};return;}
      group.sort(function(a,b){return a.startTime-b.startTime;});
      var cols=[];
      group.forEach(function(c){
        var assigned=false;
        for(var i=0;i<cols.length;i++){
          if(c.startTime>cols[i]){cols[i]=c.endTime;placed[courseKey(c)]={col:i,total:0};assigned=true;break;}
        }
        if(!assigned){cols.push(c.endTime);placed[courseKey(c)]={col:cols.length-1,total:0};}
      });
      group.forEach(function(c){placed[courseKey(c)].total=cols.length;});
    });

    var headerH=0;
    var dhEl=grid.querySelector(".pp-sched-dh");
    if(dhEl)headerH=dhEl.offsetHeight;
    var tlW=44;

    sorted.forEach(function(c){
      var k=courseKey(c);var p=placed[k];if(!p)return;
      var active=c.weeks.indexOf(curWeek)>=0;
      var el=document.createElement("div");
      el.className="pp-sched-course"+(active?"":" inactive");
      el.style.background=ccolor(c.name);

      var left="calc("+tlW+"px + (100% - "+tlW+"px) / 7 * "+(c.weekTime-1)+(p.total>1?" + (100% - "+tlW+"px) / 7 / "+p.total+" * "+p.col:"")+ ")";
      var top=headerH+(c.startTime-1)*SLOT_H;
      var h=(c.endTime-c.startTime+1)*SLOT_H;

      el.style.left=left;
      el.style.top=top+"px";
      el.style.width="calc((100% - "+tlW+"px) / 7"+(p.total>1?" / "+p.total:"")+" - 2px)";
      el.style.height=(h-2)+"px";

      el.innerHTML='<div class="pp-sched-cn">'+esc(c.name)+'</div><div class="pp-sched-cl">'+esc(c.classroom)+'</div>';
      if(p.total>1)el.innerHTML+='<div class="pp-sched-od">'+p.total+'</div>';

      el.addEventListener("mouseenter",function(e){showTip(c,e);});
      el.addEventListener("mousemove",function(e){moveTip(e);});
      el.addEventListener("mouseleave",function(){rmTip();});
      layer.appendChild(el);
    });
  }

  // --- CSS ---
  function injectCSS(){
    if(document.getElementById("pp-sched-css"))return;
    var s=document.createElement("style");s.id="pp-sched-css";
    s.textContent=`
.pp-sched-ov{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;animation:ppfi .2s ease}
@keyframes ppfi{from{opacity:0}to{opacity:1}}
.pp-sched-modal{background:#fff;border-radius:20px;width:92vw;max-width:960px;height:85vh;max-height:750px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;animation:ppsu .25s ease}
@keyframes ppsu{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
.pp-sched-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #eee;flex-shrink:0}
.pp-sched-tt{font-size:17px;font-weight:600;color:#333}
.pp-sched-st{font-size:12px;color:#999;margin-left:8px}
.pp-sched-acts{display:flex;align-items:center;gap:8px}
.pp-wk-sel{display:flex;align-items:center;gap:4px}
.pp-wk-b{width:26px;height:26px;border:none;border-radius:50%;background:#f0f0f0;cursor:pointer;font-size:12px;color:#555;display:flex;align-items:center;justify-content:center;transition:background .15s}
.pp-wk-b:hover{background:#e0e0e0}
.pp-wk-l{font-size:13px;color:#555;min-width:60px;text-align:center;cursor:pointer;user-select:none}
.pp-wk-l:hover{color:#333}
.pp-wk-cur{font-weight:600;color:#5b6abf}
.pp-sched-ib{width:30px;height:30px;border:none;border-radius:50%;background:#f5f5f5;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#666}
.pp-sched-ib:hover{background:#eee;color:#333}
.pp-sched-ib.spin{animation:ppspin .8s linear infinite}
@keyframes ppspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.pp-sched-body{flex:1;overflow:auto;position:relative}
.pp-sched-grid{display:grid;grid-template-columns:44px repeat(7,1fr);position:relative}
.pp-sched-corner{border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:3}
.pp-sched-dh{text-align:center;font-size:13px;color:#777;padding:6px 0 4px;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:2}
.pp-sched-dh.today{color:#5b6abf;font-weight:600}
.pp-sched-dd{font-size:10px;color:#bbb;margin-top:1px}
.pp-sched-dh.today .pp-sched-dd{color:#7b8ad0}
.pp-sched-tl{display:flex;flex-direction:column;align-items:center;justify-content:center;height:${SLOT_H}px;border-right:1px solid #f5f5f5;box-sizing:border-box}
.pp-sched-tn{font-size:13px;font-weight:500;color:#aaa}
.pp-sched-tr{font-size:8px;color:#ccc;margin-top:1px}
.pp-sched-row{display:grid;grid-template-columns:repeat(7,1fr);height:${SLOT_H}px;border-bottom:1px solid #f8f8f8}
.pp-sched-cell{border-right:1px solid #f8f8f8}
.pp-sched-layer{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none}
.pp-sched-course{position:absolute;border-radius:7px;padding:3px 5px;overflow:hidden;cursor:default;font-size:11px;line-height:1.3;color:#fff;transition:box-shadow .15s,transform .15s;z-index:1;box-sizing:border-box;pointer-events:auto}
.pp-sched-course:hover{box-shadow:0 4px 14px rgba(0,0,0,.2);transform:scale(1.02);z-index:5}
.pp-sched-cn{font-weight:600;font-size:11px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pp-sched-cl{font-size:10px;opacity:.85;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-sched-od{position:absolute;top:2px;right:3px;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.3);font-size:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600}
.pp-sched-course.inactive{opacity:.3}
.pp-sched-tip{position:fixed;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.18);z-index:10002;min-width:200px;max-width:280px;pointer-events:none;animation:pptip .12s ease}
@keyframes pptip{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.pp-tip-n{font-size:15px;font-weight:600;color:#333;margin-bottom:8px}
.pp-tip-r{display:flex;align-items:flex-start;gap:6px;font-size:13px;color:#666;margin:4px 0;line-height:1.5}
.pp-tip-i{flex-shrink:0;width:18px;text-align:center}
.pp-sched-load,.pp-sched-err{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;gap:10px}
.pp-sched-spin{width:30px;height:30px;border:3px solid #e0e0e0;border-top-color:#5b6abf;border-radius:50%;animation:ppspin .8s linear infinite}
.pp-sched-err-m{font-size:14px;color:#e74c3c}
.pp-sched-retry{padding:5px 14px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;color:#555;font-size:13px}
.pp-sched-retry:hover{background:#f5f5f5}
    `;
    document.head.appendChild(s);
  }

  window.ppSchedule={open:openSchedule,close:closeSchedule};
})();
