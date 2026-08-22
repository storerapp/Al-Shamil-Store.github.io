
const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const path = require("path");
const {provisionWinner,configured:panelConfigured}=require("./panelProvisioner");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PANEL_URL_PUBLIC=String(process.env.PANEL_PUBLIC_URL||process.env.PANEL_URL||"").replace(/\/+$/,'');

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!ADMIN_KEY) throw new Error("ADMIN_KEY is required");

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "50kb" }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

function uid(){ return crypto.randomUUID(); }
function ticketNo(){ return "SH-" + crypto.randomBytes(4).toString("hex").toUpperCase() + "-" + crypto.randomInt(1000,10000); }
function prizeCode(){ return "KZ-" + crypto.randomBytes(5).toString("hex").toUpperCase(); }
function validName(x){ return String(x||"").trim().split(/\s+/).filter(Boolean).length >= 3; }
function validPhone(x){ return /^(07\d{9}|\+964\d{10}|00964\d{10}|\d{8,15})$/.test(String(x||"").replace(/[\s()-]/g,"")); }
function admin(req,res,next){
  if(req.get("x-admin-key") !== ADMIN_KEY) return res.status(401).json({ok:false,error:"UNAUTHORIZED"});
  next();
}
async function withTx(fn){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const result=await fn(client);
    await client.query("COMMIT");
    return result;
  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{client.release();}
}

app.get("/version",(req,res)=>res.json({name:"Al-Shamil Vault",version:"2.2.0"}));

app.get("/health", async (req,res)=>{
  try{
    const r=await pool.query("SELECT 1 AS ok");
    res.json({ok:r.rows[0].ok===1,status:"ONLINE",database:"CONNECTED"});
  }catch{
    res.status(503).json({ok:false,status:"DEGRADED",database:"DISCONNECTED"});
  }
});

/* Ticket issuance */
app.post("/api/tickets", async (req,res)=>{
  const name=String(req.body?.name||"").trim();
  const phone=String(req.body?.phone||"").trim();
  if(!validName(name)) return res.status(400).json({ok:false,error:"FULL_NAME_REQUIRED"});
  if(!validPhone(phone)) return res.status(400).json({ok:false,error:"PHONE_INVALID"});
  try{
    const existing=await pool.query(
      "SELECT id,ticket_no,name,phone,status,drawn,created_at FROM tickets WHERE phone=$1 AND status='active' AND drawn=false ORDER BY created_at DESC LIMIT 1",
      [phone]
    );
    if(existing.rows[0]) return res.json({ok:true,ticket:existing.rows[0],reused:true});
    const t={id:uid(),ticketNo:ticketNo()};
    const r=await pool.query(
      "INSERT INTO tickets(id,ticket_no,name,phone) VALUES($1,$2,$3,$4) RETURNING id,ticket_no,name,phone,status,drawn,created_at",
      [t.id,t.ticketNo,name,phone]
    );
    res.status(201).json({ok:true,ticket:r.rows[0],reused:false});
  }catch(e){
    console.error(e);
    res.status(500).json({ok:false,error:"TICKET_CREATE_FAILED"});
  }
});

app.get("/api/tickets/:ticketNo", async (req,res)=>{
  const r=await pool.query("SELECT ticket_no,name,status,drawn,created_at FROM tickets WHERE ticket_no=$1",[req.params.ticketNo]);
  if(!r.rows[0]) return res.status(404).json({ok:false,error:"TICKET_NOT_FOUND"});
  res.json({ok:true,ticket:r.rows[0]});
});

/* Random draw + stock decrement + winner creation in ONE DB transaction.
   Inventory rows are locked FOR UPDATE before the random selection. */
app.post("/api/draw", async (req,res)=>{
  const ticket=String(req.body?.ticketNo||"").trim();
  if(!ticket) return res.status(400).json({ok:false,error:"TICKET_REQUIRED"});
  try{
    const result=await withTx(async(client)=>{
      const tr=await client.query(
        "SELECT * FROM tickets WHERE ticket_no=$1 FOR UPDATE",
        [ticket]
      );
      if(!tr.rows[0]){ const e=new Error("TICKET_NOT_FOUND");e.code=404;throw e; }
      const t=tr.rows[0];
      if(t.status!=="active" || t.drawn){ const e=new Error("TICKET_ALREADY_USED");e.code=409;throw e; }

      const inv=await client.query(
        "SELECT * FROM inventory WHERE available>0 AND type IN ('12 شهرًا','6 أشهر','3 أشهر') ORDER BY type FOR UPDATE"
      );
      if(!inv.rows.length){ const e=new Error("NO_PRIZES_AVAILABLE");e.code=409;throw e; }

      const total=inv.rows.reduce((sum,x)=>sum+Number(x.available),0);
      let pick=crypto.randomInt(1,total+1), selected=inv.rows[inv.rows.length-1];
      for(const row of inv.rows){ pick-=Number(row.available); if(pick<=0){ selected=row; break; } }

      await client.query(
        "UPDATE inventory SET available=available-1,assigned=assigned+1 WHERE id=$1",
        [selected.id]
      );

      const winId=uid(), code=prizeCode(), now=new Date();
      const winner=await client.query(
        `INSERT INTO winners
         (id,name,phone,prize,prize_type,code,status,draw_method,ticket_no,inventory_id,notes,created_at)
         VALUES($1,$2,$3,$4,$5,$6,'pending','server-random',$7,$8,$9,NOW())
         RETURNING *`,
        [winId,t.name,t.phone,`سيرفر مجاني لمدة ${selected.type}`,selected.type,code,t.ticket_no,selected.id,"تم السحب من مخزون PostgreSQL"]
      );

      await client.query(
        "UPDATE tickets SET drawn=true,draw_at=NOW(),winner_id=$1,status='used' WHERE ticket_no=$2",
        [winId,t.ticket_no]
      );

      await client.query(
        "INSERT INTO draws(id,winner_id,ticket_no,inventory_id,prize_type,method,created_at) VALUES($1,$2,$3,$4,$5,$6,NOW())",
        [uid(),winId,t.ticket_no,selected.id,selected.type,"weighted-by-available-stock"]
      );
      await client.query(
        "INSERT INTO provision_jobs(id,winner_id) VALUES($1,$2) ON CONFLICT(winner_id) DO NOTHING",
        [uid(),winId]
      );

      return {
        winner:winner.rows[0],
        ticket:{ticketNo:t.ticket_no,status:"used"},
        inventory:{id:selected.id,type:selected.type,available:Number(selected.available)-1,assigned:Number(selected.assigned)+1}
      };
    });
    res.status(201).json({ok:true,...result});
  }catch(e){
    const status=e.code===404||e.code===409?e.code:500;
    console.error(e);
    res.status(status).json({ok:false,error:e.message||"DRAW_FAILED"});
  }
});

app.get("/api/admin/provisioning",admin,async(req,res)=>{
 const [jobs,w]=await Promise.all([
  pool.query("SELECT * FROM provision_jobs ORDER BY created_at DESC"),
  pool.query("SELECT id,name,phone,prize,code,panel_status,panel_server_id,panel_identifier,panel_url,panel_error FROM winners ORDER BY created_at DESC")
 ]);
 res.json({ok:true,configured:panelConfigured(),jobs:jobs.rows,winners:w.rows});
});

/* Admin */
app.get("/api/admin/overview",admin,async(req,res)=>{
  const [w,p,i,s,set]=await Promise.all([
    pool.query("SELECT COUNT(*)::int count FROM winners"),
    pool.query("SELECT COUNT(*)::int count FROM winners WHERE status='pending'"),
    pool.query("SELECT COALESCE(SUM(available),0)::int count FROM inventory"),
    pool.query("SELECT COUNT(*)::int count FROM servers WHERE status='online'"),
    pool.query("SELECT key,value FROM settings")
  ]);
  const settings=Object.fromEntries(set.rows.map(x=>[x.key,x.value]));
  res.json({ok:true,stats:{winners:w.rows[0].count,pending:p.rows[0].count,inventory:i.rows[0].count,online:s.rows[0].count},settings});
});

app.get("/api/admin/winners",admin,async(req,res)=>{
  const r=await pool.query("SELECT * FROM winners ORDER BY created_at DESC");
  res.json({ok:true,winners:r.rows});
});
app.patch("/api/admin/winners/:id",admin,async(req,res)=>{
  const fields=[];const vals=[];let n=1;
  if(req.body.status){fields.push(`status=$${n++}`);vals.push(String(req.body.status))}
  if(req.body.notes!==undefined){fields.push(`notes=$${n++}`);vals.push(String(req.body.notes).slice(0,1000))}
  if(!fields.length)return res.status(400).json({ok:false,error:"NO_CHANGES"});
  vals.push(req.params.id);
  const r=await pool.query(`UPDATE winners SET ${fields.join(",")} WHERE id=$${n} RETURNING *`,vals);
  if(!r.rows[0])return res.status(404).json({ok:false,error:"NOT_FOUND"});
  res.json({ok:true,winner:r.rows[0]});
});
app.delete("/api/admin/winners/:id",admin,async(req,res)=>{
  const r=await pool.query("DELETE FROM winners WHERE id=$1",[req.params.id]);
  if(!r.rowCount)return res.status(404).json({ok:false,error:"NOT_FOUND"});
  res.json({ok:true});
});

app.get("/api/admin/inventory",admin,async(req,res)=>{
  const r=await pool.query("SELECT * FROM inventory ORDER BY type");
  res.json({ok:true,inventory:r.rows});
});
app.patch("/api/admin/inventory/:id",admin,async(req,res)=>{
  const fields=[],vals=[];let n=1;
  for(const k of ["name","type","status"]){if(req.body[k]!==undefined){fields.push(`${k}=$${n++}`);vals.push(String(req.body[k]))}}
  for(const k of ["total","available","assigned"]){if(req.body[k]!==undefined){fields.push(`${k}=$${n++}`);vals.push(Math.max(0,Number(req.body[k])))}} 
  if(!fields.length)return res.status(400).json({ok:false,error:"NO_CHANGES"});
  vals.push(req.params.id);
  const r=await pool.query(`UPDATE inventory SET ${fields.join(",")} WHERE id=$${n} RETURNING *`,vals);
  if(!r.rows[0])return res.status(404).json({ok:false,error:"NOT_FOUND"});
  res.json({ok:true,item:r.rows[0]});
});
app.post("/api/admin/inventory",admin,async(req,res)=>{
  const b=req.body||{};
  const total=Math.max(0,Number(b.total||0)), available=Math.max(0,Number(b.available||0));
  if(!b.name||!b.type)return res.status(400).json({ok:false,error:"INVALID_INVENTORY"});
  const r=await pool.query(
    "INSERT INTO inventory(id,name,type,total,available,assigned,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [uid(),String(b.name).trim(),String(b.type).trim(),total,available,Math.max(0,Number(b.assigned||0)),b.status||"active"]
  );
  res.status(201).json({ok:true,item:r.rows[0]});
});
app.delete("/api/admin/inventory/:id",admin,async(req,res)=>{
  const r=await pool.query("DELETE FROM inventory WHERE id=$1",[req.params.id]);
  if(!r.rowCount)return res.status(404).json({ok:false,error:"NOT_FOUND"});
  res.json({ok:true});
});

app.get("/api/admin/servers",admin,async(req,res)=>{
  const r=await pool.query("SELECT * FROM servers ORDER BY name");
  res.json({ok:true,servers:r.rows});
});
app.post("/api/admin/servers",admin,async(req,res)=>{
  const b=req.body||{}; if(!b.name)return res.status(400).json({ok:false,error:"SERVER_NAME_REQUIRED"});
  const r=await pool.query(
    "INSERT INTO servers(id,name,address,plan,status,capacity,used,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [uid(),String(b.name).trim(),String(b.address||""),String(b.plan||""),b.status||"offline",Math.max(0,Number(b.capacity||0)),Math.max(0,Number(b.used||0)),String(b.note||"").slice(0,500)]
  );
  res.status(201).json({ok:true,server:r.rows[0]});
});
app.patch("/api/admin/servers/:id",admin,async(req,res)=>{
  const fields=[],vals=[];let n=1;
  for(const k of ["name","address","plan","status","note"]){if(req.body[k]!==undefined){fields.push(`${k}=$${n++}`);vals.push(String(req.body[k]))}}
  for(const k of ["capacity","used"]){if(req.body[k]!==undefined){fields.push(`${k}=$${n++}`);vals.push(Math.max(0,Number(req.body[k])))}} 
  if(!fields.length)return res.status(400).json({ok:false,error:"NO_CHANGES"});
  vals.push(req.params.id);const r=await pool.query(`UPDATE servers SET ${fields.join(",")} WHERE id=$${n} RETURNING *`,vals);
  if(!r.rows[0])return res.status(404).json({ok:false,error:"NOT_FOUND"});res.json({ok:true,server:r.rows[0]});
});
app.delete("/api/admin/servers/:id",admin,async(req,res)=>{
  const r=await pool.query("DELETE FROM servers WHERE id=$1",[req.params.id]);
  if(!r.rowCount)return res.status(404).json({ok:false,error:"NOT_FOUND"});res.json({ok:true});
});

app.get("/api/admin/tickets",admin,async(req,res)=>{
  const r=await pool.query("SELECT * FROM tickets ORDER BY created_at DESC");
  res.json({ok:true,tickets:r.rows});
});
app.get("/api/admin/draws",admin,async(req,res)=>{
  const r=await pool.query("SELECT * FROM draws ORDER BY created_at DESC");
  res.json({ok:true,draws:r.rows});
});
app.get("/api/admin/settings",admin,async(req,res)=>{
  const r=await pool.query("SELECT key,value FROM settings");
  res.json({ok:true,settings:Object.fromEntries(r.rows.map(x=>[x.key,x.value]))});
});
app.patch("/api/admin/settings",admin,async(req,res)=>{
  for(const [key,value] of Object.entries(req.body||{})){
    await pool.query("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[key,String(value)]);
  }
  const r=await pool.query("SELECT key,value FROM settings");
  res.json({ok:true,settings:Object.fromEntries(r.rows.map(x=>[x.key,x.value]))});
});


async function runProvisionWorker(){
  try{
    const jobRes=await pool.query(
      `SELECT j.*,w.* FROM provision_jobs j JOIN winners w ON w.id=j.winner_id
       WHERE j.status IN ('queued','retry') AND j.next_run_at<=NOW()
       ORDER BY j.created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    if(!jobRes.rows[0]) return;
    const row=jobRes.rows[0];
    await pool.query("UPDATE provision_jobs SET status='processing',locked_at=NOW(),updated_at=NOW() WHERE id=$1",[row.id]);
    try{
      if(!panelConfigured()) throw new Error("PANEL_NOT_CONFIGURED");
      const result=await provisionWinner(row);
      const serverAttrs=result.server||{};
      await withTx(async(client)=>{
        await client.query(
          `UPDATE winners SET panel_status='provisioned',panel_user_id=$1,panel_server_id=$2,
           panel_identifier=$3,panel_url=$4,panel_error=NULL WHERE id=$5`,
          [result.userId||null,serverAttrs.id||null,serverAttrs.identifier||null,
           PANEL_URL_PUBLIC?`${PANEL_URL_PUBLIC}/server/${serverAttrs.identifier||""}`:null,row.winner_id]
        );
        await client.query(
          `UPDATE provision_jobs SET status='completed',last_error='',updated_at=NOW() WHERE id=$1`,
          [row.id]
        );
      });
      console.log("Provisioned winner",row.winner_id);
    }catch(e){
      const attempts=Number(row.attempts||0)+1;
      const final=attempts>=5;
      await pool.query(
        `UPDATE provision_jobs SET status=$1,attempts=$2,last_error=$3,next_run_at=NOW()+($4 || ' minutes')::interval,updated_at=NOW() WHERE id=$5`,
        [final?'failed':'retry',attempts,String(e.message||e).slice(0,1000),Math.min(60,2**attempts),row.id]
      );
      await pool.query("UPDATE winners SET panel_status=$1,panel_error=$2 WHERE id=$3",[final?'failed':'retry',String(e.message||e).slice(0,1000),row.winner_id]);
      console.error("Provisioning error",e);
    }
  }catch(e){console.error("Worker error",e)}
}
setInterval(runProvisionWorker,3000);

process.on("SIGTERM",async()=>{await pool.end();process.exit(0)});
app.listen(PORT,"0.0.0.0",()=>console.log(`Vault Protocol V8 running on ${PORT}`));
