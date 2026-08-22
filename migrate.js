
const {Pool}=require("pg");
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");
const pool=new Pool({connectionString:url,max:5});
const sql=`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory(
 id UUID PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL CHECK(type IN ('12 شهرًا','6 أشهر','3 أشهر')),
 total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0),available INTEGER NOT NULL DEFAULT 0 CHECK(available>=0),
 assigned INTEGER NOT NULL DEFAULT 0 CHECK(assigned>=0),status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS tickets(
 id UUID PRIMARY KEY,ticket_no TEXT UNIQUE NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active',drawn BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),draw_at TIMESTAMPTZ,winner_id UUID
);
CREATE INDEX IF NOT EXISTS tickets_phone_status_idx ON tickets(phone,status);
CREATE TABLE IF NOT EXISTS winners(
 id UUID PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL,prize TEXT NOT NULL,prize_type TEXT NOT NULL,
 code TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'pending',draw_method TEXT NOT NULL,
 ticket_no TEXT NOT NULL REFERENCES tickets(ticket_no),inventory_id UUID NOT NULL REFERENCES inventory(id),
 notes TEXT DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 panel_status TEXT NOT NULL DEFAULT 'pending',panel_user_id INTEGER,panel_server_id INTEGER,
 panel_identifier TEXT,panel_url TEXT,panel_error TEXT
);
CREATE INDEX IF NOT EXISTS winners_created_idx ON winners(created_at DESC);
CREATE TABLE IF NOT EXISTS draws(
 id UUID PRIMARY KEY,winner_id UUID NOT NULL REFERENCES winners(id),ticket_no TEXT NOT NULL REFERENCES tickets(ticket_no),
 inventory_id UUID NOT NULL REFERENCES inventory(id),prize_type TEXT NOT NULL,method TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS servers(
 id UUID PRIMARY KEY,name TEXT NOT NULL,address TEXT DEFAULT '',plan TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'offline',capacity INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS provision_jobs(
 id UUID PRIMARY KEY,winner_id UUID NOT NULL UNIQUE REFERENCES winners(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT DEFAULT '',
 next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),locked_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provision_jobs_ready_idx ON provision_jobs(status,next_run_at);
INSERT INTO settings(key,value) VALUES('eventStatus','ONLINE'),('eventName','مسابقات متجر الشامل') ON CONFLICT(key) DO NOTHING;
INSERT INTO inventory(id,name,type,total,available,assigned,status) VALUES
('00000000-0000-0000-0000-000000000012','سيرفر 12 شهرًا','12 شهرًا',0,0,0,'inactive'),
('00000000-0000-0000-0000-000000000006','سيرفر 6 أشهر','6 أشهر',0,0,0,'inactive'),
('00000000-0000-0000-0000-000000000003','سيرفر 3 أشهر','3 أشهر',0,0,0,'inactive')
ON CONFLICT(id) DO NOTHING;
`;
(async()=>{try{await pool.query("BEGIN");await pool.query(sql);await pool.query("COMMIT");console.log("PostgreSQL schema ready")}catch(e){await pool.query("ROLLBACK").catch(()=>{});console.error(e);process.exitCode=1}finally{await pool.end()}})();
