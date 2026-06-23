import os

BASE = r'D:\1神州数码\AI\万耀企龙展位推荐'
PAGES = os.path.join(BASE, 'pages')

# Read all source files
with open(os.path.join(BASE, '门户首页_Landing.html'), 'r', encoding='utf-8') as f:
    landing = f.read()
with open(os.path.join(BASE, 'styles.css.html'), 'r', encoding='utf-8') as f:
    css = f.read().replace('<style>', '').replace('</style>', '')

page_contents = {}
for name in sorted(os.listdir(PAGES)):
    if name.endswith('.html'):
        with open(os.path.join(PAGES, name), 'r', encoding='utf-8') as f:
            page_contents[name] = f.read()

print(f"Read {len(page_contents)} page files")
print("Building index.html...")


def build_html(landing, css, pages):
    lines = []

    # ===== HEAD =====
    lines.append('''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>万耀企龙 - 展位AI智能推荐与动态定价系统</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
<style>
''')
    lines.append(css)
    lines.append('''
/* SPA overrides */
.view{display:none}.view.active{display:block}
.client-portal-view,.staff-portal-view{display:none;min-height:100vh;background:var(--gray-50)}
.client-portal-view.active,.staff-portal-view.active{display:flex;flex-direction:column}
.portal-layout{display:flex;flex:1}
.portal-main-content{flex:1;margin-left:var(--sidebar-width);padding-top:var(--navbar-height);min-height:100vh}
.page-container{padding:32px;max-width:1400px}
.toast-container{position:fixed;top:80px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px}
.toast{display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:var(--radius-md);background:var(--white);box-shadow:var(--shadow-lg);border-left:4px solid;min-width:320px;animation:toastIn .3s ease}
.toast.success{border-color:var(--green)}.toast.error{border-color:var(--red)}.toast.info{border-color:var(--cyan)}
.toast-message{font-size:14px;color:var(--gray-700);flex:1}
@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:1024px){.portal-main-content{margin-left:0}}
@media(max-width:768px){.page-container{padding:20px 16px}}
</style>
</head>
<body>
''')

    # ===== LANDING PAGE =====
    lines.append('<div id="view-landing" class="view active">\n')
    # Extract body from landing (remove script tags)
    landing_body = extract_body(landing)
    landing_body = remove_scripts(landing_body)
    lines.append(landing_body)
    lines.append('\n</div>\n')

    # ===== CLIENT LOGIN =====
    lines.append(build_client_login())

    # ===== STAFF LOGIN =====
    lines.append(build_staff_login())

    # ===== CLIENT PORTAL =====
    lines.append(build_client_portal())

    # ===== STAFF PORTAL =====
    lines.append(build_staff_portal())

    # ===== TOAST =====
    lines.append('<div class="toast-container" id="toastContainer"></div>\n')

    # ===== JAVASCRIPT =====
    lines.append('<script>\n')
    lines.append(build_js())
    lines.append('\n<\/script>\n')

    # ===== FOOTER =====
    lines.append('</body>\n</html>')

    return ''.join(lines)


def extract_body(html):
    start = html.find('<body>')
    end = html.rfind('</body>')
    if start != -1 and end != -1:
        return html[start+6:end]
    return html


def remove_scripts(html):
    while '<script>' in html:
        html = html[:html.find('<script>')] + html[html.rfind('</script>')+9:]
    return html


def build_client_login():
    return '''<div id="view-client-login" class="view" style="display:none;">
<div class="login-page">
<div class="hero-grid"></div>
<div class="login-card">
<div class="login-card-header">
<div class="login-logo">GE</div>
<div class="login-title">参展商登录</div>
<div class="login-subtitle">万耀企龙 - 展位智能推荐系统</div>
</div>
<div class="login-error" id="clientLoginError" style="display:none;padding:10px 14px;border-radius:var(--radius-sm);background:var(--red-light);color:var(--red);font-size:13px;margin-bottom:16px;">账号或密码错误，请重试</div>
<div class="login-form">
<div class="form-group"><label>企业邮箱</label><input type="email" id="clientEmail" placeholder="请输入企业邮箱" value="demo@globusevents.com"></div>
<div class="form-group"><label>密码</label><input type="password" id="clientPassword" placeholder="请输入密码" value="123456"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-light);cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--gold);"> 记住账号</label>
<span style="font-size:13px;color:var(--gold-light);cursor:pointer;" onclick="alert('请联系管理员重置密码')">忘记密码？</span>
</div>
<button class="login-submit" onclick="doClientLogin()">登 录</button>
<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:24px;font-size:13px;color:var(--text-muted);cursor:pointer;transition:color .2s;" onclick="showView('landing')" onmouseover="this.style.color='var(--text-light)'" onmouseout="this.style.color='var(--text-muted)'">← 返回首页</div>
</div>
</div>
</div>
</div>
'''


def build_staff_login():
    return '''<div id="view-staff-login" class="view" style="display:none;">
<div class="login-page login-staff">
<div class="hero-grid"></div>
<div class="login-card">
<div class="login-card-header">
<div class="login-logo" style="background:linear-gradient(135deg,var(--cyan),var(--cyan-light));">GE</div>
<div class="login-title">员工后台登录</div>
<div class="login-subtitle">万耀企龙 - 运营管理系统</div>
</div>
<div class="login-error" id="staffLoginError" style="display:none;padding:10px 14px;border-radius:var(--radius-sm);background:var(--red-light);color:var(--red);font-size:13px;margin-bottom:16px;">账号或密码错误，请重试</div>
<div class="login-form">
<div class="form-group"><label>工号 / 邮箱</label><input type="text" id="staffAccount" placeholder="请输入工号或邮箱" value="admin@globusevents.com"></div>
<div class="form-group"><label>密码</label><input type="password" id="staffPassword" placeholder="请输入密码" value="admin123"></div>
<button class="login-submit" onclick="doStaffLogin()" style="background:linear-gradient(135deg,var(--cyan),var(--cyan-light));color:var(--white);">登 录</button>
<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:24px;font-size:13px;color:var(--text-muted);cursor:pointer;transition:color .2s;" onclick="showView('landing')" onmouseover="this.style.color='var(--text-light)'" onmouseout="this.style.color='var(--text-muted)'">← 返回首页</div>
</div>
</div>
</div>
</div>
'''


def build_client_portal():
    return '''<div id="view-client" class="client-portal-view">
<nav class="client-navbar">
<div style="display:flex;align-items:center;gap:12px;">
<button class="menu-toggle" id="clientMenuToggle" style="display:none;" onclick="toggleSidebar('client')"><i class="fas fa-bars"></i></button>
<div class="nav-brand"><div class="nav-logo">GE</div><div><div class="nav-title">GLOBUS EVENTS</div><div class="nav-subtitle">万耀企龙 - 参展商工作台</div></div></div>
</div>
<div class="client-nav-right">
<div class="client-nav-user"><div class="client-nav-avatar">企</div><div><div class="client-nav-name" id="clientUserName">上海数码科技有限公司</div><div class="client-nav-role">参展商</div></div></div>
<button class="client-nav-logout" onclick="doClientLogout()"><i class="fas fa-sign-out-alt"></i> 退出</button>
</div>
</nav>
<div class="portal-layout">
<aside class="sidebar sidebar-client" id="clientSidebar">
<div class="sidebar-section"><div class="sidebar-section-title">参展管理</div>
<nav class="sidebar-nav">
<button class="sidebar-link active" data-page="dashboard"><span class="sidebar-link-icon">📊</span> 我的仪表盘</button>
<button class="sidebar-link" data-page="demand"><span class="sidebar-link-icon">📝</span> 需求录入</button>
<button class="sidebar-link" data-page="recommend"><span class="sidebar-link-icon">🤖</span> AI推荐方案</button>
<button class="sidebar-link" data-page="map"><span class="sidebar-link-icon">🗺️</span> 场馆平面图</button>
<button class="sidebar-link" data-page="price"><span class="sidebar-link-icon">💰</span> 动态价格</button>
<button class="sidebar-link" data-page="quotes"><span class="sidebar-link-icon">📄</span> 我的报价/预约</button>
</nav></div></aside>
<main class="portal-main-content" id="clientMain"><div class="page-container"></div></main>
</div></div>
'''


def build_staff_portal():
    return '''<div id="view-staff" class="staff-portal-view">
<nav class="staff-navbar">
<div style="display:flex;align-items:center;gap:12px;">
<button class="menu-toggle" id="staffMenuToggle" style="display:none;" onclick="toggleSidebar('staff')"><i class="fas fa-bars"></i></button>
<div class="nav-brand"><div class="nav-logo" style="background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--navy-dark);">GE</div><div><div class="nav-title">GLOBUS EVENTS</div><div class="nav-subtitle">运营管理中心</div></div></div>
</div>
<div class="staff-nav-right">
<div class="staff-nav-user"><div class="staff-nav-avatar">管</div><div><div class="staff-nav-name">管理员 - 张三</div><div class="staff-nav-role">超级管理员</div></div></div>
<button class="staff-nav-logout" onclick="doStaffLogout()"><i class="fas fa-sign-out-alt"></i> 退出</button>
</div>
</nav>
<div class="portal-layout">
<aside class="sidebar sidebar-staff" id="staffSidebar">
<div class="sidebar-section"><div class="sidebar-section-title">运营管理</div>
<nav class="sidebar-nav">
<button class="sidebar-link active" data-page="dashboard"><span class="sidebar-link-icon">📊</span> 运营数据看板</button>
<button class="sidebar-link" data-page="leads"><span class="sidebar-link-icon">👥</span> 客户线索管理</button>
<button class="sidebar-link" data-page="booths"><span class="sidebar-link-icon">🏗️</span> 展位资源管理</button>
</nav></div>
<div class="sidebar-section"><div class="sidebar-section-title">系统配置</div>
<nav class="sidebar-nav">
<button class="sidebar-link" data-page="ai-config"><span class="sidebar-link-icon">🧠</span> AI模型参数</button>
<button class="sidebar-link" data-page="pricing"><span class="sidebar-link-icon">💲</span> 动态定价规则</button>
</nav></div>
<div class="sidebar-section"><div class="sidebar-section-title">交易数据</div>
<nav class="sidebar-nav">
<button class="sidebar-link" data-page="orders"><span class="sidebar-link-icon">📋</span> 订单管理</button>
<button class="sidebar-link" data-page="reports"><span class="sidebar-link-icon">📈</span> 数据报表</button>
</nav></div></aside>
<main class="portal-main-content" id="staffMain"><div class="page-container"></div></main>
</div></div>
'''


def build_js():
    return r'''
// ============================================================
// DATA
// ============================================================
const BOOTH_DATA = [];
const levels = ['S','A','B','C'];
const levelNames = { S:'旗舰臻装', A:'优选展位', B:'标准展位', C:'基础展位' };
const basePrices = { S:38000, A:22000, B:12800, C:9800 };
const boothCounts = { S:12, A:36, B:80, C:32 };
let bid = 1;
for(const lv of levels){
  for(let i=1;i<=boothCounts[lv];i++){
    const statuses=['available','available','available','available','available','ai-recommended','locked','sold'];
    const status=statuses[Math.floor(Math.random()*statuses.length)];
    const pf = lv==='S'?1.2+Math.random()*0.3:lv==='A'?1+Math.random()*0.2:lv==='B'?0.85+Math.random()*0.15:0.7+Math.random()*0.2;
    BOOTH_DATA.push({id:bid,number:`${lv}-${String(i).padStart(3,'0')}`,level:lv,levelName:levelNames[lv],area:lv==='S'?36:lv==='A'?18:9,basePrice:basePrices[lv],dynamicPrice:Math.round(basePrices[lv]*pf),status,status,row:Math.floor((i-1)/8),col:(i-1)%8,floor:(lv==='S')?1:(lv==='A'&&i>18)?2:(lv==='B'&&i>40)?2:(lv==='C'&&i>16)?2:1,matchScore:Math.round(60+Math.random()*35)});
    bid++;
  }
}

const LEADS_DATA=[
  {id:1,company:'上海数码科技有限公司',industry:'信息技术',budget:'15-25万',date:'2026-06-18',status:'new',contact:'李经理'},
  {id:2,company:'北京创新医疗集团',industry:'医疗健康',budget:'25-40万',date:'2026-06-17',status:'negotiating',contact:'王总监'},
  {id:3,company:'深圳绿色能源股份',industry:'新能源',budget:'10-20万',date:'2026-06-16',status:'quoted',contact:'赵总'},
  {id:4,company:'杭州智造科技公司',industry:'智能制造',budget:'20-35万',date:'2026-06-15',status:'new',contact:'陈经理'},
  {id:5,company:'广州时尚品牌集团',industry:'消费品',budget:'30-50万',date:'2026-06-14',status:'booked',contact:'刘董'},
];

const QUOTES_DATA=[
  {id:1,booth:'A-005',level:'A',price:25800,status:'pending',date:'2026-06-18',company:'上海数码科技有限公司'},
  {id:2,booth:'B-022',level:'B',price:14200,status:'confirmed',date:'2026-06-16',company:'上海数码科技有限公司'},
  {id:3,booth:'S-001',level:'S',price:45600,status:'expired',date:'2026-06-10',company:'上海数码科技有限公司'},
];

// ============================================================
// NAVIGATION
// ============================================================
function showView(name){
  document.querySelectorAll('.view,.client-portal-view,.staff-portal-view').forEach(v=>{v.classList.remove('active');v.style.display='none';});
  const el=document.getElementById('view-'+name);
  if(el){el.classList.add('active');el.style.display='';}
  window.scrollTo(0,0);
}

function doClientLogin(){
  const e=document.getElementById('clientEmail').value;
  const p=document.getElementById('clientPassword').value;
  if(!e||!p){document.getElementById('clientLoginError').style.display='block';return;}
  document.getElementById('clientLoginError').style.display='none';
  showView('client');
  navigateClient('dashboard');
}

function doStaffLogin(){
  const a=document.getElementById('staffAccount').value;
  const p=document.getElementById('staffPassword').value;
  if(!a||!p){document.getElementById('staffLoginError').style.display='block';return;}
  document.getElementById('staffLoginError').style.display='none';
  showView('staff');
  navigateStaff('dashboard');
}

function doClientLogout(){showView('landing');}
function doStaffLogout(){showView('landing');}

function toggleSidebar(type){
  const sb=document.getElementById(type==='client'?'clientSidebar':'staffSidebar');
  sb.classList.toggle('open');
}

// Client sidebar navigation
document.addEventListener('click', function(e){
  const link=e.target.closest('.sidebar-link');
  if(!link) return;
  const sidebar=link.closest('.sidebar');
  const isStaff=sidebar.classList.contains('sidebar-staff');
  sidebar.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));
  link.classList.add('active');
  if(isStaff) navigateStaff(link.dataset.page);
  else navigateClient(link.dataset.page);
});

function navigateClient(page){
  const mc=document.querySelector('#clientMain .page-container');
  if(!mc) return;
  switch(page){
    case 'dashboard': renderClientDashboard(mc); break;
    case 'demand': renderDemandForm(mc); break;
    case 'recommend': renderRecommendations(mc); break;
    case 'map': renderVenueMap(mc); break;
    case 'price': renderPriceDetail(mc); break;
    case 'quotes': renderQuotes(mc); break;
    default: renderClientDashboard(mc);
  }
}

function navigateStaff(page){
  const mc=document.querySelector('#staffMain .page-container');
  if(!mc) return;
  switch(page){
    case 'dashboard': renderStaffDashboard(mc); break;
    case 'leads': renderStaffLeads(mc); break;
    case 'booths': renderStaffBooths(mc); break;
    case 'ai-config': renderStaffAIConfig(mc); break;
    case 'pricing': renderStaffPricing(mc); break;
    case 'orders': renderStaffOrders(mc); break;
    case 'reports': renderStaffReports(mc); break;
    default: renderStaffDashboard(mc);
  }
}

// Toast notification
function showToast(msg,type='info'){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');
  t.className='toast '+type;
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span class="toast-message">${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// ============================================================
// CLIENT RENDER FUNCTIONS
// ============================================================

function renderClientDashboard(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📊 我的仪表盘</h1><p class="page-desc">欢迎回来，以下是您的参展概览</p></div>
  <div class="kpi-grid">
    <div class="kpi-card cyan"><div class="kpi-header"><span class="kpi-label">我的报价单</span><div class="kpi-icon cyan">📝</div></div><div class="kpi-value">3</div></div>
    <div class="kpi-card gold"><div class="kpi-header"><span class="kpi-label">待处理报价</span><div class="kpi-icon gold">⏳</div></div><div class="kpi-value">1</div></div>
    <div class="kpi-card green"><div class="kpi-header"><span class="kpi-label">已确认展位</span><div class="kpi-icon green">✅</div></div><div class="kpi-value">1</div></div>
  </div>
  <div class="chart-grid">
    <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-bullhorn" style="color:var(--cyan);margin-right:8px;"></i>系统公告</div><span class="badge badge-cyan">3条新消息</span></div><div class="card-body">
      <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="padding:2px 8px;border-radius:4px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:600;white-space:nowrap;">新功能</span><span style="font-size:14px;color:var(--gray-700);">AI推荐系统已升级至V2.0，新增三档方案对比功能</span><span style="font-size:12px;color:var(--gray-400);margin-left:auto;white-space:nowrap;">2026-06-20</span></div>
      <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="padding:2px 8px;border-radius:4px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:600;white-space:nowrap;">活动</span><span style="font-size:14px;color:var(--gray-700);">早鸟优惠：6月30日前预约可享额外9折折扣</span><span style="font-size:12px;color:var(--gray-400);margin-left:auto;white-space:nowrap;">2026-06-18</span></div>
      <div style="display:flex;gap:12px;padding:12px 0;"><span style="padding:2px 8px;border-radius:4px;background:#fef9c3;color:#a16207;font-size:12px;font-weight:600;white-space:nowrap;">提醒</span><span style="font-size:14px;color:var(--gray-700);">您有1份报价单待确认，请及时处理</span><span style="font-size:12px;color:var(--gray-400);margin-left:auto;white-space:nowrap;">2026-06-17</span></div>
    </div></div>
    <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-bolt" style="color:var(--gold);margin-right:8px;"></i>快捷操作</div></div><div class="card-body">
      <p style="font-size:14px;color:var(--gray-500);margin-bottom:16px;">选择您需要的操作，快速开始</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        <button class="btn btn-primary" onclick="navigateClient('demand')"><i class="fas fa-pen"></i> 录入参展需求</button>
        <button class="btn btn-gold" onclick="navigateClient('recommend')"><i class="fas fa-robot"></i> 查看AI推荐</button>
        <button class="btn btn-outline" onclick="navigateClient('map')"><i class="fas fa-map"></i> 浏览场馆地图</button>
      </div>
    </div></div>
  </div>`;
}

function renderDemandForm(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📝 参展需求录入</h1><p class="page-desc">请填写以下信息，AI将为您智能匹配最优展位方案</p></div>
  <div class="card" style="max-width:800px;"><div class="card-body" id="demandFormContent">
    <div id="demandFormBody">
      <div class="form-row">
        <div class="form-group"><label class="form-label">企业名称 <span style="color:var(--red);">*</span></label><input class="form-input" id="fCompany" value="上海数码科技有限公司" placeholder="请输入企业全称"></div>
        <div class="form-group"><label class="form-label">所属行业 <span style="color:var(--red);">*</span></label><select class="form-select" id="fIndustry"><option>信息技术</option><option>医疗健康</option><option>新能源</option><option>智能制造</option><option>消费品</option><option>金融保险</option><option>教育文化</option><option>其他</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">企业规模 <span style="color:var(--red);">*</span></label><select class="form-select" id="fScale"><option>小型（&lt;50人）</option><option selected>中型（50-500人）</option><option>大型（500-2000人）</option><option>集团（&gt;2000人）</option></select></div>
        <div class="form-group"><label class="form-label">参展预算范围 <span style="color:var(--red);">*</span></label><select class="form-select" id="fBudget"><option>5-10万元</option><option selected>10-20万元</option><option>20-35万元</option><option>35-50万元</option><option>50万元以上</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">期望展位面积 <span style="color:var(--red);">*</span></label><select class="form-select" id="fArea"><option>9 m²（标准）</option><option selected>18 m²（中等）</option><option>36 m²（大型）</option><option>72 m²以上（特装）</option></select></div>
        <div class="form-group"><label class="form-label">是否首次参展</label><select class="form-select" id="fFirstTime"><option>是，首次参展</option><option selected>否，有参展经验</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">参展主要目的 <span style="color:var(--red);">*</span></label><select class="form-select" id="fGoal"><option>品牌曝光与形象展示</option><option selected>产品发布与推广</option><option>客户拓展与商务洽谈</option><option>行业交流与趋势洞察</option><option>综合目的</option></select></div>
      <div class="form-group"><label class="form-label">特殊需求说明</label><textarea class="form-textarea" id="fNotes" placeholder="如有特殊位置偏好、搭建要求等，请在此说明..."></textarea><div class="form-hint">可选，详细描述有助于AI更精准地为您推荐展位</div></div>
      <button class="btn btn-gold btn-block" id="submitBtn" onclick="submitDemand()" style="padding:14px;font-size:15px;"><i class="fas fa-robot"></i> 提交并生成AI推荐方案</button>
    </div>
    <div id="demandSuccess" style="display:none;text-align:center;padding:40px 24px;">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--green);color:white;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;"><i class="fas fa-check"></i></div>
      <h3 style="font-size:20px;color:var(--navy);margin-bottom:8px;">需求已提交成功！</h3>
      <p style="font-size:14px;color:var(--gray-500);margin-bottom:24px;">AI正在分析您的需求，即将为您展示最佳推荐方案...</p>
      <button class="btn btn-gold" style="width:auto;padding:10px 32px;" onclick="navigateClient('recommend')"><i class="fas fa-lightbulb"></i> 查看AI推荐方案</button>
    </div>
  </div></div>`;
}

function submitDemand(){
  const btn=document.getElementById('submitBtn');
  btn.disabled=true;
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> AI正在分析...';
  setTimeout(()=>{
    document.getElementById('demandFormBody').style.display='none';
    document.getElementById('demandSuccess').style.display='block';
  },1800);
}

function renderRecommendations(c){
  const best=BOOTH_DATA.filter(b=>b.level==='A'&&b.status!=='sold').slice(0,3);
  const premium=BOOTH_DATA.filter(b=>b.level==='S'&&b.status!=='sold').slice(0,2);
  const value=BOOTH_DATA.filter(b=>b.level==='B'&&b.status!=='sold').slice(0,3);
  function bRows(bs){
    return bs.map(b=>`<tr><td><strong>${b.number}</strong></td><td><span class="badge badge-${b.level==='S'?'gold':b.level==='A'?'cyan':'green'}">${b.levelName}</span></td><td>${b.area}m²</td><td style="font-weight:700;color:var(--cyan);">¥${b.dynamicPrice.toLocaleString()}</td><td><div style="display:flex;align-items:center;gap:6px;"><div style="width:60px;height:5px;border-radius:3px;background:var(--gray-200);overflow:hidden;"><div style="height:100%;width:${b.matchScore}%;border-radius:3px;background:${b.matchScore>=80?'var(--green)':b.matchScore>=65?'var(--gold)':'var(--cyan)'}"></div></div><span style="font-size:12px;color:var(--gray-500);">${b.matchScore}%</span></div></td><td><button class="btn btn-outline btn-sm" onclick="navigateClient('map')"><i class="fas fa-map-marker-alt"></i> 查看位置</button></td></tr>`).join('');
  }
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">🤖 AI智能推荐方案</h1><p class="page-desc">基于您的需求，AI为您生成了以下三档推荐方案</p></div>
  <div style="background:linear-gradient(135deg,rgba(0,163,224,0.06),rgba(0,163,224,0.02));border:1px solid rgba(0,163,224,0.15);border-radius:var(--radius-lg);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
    <div><i class="fas fa-clipboard-list" style="color:var(--cyan);margin-right:8px;"></i><strong>本次需求概要：</strong>信息技术 · 中型企业 · 预算10-20万 · 参展目的：产品发布</div>
    <button class="btn btn-outline" onclick="navigateClient('demand')"><i class="fas fa-edit"></i> 修改需求</button>
  </div>
  <div class="recommendation-grid" style="grid-template-columns:1fr;gap:24px;">
    ${recCard('best','⭐ 最优适配','综合评分最高，完美匹配您的需求','92%','high',bRows(best),'btn-primary','在地图上查看全部推荐')}
    ${recCard('premium','👑 高端升级','旗舰级展位，最大化品牌影响力','78%','mid',bRows(premium),'btn-gold','查看高端展位分布')}
    ${recCard('value','💰 性价比之选','经济实惠，适合预算有限的企业','65%','low',bRows(value),'btn-success','查看性价比展位')}
  </div>`;
}

function recCard(cls,title,desc,score,fillClass,rows,btnCls,btnText){
  return `<div class="rec-card ${cls}">
    <div class="rec-header"><div class="rec-tier"><span class="rec-tier-icon">${title.split(' ')[0]}</span><div><div class="rec-tier-name">${title.split(' ').slice(1).join(' ')}</div><div style="font-size:13px;color:var(--gray-500);">${desc}</div></div></div><div class="rec-score">${score}</div></div>
    <div class="rec-body"><table class="data-table"><thead><tr><th>展位编号</th><th>等级</th><th>面积</th><th>动态价格</th><th>匹配度</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="rec-footer"><button class="btn ${btnCls}" onclick="navigateClient('map')"><i class="fas fa-map-marked-alt"></i> ${btnText}</button></div></div>`;
}

function renderVenueMap(c){
  let currentFloor=1,selectedBooth=null;
  const floor1Booths=BOOTH_DATA.filter(b=>b.floor===1).slice(0,80);
  const floor2Booths=BOOTH_DATA.filter(b=>b.floor===2).slice(0,36);
  function genSVG(floor){
    const booths=floor===1?floor1Booths:floor2Booths;
    const cols=Math.min(booths.length,8);
    const rows=Math.ceil(booths.length/cols);
    const bw=55,bh=35,gap=8;
    const sw=cols*(bw+gap)+40;
    const sh=rows*(bh+gap)+80;
    let svg=`<svg viewBox="0 0 ${sw} ${sh}" style="width:100%;max-width:700px;margin:0 auto;">`;
    // Entrance zone label
    svg+=`<text x="${sw/2}" y="24" text-anchor="middle" font-size="12" fill="var(--gray-400)" font-weight="600" letter-spacing="2">${floor===1?'一层展馆平面':'二层展馆平面'}</text>`;
    svg+=`<text x="30" y="50" font-size="11" fill="var(--gray-400)">入口迎宾区 →</text>`;
    booths.forEach((b,i)=>{
      const col=i%cols;
      const row=Math.floor(i/cols);
      const x=20+col*(bw+gap);
      const y=55+row*(bh+gap);
      const colors={available:'#D1FAE5',recommended:'#00A3E0',locked:'#FEF3C7',sold:'#E4E7EB'};
      const strokes={available:'#10B981',recommended:'#00A3E0',locked:'#F59E0B',sold:'#D1D5DB'};
      const fill=b.status==='ai-recommended'?colors.recommended:colors[b.status]||'#D1FAE5';
      const stroke=b.status==='ai-recommended'?strokes.recommended:strokes[b.status]||'#10B981';
      svg+=`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="booth-rect" onclick="window._selBooth('${b.number}',${b.id})" style="cursor:pointer;" />`;
      svg+=`<text x="${x+bw/2}" y="${y+bh/2+1}" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="600" fill="${b.status==='sold'?'var(--gray-400)':'var(--gray-700)'}" pointer-events="none">${b.number}</text>`;
    });
    svg+=`</svg>`;
    return svg;
  }
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">🗺️ 场馆平面图</h1><p class="page-desc">点击展位查看详情，颜色编码显示实时状态</p></div>
  <div class="venue-map-container">
    <div class="venue-map-toolbar">
      <div class="floor-tabs">
        <button class="floor-tab active" onclick="window._switchFloor(1,this)">1F 一层展位</button>
        <button class="floor-tab" onclick="window._switchFloor(2,this)">2F 二层展位</button>
      </div>
      <div class="map-legend">
        <div class="legend-item"><div class="legend-color available"></div>可订</div>
        <div class="legend-item"><div class="legend-color recommended"></div>AI推荐</div>
        <div class="legend-item"><div class="legend-color locked"></div>锁定</div>
        <div class="legend-item"><div class="legend-color sold"></div>已售</div>
      </div>
    </div>
    <div class="venue-map-area" id="venueMapArea">${genSVG(1)}</div>
  </div>
  <div class="booth-detail-panel" id="boothDetailPanel">
    <div class="booth-detail-header"><span class="booth-detail-title">展位详情</span><span class="booth-detail-close" onclick="window._clearBooth()">✕</span></div>
    <div class="booth-detail-body" id="boothDetailBody">
      <div style="text-align:center;padding:60px 24px;color:var(--gray-400);"><div style="font-size:48px;margin-bottom:16px;opacity:0.5;">👆</div><div>点击展位查看详情</div></div>
    </div>
  </div>`;
  window._currentFloor=1;
  window._switchFloor=function(f,btn){
    window._currentFloor=f;
    document.querySelectorAll('.floor-tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('venueMapArea').innerHTML=genSVG(f);
  };
  window._selBooth=function(num,id){
    const b=BOOTH_DATA.find(x=>x.number===num);
    if(!b) return;
    selectedBooth=b;
    const bd=document.getElementById('boothDetailBody');
    const statusMap={available:['可订','badge-green'],recommended:['AI推荐','badge-cyan'],locked:['锁定','badge-yellow'],sold:['已售','badge-gray']};
    const [stLabel,stCls]=statusMap[b.status]||['未知','badge-gray'];
    bd.innerHTML=`
      <div class="booth-detail-grid">
        <div class="booth-detail-field"><span class="booth-detail-field-label">展位编号</span><span class="booth-detail-field-value">${b.number}</span></div>
        <div class="booth-detail-field"><span class="booth-detail-field-label">等级</span><span class="booth-detail-field-value"><span class="badge badge-${b.level==='S'?'gold':b.level==='A'?'cyan':'green'}">${b.levelName}</span></span></div>
        <div class="booth-detail-field"><span class="booth-detail-field-label">面积</span><span class="booth-detail-field-value">${b.area} m²</span></div>
        <div class="booth-detail-field"><span class="booth-detail-field-label">楼层</span><span class="booth-detail-field-value">${b.floor}F</span></div>
        <div class="booth-detail-field"><span class="booth-detail-field-label">状态</span><span class="booth-detail-field-value"><span class="badge ${stCls}">${stLabel}</span></span></div>
        <div class="booth-detail-field"><span class="booth-detail-field-label">AI匹配度</span><span class="booth-detail-field-value">${b.matchScore}%</span></div>
        <div class="booth-detail-price"><div><div style="font-size:12px;color:var(--gray-400);">动态价格</div><div style="font-size:28px;font-weight:800;color:var(--cyan);">¥${b.dynamicPrice.toLocaleString()}</div></div>
        ${b.status!=='sold'?`<button class="btn btn-success" onclick="showToast('预约请求已提交！','success')"><i class="fas fa-calendar-check"></i> 预约此展位</button>`:`<span style="color:var(--gray-400);font-size:13px;">该展位已售出</span>`}
        </div>
      </div>`;
  };
  window._clearBooth=function(){
    document.getElementById('boothDetailBody').innerHTML='<div style="text-align:center;padding:60px 24px;color:var(--gray-400);"><div style="font-size:48px;margin-bottom:16px;opacity:0.5;">👆</div><div>点击展位查看详情</div></div>';
  };
}

function renderPriceDetail(c){
  const booths=BOOTH_DATA.filter(b=>b.status!=='sold').slice(0,10);
  const opts=booths.map(b=>`<option value="${b.number}" ${b.number==='A-005'?'selected':''}>${b.number} (${b.levelName})</option>`).join('');
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">💰 动态价格详情</h1><p class="page-desc">查看展位的实时动态价格构成与波动趋势</p></div>
  <div class="filter-bar">
    <span class="filter-bar-label">选择展位：</span>
    <select class="filter-select" id="priceBoothSelect">${opts}</select>
    <button class="btn btn-primary" onclick="updatePrice()"><i class="fas fa-search"></i> 查看价格</button>
  </div>
  <div class="chart-grid">
    <div class="card"><div class="card-header"><div class="card-title">📋 价格构成</div></div><div class="card-body" id="priceBreakdown"></div></div>
    <div class="card"><div class="card-header"><div class="card-title">📈 24小时价格趋势</div></div><div class="card-body"><div class="chart-body"><canvas id="priceChart"></canvas></div></div></div>
  </div>
  <div class="card"><div class="card-header"><div class="card-title">📋 价格说明</div></div><div class="card-body">
    <ul style="list-style:none;padding:0;">
      <li style="padding:8px 0;font-size:14px;color:var(--gray-600);">• 价格基于AI实时计算，综合考虑展位位置、面积、流量等多维因子</li>
      <li style="padding:8px 0;font-size:14px;color:var(--gray-600);">• 早鸟优惠：6月30日前预约可享额外9折折扣</li>
      <li style="padding:8px 0;font-size:14px;color:var(--gray-600);">• 价格有效期至2026-07-01，过期后需重新询价</li>
    </ul>
  </div></div>`;
  updatePrice();
}

let priceChartInstance=null;
function updatePrice(){
  const sel=document.getElementById('priceBoothSelect');
  if(!sel) return;
  const b=BOOTH_DATA.find(x=>x.number===sel.value)||BOOTH_DATA[0];
  const aiCoeff=(1+Math.random()*0.3).toFixed(2);
  const supplyCoeff=(1+Math.random()*0.15).toFixed(2);
  const discount=Math.round(5+Math.random()*15);
  const timeCoeff=(1+Math.random()*0.05).toFixed(2);
  const finalPrice=Math.round(b.basePrice*aiCoeff*supplyCoeff*(1-discount/100)*timeCoeff);
  const bd=document.getElementById('priceBreakdown');
  if(!bd) return;
  bd.innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:14px;color:var(--gray-600);">基础价格</span><span style="font-weight:600;">¥${b.basePrice.toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:14px;color:var(--gray-600);">AI价值系数</span><span style="font-weight:600;">×${aiCoeff} <span class="badge badge-green" style="margin-left:4px;">高</span></span></div>
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:14px;color:var(--gray-600);">供需关系系数</span><span style="font-weight:600;">×${supplyCoeff} <span class="badge badge-green" style="margin-left:4px;">高</span></span></div>
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:14px;color:var(--gray-600);">客户权益折扣</span><span style="font-weight:600;color:var(--green);">-${discount}%</span></div>
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:14px;color:var(--gray-600);">时段浮动系数</span><span style="font-weight:600;">×${timeCoeff} <span class="badge badge-yellow" style="margin-left:4px;">中</span></span></div>
    <div style="display:flex;justify-content:space-between;padding:16px 0;border-top:2px solid var(--gray-200);margin-top:8px;"><span style="font-size:16px;font-weight:700;color:var(--gray-800);">最终价格</span><span style="font-size:22px;font-weight:800;color:var(--cyan);">¥${finalPrice.toLocaleString()}</span></div>`;
  // Chart
  const ctx=document.getElementById('priceChart');
  if(!ctx) return;
  if(priceChartInstance) priceChartInstance.destroy();
  const labels=[];const data=[];
  for(let h=0;h<24;h++){labels.push(h+'时');data.push(finalPrice+Math.round((Math.random()-0.5)*800));}
  priceChartInstance=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'实时价格',data,backgroundColor:'rgba(0,163,224,0.1)',borderColor:'#00A3E0',borderWidth:2,fill:true,tension:0.4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false}}}});
}

function renderQuotes(c){
  const myQuotes=QUOTES_DATA;
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📄 我的报价 / 预约</h1><p class="page-desc">查看和管理您的报价单与预约记录</p></div>
  <div class="tabs">
    <button class="tab active" onclick="switchQuoteTab('quotes',this)">我的报价单</button>
    <button class="tab" onclick="switchQuoteTab('bookings',this)">我的预约</button>
  </div>
  <div id="quoteTab_quotes">
    ${myQuotes.map(q=>{
      const smap={pending:['待确认','badge-yellow'],confirmed:['已确认','badge-green'],expired:['已过期','badge-red']};
      const [sl,sc]=smap[q.status]||['未知','badge-gray'];
      const actions=q.status==='pending'?'<button class="btn btn-primary btn-sm"><i class="fas fa-check"></i> 确认预约</button><button class="btn btn-outline btn-sm"><i class="fas fa-file-pdf"></i> 查看PDF</button>':q.status==='confirmed'?'<span class="badge badge-green">已预约</span><button class="btn btn-outline btn-sm"><i class="fas fa-eye"></i> 查看详情</button>':'<button class="btn btn-outline btn-sm"><i class="fas fa-redo"></i> 重新询价</button>';
      const priceStyle=q.status==='expired'?'text-decoration:line-through;color:var(--gray-400)':'';
      return `<div class="quote-card"><div class="quote-card-header"><span class="quote-card-id">报价单 #QT-2026-${String(q.id).padStart(3,'0')}</span><span class="badge ${sc}">${sl}</span></div><div class="quote-card-body"><div class="quote-card-field"><span class="quote-card-field-label">展位编号</span><span class="quote-card-field-value">${q.booth}</span></div><div class="quote-card-field"><span class="quote-card-field-label">等级</span><span class="quote-card-field-value">${levelNames[q.level]||q.level}</span></div><div class="quote-card-field"><span class="quote-card-field-label">面积</span><span class="quote-card-field-value">${q.level==='S'?'36':q.level==='A'?'18':'9'} m²</span></div><div class="quote-card-field"><span class="quote-card-field-label">生成日期</span><span class="quote-card-field-value">${q.date}</span></div></div><div class="quote-card-footer"><span class="quote-card-total" style="${priceStyle}">¥${q.price.toLocaleString()}</span><div class="quote-card-actions">${actions}</div></div></div>`;
    }).join('')}
  </div>
  <div id="quoteTab_bookings" style="display:none;">
    <div class="quote-card"><div class="quote-card-header"><span class="quote-card-id">预约 #BK-2026-001</span><span class="badge badge-green">已确认</span></div><div class="quote-card-body"><div class="quote-card-field"><span class="quote-card-field-label">展位编号</span><span class="quote-card-field-value">A-005</span></div><div class="quote-card-field"><span class="quote-card-field-label">预约时间</span><span class="quote-card-field-value">2026-06-25 14:00</span></div><div class="quote-card-field"><span class="quote-card-field-label">金额</span><span class="quote-card-field-value">¥25,800</span></div></div><div class="quote-card-footer"><span class="quote-card-total">¥25,800</span><button class="btn btn-danger btn-sm"><i class="fas fa-times"></i> 取消预约</button></div></div>
    <div class="quote-card"><div class="quote-card-header"><span class="quote-card-id">预约 #BK-2026-002</span><span class="badge badge-yellow">待确认</span></div><div class="quote-card-body"><div class="quote-card-field"><span class="quote-card-field-label">展位编号</span><span class="quote-card-field-value">B-022</span></div><div class="quote-card-field"><span class="quote-card-field-label">预约时间</span><span class="quote-card-field-value">2026-07-01 10:00</span></div><div class="quote-card-field"><span class="quote-card-field-label">金额</span><span class="quote-card-field-value">¥14,200</span></div></div><div class="quote-card-footer"><span class="quote-card-total">¥14,200</span><button class="btn btn-danger btn-sm"><i class="fas fa-times"></i> 取消预约</button></div></div>
  </div>`;
}

function switchQuoteTab(tab,btn){
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('quoteTab_quotes').style.display=tab==='quotes'?'block':'none';
  document.getElementById('quoteTab_bookings').style.display=tab==='bookings'?'block':'none';
}

// ============================================================
// STAFF RENDER FUNCTIONS
// ============================================================

function renderStaffDashboard(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📊 运营数据看板</h1><p class="page-desc">实时查看系统运营核心指标</p></div>
  <div class="kpi-grid">
    <div class="kpi-card cyan"><div class="kpi-header"><span class="kpi-label">总展位数</span><div class="kpi-icon cyan">🏪</div></div><div class="kpi-value">160</div><span class="kpi-change up">↑ 稳定</span></div>
    <div class="kpi-card gold"><div class="kpi-header"><span class="kpi-label">空置率</span><div class="kpi-icon gold">📉</div></div><div class="kpi-value">23.8%</div><span class="kpi-change down">↓ 2.1%</span></div>
    <div class="kpi-card green"><div class="kpi-header"><span class="kpi-label">推荐成交率</span><div class="kpi-icon green">📈</div></div><div class="kpi-value">67.5%</div><span class="kpi-change up">↑ 5.3%</span></div>
    <div class="kpi-card purple"><div class="kpi-header"><span class="kpi-label">溢价收益</span><div class="kpi-icon purple">💰</div></div><div class="kpi-value">¥186,200</div><span class="kpi-change up">↑ 12.8%</span></div>
  </div>
  <div class="chart-grid">
    <div class="card"><div class="card-header"><div class="card-title">展位等级分布</div></div><div class="card-body"><div class="chart-body"><canvas id="levelDistChart"></canvas></div></div></div>
    <div class="card"><div class="card-header"><div class="card-title">展位状态分布</div></div><div class="card-body"><div class="chart-body"><canvas id="statusDistChart"></canvas></div></div></div>
  </div>
  <div class="card"><div class="card-header"><div class="card-title">热门展位 TOP 10</div></div><div class="card-body" style="overflow-x:auto;">
    <table class="data-table"><thead><tr><th>排名</th><th>展位编号</th><th>等级</th><th>浏览量</th><th>预约次数</th><th>热度指数</th></tr></thead><tbody>
    ${[1,2,3,4,5,6,7,8,9,10].map(i=>`<tr><td><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${i<=3?'var(--gold)':'var(--gray-200)'};color:${i<=3?'var(--navy-dark)':'var(--gray-600)'};font-size:12px;font-weight:700;">${i}</span></td><td>A-${String(i*5).padStart(3,'0')}</td><td><span class="badge badge-cyan">A优选</span></td><td>${Math.round(100+Math.random()*200)}</td><td>${Math.round(5+Math.random()*15)}</td><td><div style="display:flex;align-items:center;gap:6px;"><div style="width:60px;height:5px;border-radius:3px;background:var(--gray-200);overflow:hidden;"><div style="height:100%;width:${Math.round(60+Math.random()*40)}%;border-radius:3px;background:var(--cyan);"></div></div></div></td></tr>`).join('')}
    </tbody></table>
  </div></div>`;
  // Charts
  setTimeout(()=>{
    const lc=document.getElementById('levelDistChart');
    if(lc) new Chart(lc,{type:'bar',data:{labels:['S级旗舰','A级优选','B级标准','C级基础'],datasets:[{label:'数量',data:[12,36,80,32],backgroundColor:['rgba(201,168,76,0.7)','rgba(0,163,224,0.7)','rgba(16,185,129,0.7)','rgba(156,163,175,0.7)'],borderColor:['#C9A84C','#00A3E0','#10B981','#9CA3AF'],borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    const sc=document.getElementById('statusDistChart');
    if(sc) new Chart(sc,{type:'doughnut',data:{labels:['可订','AI推荐','锁定','已售'],datasets:[{data:[42,18,15,25],backgroundColor:['#10B981','#00A3E0','#F59E0B','#9CA3AF'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  },100);
}

function renderStaffLeads(c){
  const statusMap={new:['新线索','badge-yellow'],negotiating:['洽谈中','badge-cyan'],quoted:['已报价','badge-purple'],booked:['已预约','badge-green']};
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">👥 客户线索管理</h1><p class="page-desc">查看和跟进所有客户提交的参展需求</p></div>
  <div class="filter-bar">
    <span class="filter-bar-label">筛选：</span>
    <select class="filter-select"><option>全部行业</option><option>信息技术</option><option>医疗健康</option><option>新能源</option><option>智能制造</option><option>消费品</option></select>
    <select class="filter-select"><option>全部状态</option><option>新线索</option><option>洽谈中</option><option>已报价</option><option>已预约</option></select>
    <input class="filter-search" placeholder="搜索客户名称...">
    <button class="btn btn-outline btn-sm" onclick="showToast('筛选已重置','info')"><i class="fas fa-redo"></i> 重置</button>
  </div>
  <div class="table-wrapper">
    <table class="data-table"><thead><tr><th>客户名称</th><th>所属行业</th><th>预算范围</th><th>提交日期</th><th>状态</th><th>联系人</th><th>操作</th></tr></thead><tbody>
    ${LEADS_DATA.map(l=>{
      const [sl,sc]=statusMap[l.status]||['未知','badge-gray'];
      return `<tr><td><strong>${l.company}</strong></td><td>${l.industry}</td><td>${l.budget}</td><td>${l.date}</td><td><span class="badge ${sc}">${sl}</span></td><td>${l.contact}</td><td><div style="display:flex;gap:4px;"><button class="btn btn-outline btn-sm"><i class="fas fa-eye"></i> 查看</button><button class="btn btn-primary btn-sm"><i class="fas fa-phone"></i> 跟进</button></div></td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`;
}

function renderStaffBooths(c){
  const sample=BOOTH_DATA.slice(0,20);
  const statusMap={available:['可订','badge-green'],recommended:['AI推荐','badge-cyan'],locked:['锁定','badge-yellow'],sold:['已售','badge-gray']};
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">🏗️ 展位资源管理</h1><p class="page-desc">管理和编辑所有展位资源信息</p></div>
  <div class="filter-bar">
    <span class="filter-bar-label">筛选：</span>
    <select class="filter-select"><option>全部等级</option><option>S级</option><option>A级</option><option>B级</option><option>C级</option></select>
    <select class="filter-select"><option>全部状态</option><option>可订</option><option>AI推荐</option><option>锁定</option><option>已售</option></select>
    <input class="filter-search" placeholder="搜索展位编号...">
    <button class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 新增展位</button>
  </div>
  <div class="table-wrapper">
    <table class="data-table"><thead><tr><th>展位编号</th><th>等级</th><th>面积</th><th>基础价格</th><th>动态价格</th><th>状态</th><th>操作</th></tr></thead><tbody>
    ${sample.map(b=>{
      const [sl,sc]=statusMap[b.status]||['未知','badge-gray'];
      const lvlCls=b.level==='S'?'badge-gold':b.level==='A'?'badge-cyan':b.level==='B'?'badge-green':'badge-gray';
      const actions=b.status==='sold'?`<button class="btn btn-outline btn-sm">查看</button>`:`<div style="display:flex;gap:4px;"><button class="btn btn-outline btn-sm">编辑</button><button class="btn btn-primary btn-sm">${b.status==='locked'?'解锁':'锁定'}</button></div>`;
      return `<tr><td><strong>${b.number}</strong></td><td><span class="badge ${lvlCls}">${b.levelName}</span></td><td>${b.area}m²</td><td>¥${b.basePrice.toLocaleString()}</td><td>¥${b.dynamicPrice.toLocaleString()}</td><td><span class="badge ${sc}">${sl}</span></td><td>${actions}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`;
}

function renderStaffAIConfig(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">🧠 AI模型参数配置</h1><p class="page-desc">调整AI模型的权重参数将影响推荐结果和定价策略</p></div>
  <div style="background:linear-gradient(135deg,rgba(0,163,224,0.06),rgba(0,163,224,0.02));border:1px solid rgba(0,163,224,0.15);border-radius:var(--radius-lg);padding:16px 24px;margin-bottom:24px;"><i class="fas fa-info-circle" style="color:var(--cyan);margin-right:8px;"></i>修改后实时生效，建议谨慎调整</div>
  <div class="card"><div class="card-header"><div class="card-title">权重参数</div><span style="font-size:13px;color:var(--gray-500);" id="weightTotal">权重合计：100%</span></div><div class="card-body">
    <div class="slider-config"><div class="slider-header"><span class="slider-label">📍 位置权重</span><span class="slider-value" id="w1Val">35%</span></div><input type="range" min="0" max="100" value="35" oninput="updateWeights()" style="width:100%;"><div class="slider-range"><span>0%</span><span>100%</span></div></div>
    <div class="slider-config"><div class="slider-header"><span class="slider-label">📐 面积权重</span><span class="slider-value" id="w2Val">25%</span></div><input type="range" min="0" max="100" value="25" oninput="updateWeights()" style="width:100%;"><div class="slider-range"><span>0%</span><span>100%</span></div></div>
    <div class="slider-config"><div class="slider-header"><span class="slider-label">👥 流量权重</span><span class="slider-value" id="w3Val">22%</span></div><input type="range" min="0" max="100" value="22" oninput="updateWeights()" style="width:100%;"><div class="slider-range"><span>0%</span><span>100%</span></div></div>
    <div class="slider-config"><div class="slider-header"><span class="slider-label">🏗️ 配套权重</span><span class="slider-value" id="w4Val">18%</span></div><input type="range" min="0" max="100" value="18" oninput="updateWeights()" style="width:100%;"><div class="slider-range"><span>0%</span><span>100%</span></div></div>
  </div></div>
  <div class="card"><div class="card-header"><div class="card-title">参数设置</div></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">最高溢价上限</label><input class="form-input" type="number" value="50" min="0" max="100"><div class="form-hint">百分比，默认50%</div></div>
      <div class="form-group"><label class="form-label">最低折扣下限</label><input class="form-input" type="number" value="15" min="0" max="100"><div class="form-hint">百分比，默认15%</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">推荐方案数量</label><select class="form-select"><option>3</option><option>5</option><option>10</option></select></div>
      <div class="form-group"><label class="form-label">AI自动优化</label><div style="padding:10px 0;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--cyan);width:18px;height:18px;"> 开启自动学习优化</label></div></div>
    </div>
  </div></div>
  <div style="display:flex;gap:12px;margin-top:20px;">
    <button class="btn btn-primary" onclick="showToast('配置已保存成功！','success')"><i class="fas fa-save"></i> 保存配置</button>
    <button class="btn btn-outline" onclick="showToast('已恢复默认配置','info')"><i class="fas fa-undo"></i> 恢复默认</button>
  </div>`;
}

function updateWeights(){
  const sliders=document.querySelectorAll('#staffMain input[type="range"]');
  let total=0;
  sliders.forEach((s,i)=>{
    document.getElementById('w'+(i+1)+'Val').textContent=s.value+'%';
    total+=parseInt(s.value);
  });
  const el=document.getElementById('weightTotal');
  if(el){el.textContent='权重合计：'+total+'%';el.style.color=total===100?'var(--green)':'var(--red)';}
}

function renderStaffPricing(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">💲 动态定价规则管理</h1><p class="page-desc">配置定价公式、阶梯折扣与客户权益系数</p></div>
  <div class="card"><div class="card-header"><div class="card-title">基础定价公式</div></div><div class="card-body">
    <div style="padding:16px;background:var(--gray-50);border-radius:var(--radius-sm);margin-bottom:16px;font-family:monospace;font-size:14px;color:var(--navy);">最终价格 = 基础价格 × (1 + AI价值系数) × (1 + 供需系数) × (1 - 权益折扣) × (1 + 时段浮动)</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">基础价倍率范围</label><div style="display:flex;gap:8px;"><input class="form-input" type="number" value="1.0" step="0.1" style="width:80px;"><span style="line-height:40px;color:var(--gray-400);">~</span><input class="form-input" type="number" value="2.0" step="0.1" style="width:80px;"></div></div>
      <div class="form-group"><label class="form-label">AI价值系数范围</label><div style="display:flex;gap:8px;"><input class="form-input" type="number" value="0.8" step="0.1" style="width:80px;"><span style="line-height:40px;color:var(--gray-400);">~</span><input class="form-input" type="number" value="1.5" step="0.1" style="width:80px;"></div></div>
    </div>
  </div></div>
  <div class="card"><div class="card-header"><div class="card-title">阶梯折扣模板</div></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">早鸟折扣 - 提前30天</label><input class="form-input" type="text" value="9折"></div>
      <div class="form-group"><label class="form-label">早鸟折扣 - 提前60天</label><input class="form-input" type="text" value="85折"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">早鸟折扣 - 提前90天</label><input class="form-input" type="text" value="8折"></div>
      <div class="form-group"><label class="form-label">批量折扣 - 2个以上</label><input class="form-input" type="text" value="95折"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">批量折扣 - 5个以上</label><input class="form-input" type="text" value="9折"></div>
    </div>
  </div></div>
  <div class="card"><div class="card-header"><div class="card-title">客户权益系数</div></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label class="form-label">老客户系数</label><input class="form-input" type="number" value="0.95" step="0.01"></div>
      <div class="form-group"><label class="form-label">VIP客户系数</label><input class="form-input" type="number" value="0.88" step="0.01"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">战略合作系数</label><input class="form-input" type="number" value="0.82" step="0.01"></div>
      <div class="form-group"><label class="form-label">新客户系数</label><input class="form-input" type="number" value="1.0" step="0.01"></div>
    </div>
  </div></div>
  <div style="display:flex;gap:12px;margin-top:20px;">
    <button class="btn btn-primary" onclick="showToast('定价规则已保存！','success')"><i class="fas fa-save"></i> 保存全部</button>
  </div>`;
}

function renderStaffOrders(c){
  const orders=[
    {id:'ORD-001',company:'上海数码科技',booth:'A-005',price:25800,status:'completed',date:'2026-06-18'},
    {id:'ORD-002',company:'北京创新医疗',booth:'S-001',price:45600,status:'processing',date:'2026-06-17'},
    {id:'ORD-003',company:'深圳绿色能源',booth:'B-022',price:14200,status:'pending',date:'2026-06-16'},
    {id:'ORD-004',company:'杭州智造科技',booth:'A-012',price:24200,status:'processing',date:'2026-06-15'},
    {id:'ORD-005',company:'广州时尚品牌',booth:'C-015',price:7900,status:'completed',date:'2026-06-14'},
  ];
  const smap={completed:['已完成','badge-green'],processing:['处理中','badge-cyan'],pending:['待付款','badge-yellow']};
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📋 订单管理</h1><p class="page-desc">查看和管理所有展位订单</p></div>
  <div class="filter-bar">
    <select class="filter-select"><option>全部状态</option><option>已完成</option><option>处理中</option><option>待付款</option></select>
    <input class="filter-search" placeholder="搜索订单编号或客户...">
    <button class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 新建订单</button>
  </div>
  <div class="table-wrapper">
    <table class="data-table"><thead><tr><th>订单编号</th><th>客户名称</th><th>展位编号</th><th>金额</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>
    ${orders.map(o=>{
      const [sl,sc]=smap[o.status]||['未知','badge-gray'];
      const extra=o.status==='processing'?'<button class="btn btn-primary btn-sm" style="margin-left:4px;">审核</button>':'';
      const pendingExtra=o.status==='pending'?'<button class="btn btn-outline btn-sm" style="margin-left:4px;color:var(--red);border-color:var(--red);">催款</button>':'';
      return `<tr><td>${o.id}</td><td>${o.company}</td><td>${o.booth}</td><td>¥${o.price.toLocaleString()}</td><td><span class="badge ${sc}">${sl}</span></td><td>${o.date}</td><td><button class="btn btn-outline btn-sm">查看</button>${extra}${pendingExtra}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`;
}

function renderStaffReports(c){
  c.innerHTML=`
  <div class="page-header"><h1 class="page-title">📈 数据报表</h1><p class="page-desc">查看系统运营数据统计与分析</p></div>
  <div style="display:flex;gap:12px;justify-content:flex-end;margin-bottom:24px;">
    <button class="btn btn-gold" onclick="showToast('Excel报表导出成功！','success')"><i class="fas fa-file-excel"></i> 导出Excel报表</button>
    <button class="btn btn-outline" onclick="showToast('PDF报表导出成功！','success')"><i class="fas fa-file-pdf"></i> 导出PDF</button>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card cyan"><div class="kpi-header"><span class="kpi-label">总成交额</span></div><div class="kpi-value">¥117,700</div></div>
    <div class="kpi-card gold"><div class="kpi-header"><span class="kpi-label">总订单数</span></div><div class="kpi-value">5</div></div>
    <div class="kpi-card green"><div class="kpi-header"><span class="kpi-label">平均客单价</span></div><div class="kpi-value">¥23,540</div></div>
    <div class="kpi-card purple"><div class="kpi-header"><span class="kpi-label">AI转化率</span></div><div class="kpi-value">67.5%</div></div>
  </div>
  <div class="chart-grid">
    <div class="card"><div class="card-header"><div class="card-title">月度成交趋势</div></div><div class="card-body"><div class="chart-body"><canvas id="monthlyChart"></canvas></div></div></div>
    <div class="card"><div class="card-header"><div class="card-title">展位等级分布</div></div><div class="card-body"><div class="chart-body"><canvas id="levelReportChart"></canvas></div></div></div>
  </div>`;
  setTimeout(()=>{
    const mc=document.getElementById('monthlyChart');
    if(mc) new Chart(mc,{type:'bar',data:{labels:['1月','2月','3月','4月','5月','6月'],datasets:[{label:'成交额(万元)',data:[0,0,0,0,4.56,7.21],backgroundColor:'rgba(0,163,224,0.7)',borderColor:'#00A3E0',borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    const rc=document.getElementById('levelReportChart');
    if(rc) new Chart(rc,{type:'pie',data:{labels:['S级旗舰','A级优选','B级标准','C级基础'],datasets:[{data:[20,40,30,10],backgroundColor:['#C9A84C','#00A3E0','#10B981','#9CA3AF'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  },100);
}

// ============================================================
// INITIALIZATION
// ============================================================
(function init(){
  // Navbar scroll effect for landing
  window.addEventListener('scroll',function(){
    const nav=document.querySelector('#view-landing .navbar');
    if(nav) nav.classList.toggle('scrolled',window.scrollY>50);
  });
  // Generate particles for landing
  const pc=document.getElementById('particles');
  if(pc){
    for(let i=0;i<30;i++){
      const p=document.createElement('div');
      p.className='particle';
      p.style.left=Math.random()*100+'%';
      p.style.animationDuration=(8+Math.random()*12)+'s';
      p.style.animationDelay=Math.random()*10+'s';
      p.style.width=p.style.height=(2+Math.random()*3)+'px';
      pc.appendChild(p);
    }
  }
  // Counter animation for stats section
  const statsSection=document.querySelector('.stats');
  let counterAnimated=false;
  if(statsSection){
    const observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting&&!counterAnimated){
          counterAnimated=true;
          document.querySelectorAll('.stat-number').forEach(function(counter){
            const target=parseInt(counter.dataset.target);
            const duration=2000;
            const start=performance.now();
            function update(now){
              const elapsed=now-start;
              const progress=Math.min(elapsed/duration,1);
              const eased=1-Math.pow(1-progress,3);
              counter.textContent=Math.floor(eased*target);
              if(progress<1) requestAnimationFrame(update);
              else counter.textContent=target;
            }
            requestAnimationFrame(update);
          });
        }
      });
    },{threshold:0.3});
    observer.observe(statsSection);
  }
  // Smooth scroll for nav links
  document.querySelectorAll('#view-landing a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      const target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
  // Responsive sidebar toggle
  function checkResponsive(){
    const w=window.innerWidth;
    const cm=document.getElementById('clientMenuToggle');
    const sm=document.getElementById('staffMenuToggle');
    if(cm) cm.style.display=w<=768?'flex':'none';
    if(sm) sm.style.display=w<=768?'flex':'none';
  }
  checkResponsive();
  window.addEventListener('resize',checkResponsive);
})();
''';

# ===== MAIN ENTRY POINT =====
output = build_html(landing, css, page_contents)
with open(os.path.join(BASE, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(output)
print(f"Done! index.html = {len(output)} bytes ({len(output)//1024}KB)")