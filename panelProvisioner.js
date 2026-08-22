
const PANEL_URL=String(process.env.PANEL_URL||"").replace(/\/+$/,"");
const PANEL_ENABLED=String(process.env.PANEL_ENABLED||"false").toLowerCase()==="true";
const PANEL_API_KEY=process.env.PANEL_API_KEY||"";
const PANEL_NEST_ID=Number(process.env.PANEL_NEST_ID||0);
const PANEL_EGG_ID=Number(process.env.PANEL_EGG_ID||0);
const PANEL_LOCATION_ID=Number(process.env.PANEL_LOCATION_ID||0);
const PANEL_EMAIL_DOMAIN=process.env.PANEL_EMAIL_DOMAIN||"clients.example.com";
const PANEL_DOCKER_IMAGE=process.env.PANEL_DOCKER_IMAGE||"";
const PANEL_STARTUP=process.env.PANEL_STARTUP||"";
const PANEL_MEMORY_MB=Number(process.env.PANEL_MEMORY_MB||1024);
const PANEL_DISK_MB=Number(process.env.PANEL_DISK_MB||5120);
const PANEL_CPU=Number(process.env.PANEL_CPU||100);
const PANEL_SWAP_MB=Number(process.env.PANEL_SWAP_MB||0);
const PANEL_IO=Number(process.env.PANEL_IO||500);
const PANEL_DATABASE_LIMIT=Number(process.env.PANEL_DATABASE_LIMIT||1);
const PANEL_ALLOCATION_LIMIT=Number(process.env.PANEL_ALLOCATION_LIMIT||1);
const PANEL_BACKUP_LIMIT=Number(process.env.PANEL_BACKUP_LIMIT||0);
const PANEL_SERVER_PREFIX=process.env.PANEL_SERVER_PREFIX||"Al-Shamil";
const PANEL_PORT_RANGE=(process.env.PANEL_PORT_RANGE||"").trim();
const PANEL_ENVIRONMENT=process.env.PANEL_ENVIRONMENT_JSON||"{}";

function configured(){
  return PANEL_ENABLED && Boolean(PANEL_URL && PANEL_API_KEY && PANEL_EGG_ID && PANEL_LOCATION_ID) && !PANEL_URL.includes("panel.example.com");
}
function headers(){
  return {
    "Authorization":"Bearer "+PANEL_API_KEY,
    "Accept":"Application/vnd.pterodactyl.v1+json",
    "Content-Type":"application/json"
  };
}
async function api(path,options={}){
  if(!configured()) throw new Error("PANEL_NOT_CONFIGURED");
  const res=await fetch(PANEL_URL+path,{...options,headers:{...headers(),...(options.headers||{})}});
  const text=await res.text();
  let body=null; try{body=text?JSON.parse(text):null}catch{}
  if(!res.ok){
    const msg=body?.errors?.[0]?.detail || body?.message || `PANEL_HTTP_${res.status}`;
    const err=new Error(msg);err.panelStatus=res.status;err.panelBody=body;throw err;
  }
  return body;
}
function names(full){
  const parts=String(full||"العميل").trim().split(/\s+/).filter(Boolean);
  return {first:parts[0]||"Client",last:parts.slice(1).join(" ")||"Customer"};
}
function username(ticketNo){
  return ("sh_"+String(ticketNo).toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20)+"_"+Math.random().toString(36).slice(2,7)).slice(0,32);
}
function password(){
  return cryptoRandom(18);
}
function cryptoRandom(n){ const {randomBytes}=require("crypto"); return randomBytes(n).toString("base64url").slice(0,n)+"A1!"; }
async function findOrCreateUser(winner){
  const external="shamil-"+winner.id;
  try{
    const existing=await api("/api/application/users/external/"+encodeURIComponent(external));
    if(existing?.attributes?.id) return {id:existing.attributes.id,created:false,username:existing.attributes.username};
  }catch(e){
    if(e.panelStatus!==404) throw e;
  }
  const n=names(winner.name), email=`${winner.id.slice(0,8)}@${PANEL_EMAIL_DOMAIN}`, user=username(winner.ticket_no);
  const pass=password();
  const body={email,username:user,first_name:n.first,last_name:n.last,password:pass,language:"en",root_admin:false,external_id:external};
  const created=await api("/api/application/users",{method:"POST",body:JSON.stringify(body)});
  return {id:created.attributes.id,created:true,username:user,email,password:pass};
}
async function findExistingServer(external){
  try{
    const r=await api("/api/application/servers/external/"+encodeURIComponent(external));
    if(r?.attributes) return r.attributes;
  }catch(e){if(e.panelStatus!==404)throw e}
  return null;
}
async function provisionWinner(winner){
  if(!configured()) throw new Error("PANEL_NOT_CONFIGURED");
  const external="shamil-"+winner.id;
  const existing=await findExistingServer(external);
  if(existing){
    return {server:existing,userId:existing.user,createdServer:false,credentials:null};
  }
  const u=await findOrCreateUser(winner);
  let environment={};
  try{environment=JSON.parse(PANEL_ENVIRONMENT)}catch{throw new Error("PANEL_ENVIRONMENT_JSON_INVALID")}
  const deploy={locations:[PANEL_LOCATION_ID],dedicated_ip:false,port_range:PANEL_PORT_RANGE?PANEL_PORT_RANGE.split(",").map(x=>x.trim()).filter(Boolean):[]};
  const payload={
    external_id:external,
    name:`${PANEL_SERVER_PREFIX} - ${winner.name}`,
    description:`Winner ${winner.ticket_no} · ${winner.prize_type}`,
    user:u.id,
    egg:PANEL_EGG_ID,
    docker_image:PANEL_DOCKER_IMAGE||undefined,
    startup:PANEL_STARTUP||undefined,
    environment,
    limits:{memory:PANEL_MEMORY_MB,swap:PANEL_SWAP_MB,disk:PANEL_DISK_MB,io:PANEL_IO,cpu:PANEL_CPU},
    feature_limits:{databases:PANEL_DATABASE_LIMIT,allocations:PANEL_ALLOCATION_LIMIT,backups:PANEL_BACKUP_LIMIT},
    deploy,
    start_on_completion:true,
    skip_scripts:false,
    oom_disabled:true
  };
  const server=await api("/api/application/servers",{method:"POST",body:JSON.stringify(payload)});
  return {server:server.attributes,userId:u.id,createdServer:true,credentials:u.created?{username:u.username,email:u.email,password:u.password}:null};
}
module.exports={configured,provisionWinner};
