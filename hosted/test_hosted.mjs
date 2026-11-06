// Fake Anthropic upstream + the real server + the real app, end to end.
import http from "node:http"; import { spawn } from "node:child_process"; import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const seen=[];
const fake=http.createServer(async(req,res)=>{let b="";for await(const d of req) b+=d; const j=JSON.parse(b); seen.push({h:req.headers,b:j});
  res.writeHead(200,{"content-type":"text/event-stream"});
  const ev=(o)=>res.write("data: "+JSON.stringify(o)+"\n\n");
  ev({type:"message_start",message:{usage:{input_tokens:120,cache_read_input_tokens:5000,cache_creation_input_tokens:0}}});
  for(const t of ["Welcome, ","traveller. ","Do you have a character? ","[Map: room 2]"]){ev({type:"content_block_delta",delta:{type:"text_delta",text:t}});await new Promise(r=>setTimeout(r,10));}
  ev({type:"message_delta",usage:{output_tokens:30}}); ev({type:"message_stop"}); res.end();});
await new Promise(r=>fake.listen(0,"127.0.0.1",r)); const UP="http://127.0.0.1:"+fake.address().port;
const srv=spawn(process.execPath,["server.mjs"],{env:{...process.env,PORT:"8799",ANTHROPIC_API_KEY:"sk-ant-fake",UPSTREAM:UP,ACCESS_CODES:"abyss-123",TURNS_PER_MINUTE:"3"},stdio:["ignore","pipe","inherit"]});
srv.stdout.on("data",d=>process.stdout.write("  server: "+d));
await new Promise(r=>setTimeout(r,500));
const log=[];const ok=(c,m)=>log.push((c?"PASS ":"FAIL ")+m);
// raw checks
let r=await fetch("http://127.0.0.1:8799/v1/models"); ok(r.status===401,"models without code -> 401");
r=await fetch("http://127.0.0.1:8799/v1/models",{headers:{authorization:"Bearer abyss-123"}}); ok(r.ok&&(await r.json()).data[0].id==="claude-haiku-5-5","models with code lists the model");
r=await fetch("http://127.0.0.1:8799/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer abyss-123"},body:JSON.stringify({model:"x",stream:true,messages:[{role:"system",content:"DUNGEON"},{role:"user",content:"hi"}]})});
const txt=await r.text(); ok(r.ok&&/Welcome, /.test(txt)&&/\[DONE\]/.test(txt),"streams OpenAI-shaped chunks");
const up=seen[0]; ok(up.h["x-api-key"]==="sk-ant-fake"&&up.b.system[0].cache_control&&up.b.output_config.effort==="low"&&up.b.model==="claude-haiku-5-5"&&up.b.messages[0].role==="user","upstream request shape: key, cached system, low effort, Haiku");
for(let i=0;i<2;i++)await fetch("http://127.0.0.1:8799/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer abyss-123"},body:JSON.stringify({messages:[{role:"user",content:"hi"}]})});
r=await fetch("http://127.0.0.1:8799/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer abyss-123"},body:JSON.stringify({messages:[{role:"user",content:"hi"}]})});
ok(r.status===429&&/Wait a minute/.test((await r.json()).error.message),"fourth turn in a minute -> 429 with a plain sentence");
// through the real app
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto("file://"+process.argv[2]+"#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p");await p.waitForTimeout(1000);
await p.selectOption("#gmProv","hosted");await p.waitForTimeout(200);await p.fill("#gmUrl","http://127.0.0.1:8799/v1");await p.fill("#gmKey","abyss-123");
await p.click("#gmCheck");await p.waitForTimeout(500);ok(/Connected\. 1 model/.test(await p.textContent("#tabBody")),"app connects to the hosted door with the access code");
await b.close(); srv.kill(); fake.close();
console.log(log.join("\n"));console.log("FAILS: "+log.filter(l=>l.startsWith("FAIL")).length);
