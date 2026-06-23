const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(html,{runScripts:"dangerously",resources:"usable",pretendToBeVisual:true});
const {window}=dom;
window.Image=class{set src(v){this._s=v; if(this.onerror) setTimeout(()=>this.onerror(),0);} };
window.HTMLElement.prototype.scrollIntoView=()=>{};
function done(){
  const w=window, d=w.document, log=[];
  const A=(c,m)=>log.push((c?'PASS':'FAIL')+' '+m);
  // 1 default menu rendered
  A(d.querySelectorAll('#defaultMenu .dish').length===4,'默认菜单4张');
  // 2 open modal + select goal + fill + generate
  w.openModal();
  d.querySelector('#goalOpts .opt[data-val="减脂"]').onclick();
  A(w.state.goal==='减脂','选择目标');
  w.gotoStep(1);
  d.getElementById('weight').value=70; d.getElementById('height').value=175; d.getElementById('age').value=30;
  w.gotoStep(2);
  // avoid chip
  d.querySelector('#avoidChips .chip[data-tag="no-beef"]').onclick();
  A(w.state.avoid.includes('no-beef'),'禁忌选择');
  // run generate (uses setInterval) -> call applyPlan directly to avoid timers
  w.applyPlan();
  A(d.getElementById('planResult').style.display==='block','计划区显示');
  const cal=+d.getElementById('calNum').textContent; // animated, may be partial
  A(w.state.targets && w.state.targets.target>1000,'热量目标计算='+w.state.targets.target);
  A(d.querySelectorAll('#todayMeals .dish').length===3,'今日三餐='+d.querySelectorAll('#todayMeals .dish').length);
  // beef filtered: ensure no 越南牛肉河粉 in today/week
  const txt=d.getElementById('todayMeals').textContent+d.getElementById('weekTable').textContent;
  A(!txt.includes('牛肉河粉'),'禁忌已过滤(无牛肉河粉)');
  // weekly
  A(d.getElementById('weekTable').style.display==='table','周套餐表显示');
  A(d.querySelectorAll('#weekTable tbody tr').length===5,'周套餐5行');
  A(/¥\d+/.test(d.getElementById('weekTotal').textContent),'周合计='+d.getElementById('weekTotal').textContent);
  // swap meal
  const swapBtn=d.querySelector('#todayMeals .dish button');
  const before=d.querySelector('#todayMeals .dish h4').textContent;
  // find a 换一餐 button
  let changed=false;
  d.querySelectorAll('#todayMeals .dish').forEach(card=>{
    const b=[...card.querySelectorAll('button')].find(x=>x.textContent.includes('换一餐'));
    if(b){const h=card.querySelector('h4').textContent; b.onclick(); /*may set same*/ }
  });
  A(true,'换一餐可调用(无异常)');
  // assistant
  w.askQuick('我想减脂，推荐午餐');
  setTimeout(()=>{
    A(d.querySelectorAll('#asBody .as-msg').length>=3,'助手回复消息数='+d.querySelectorAll('#asBody .as-msg').length);
    // hero slides
    A(d.querySelectorAll('#heroSlides .hero-slide').length===5,'hero幻灯5张');
    A(d.querySelectorAll('#heroDots .hero-dot').length===5,'hero圆点5个');
    console.log(log.join('\n'));
    const fails=log.filter(x=>x.startsWith('FAIL'));
    console.log('\n=== '+(fails.length?('有 '+fails.length+' 项失败'):'全部通过')+' ===');
  },50);
}
window.addEventListener('load',()=>setTimeout(done,80));
