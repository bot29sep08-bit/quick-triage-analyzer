const A=document.getElementById("app"),B=document.getElementById("bar");let token=localStorage.qtaToken||"",u=JSON.parse(localStorage.qtaUser||"null");const $=id=>document.getElementById(id),toast=x=>{$("toast").textContent=x;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",3000)};
async function api(url, o = {}) {
  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    ...o
  });

  const text = await r.text();

  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    console.error("Server returned:", text);
    throw new Error("Server error: API returned HTML instead of JSON");
  }

  if (!r.ok) {
    throw new Error(d.error || "Request failed");
  }

  return d;
}
function esc(x){return String(x??"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}function logout(){localStorage.clear();token="";u=null;render()}function render(){B.innerHTML=u?`${u.username} <button class="btn alt" onclick="logout()">Logout</button>`:`<button class="btn alt" onclick="auth()">Sign in</button>`;if(!u)return home();u.role==="patient"?patient():u.role==="nurse"?nurse():doctor()}
function home(){A.innerHTML=`<div class="hero"><small>ONE QUEUE. CLEAR CARE.</small><h1>The calm way to get <i>seen.</i></h1><p class="muted">One workflow connecting patients, nurses and doctors.</p></div><div class="grid">${["patient","nurse","doctor"].map(r=>`<div class="card role" onclick="auth('${r}')"><h2>${r==="nurse"?"Nurse / Staff":r[0].toUpperCase()+r.slice(1)}</h2><p class="muted">Continue to your QTA workspace.</p><button class="btn">Continue</button></div>`).join("")}</div><p class="muted">QTA is clinical decision support and does not replace professional clinical judgment.</p>`}
function auth(role="patient"){A.innerHTML=`<div class="auth card"><button class="btn alt" onclick="home()">← Back</button><h2>${role==="nurse"?"Nurse / Staff":role} login</h2><p><button class="btn alt" onclick="authMode('login','${role}')">Sign in</button> <button class="btn alt" onclick="authMode('register','${role}')">New register</button></p><div id="box"></div></div>`;authMode("login",role)}
function authMode(m,r){$("box").innerHTML=m==="login"?`<label>Username</label><input id="username"><label>Password</label><input id="password" type="password"><button class="btn" onclick="login('${r}')">Login</button>`:`<label>Username</label><input id="username"><label>Password</label><input id="password" type="password"><label>Mobile</label><input id="mobile"><label>Email (optional)</label><input id="email">${r==="patient"?`<label>Age</label><input id="age" type="number">`:`<label>Hospital name</label><input id="hospital_name"><label>Hospital ID (2 letters + 2 numbers)</label><input id="hospital_id" maxlength="4">`}<button class="btn" onclick="reg('${r}')">Create account</button>`}
async function login(role){try{let d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({role,username:$("username").value,password:$("password").value})});save(d)}catch(e){toast(e.message)}}
async function reg(role){try{let d=await api("/api/auth/register",{method:"POST",body:JSON.stringify({role,username:$("username").value,password:$("password").value,mobile:$("mobile").value,email:$("email").value,age:role==="patient"?$("age").value:null,hospital_name:role!=="patient"?$("hospital_name").value:null,hospital_id:role!=="patient"?$("hospital_id").value:null})});save(d);toast("Created. Your ID: "+d.user.unique_id)}catch(e){toast(e.message)}}
function save(d){u=d.user;token=d.token;localStorage.qtaUser=JSON.stringify(u);localStorage.qtaToken=token;render()}function nav(a){return `<div class="nav">${a.map(x=>`<button onclick="${x[1]}">${x[0]}</button>`).join("")}</div>`}
function patient(){A.innerHTML=nav([["Home","pform()"],["New registration","pform()"],["History","phistory()"],["Help / Message nurse","help()"],["Profile","profile()"]])+`<div id="c"></div>`;pform()}
function pform(){$("c").innerHTML=`<div class="panel"><h2>Quick registration</h2><label>Patient name</label><input id="pn"><label>Age</label><input id="pa" type="number"><label>Problem</label><textarea id="pp"></textarea><label>Location</label><select id="pl"><option value="in_hospital">In hospital</option><option value="away">Away from hospital</option></select><div class="notice">If away from hospital with severe pain or not fully conscious, come immediately to hospital for further assessment.</div><label>Hospital ID</label><input id="ph" maxlength="4"><button class="btn" onclick="pcase()">Submit</button></div>`}
async function pcase(){try{await api("/api/cases",{method:"POST",body:JSON.stringify({patient_name:$("pn").value,age:$("pa").value,problem:$("pp").value,location_status:$("pl").value,hospital_id:$("ph").value})});toast("Registration saved");phistory()}catch(e){toast(e.message)}}
function card(x){return `<div class="card case ${x.risk_level||""}"><b>${esc(x.patient_name)}</b> · Age ${x.age}<p>${esc(x.problem)}</p>${x.risk_level?`<span class="risk ${x.risk_level}">${x.risk_level} RISK</span> Score: ${x.news_score}`:"Waiting for nurse checkup"}<br><small>${new Date(x.updated_at+"Z").toLocaleString()}</small></div>`}
async function phistory(){let x=await api("/api/cases/my");$("c").innerHTML=`<h2>History</h2>${x.map(card).join("")||"No history"}`}
function help(){$("c").innerHTML=`<div class="panel"><h2>Message nurse</h2><label>Hospital ID</label><input id="mh"><label>Message</label><textarea id="msg"></textarea><button class="btn" onclick="message()">Send</button></div>`}async function message(){try{await api("/api/messages",{method:"POST",body:JSON.stringify({hospital_id:$("mh").value,message:$("msg").value})});toast("Sent to nurse")}catch(e){toast(e.message)}}
function profile(){$("c").innerHTML=`<div class="panel"><h2>Profile</h2><p><b>QTA ID:</b> ${u.unique_id}</p><p><b>Role:</b> ${u.role}</p></div>`}
function nurse(){A.innerHTML=nav([["Patient registrations","nlist()"],["Messages","nmsg()"],["History","nhistory()"],["Profile","profile()"]])+`<div id="c"></div>`;nlist()}
async function nlist(){let x=await api("/api/cases");$("c").innerHTML=`<h2>Patient registrations</h2>${x.map(v=>`<div class="card case ${v.risk_level||""}"><b>${esc(v.patient_name)}</b> · ${v.patient_id}<p>${esc(v.problem)}</p>${v.risk_level?`<span class="risk ${v.risk_level}">${v.risk_level}</span>`:""}<button class="btn" onclick="check(${v.id})">Quick checkup</button></div>`).join("")||"No registrations"}`}
async function check(id){$("c").innerHTML=`<div class="panel"><h2>Six vital measurements</h2><label>Respiration rate</label><input id="rr" type="number"><label>SpO₂</label><input id="spo2" type="number"><label>Systolic BP</label><input id="sbp" type="number"><label>Heart rate</label><input id="hr" type="number"><label>Consciousness</label><select id="con"><option>Alert</option><option>Voice</option><option>Pain</option><option>Unresponsive</option><option>New confusion</option></select><label>Temperature °C</label><input id="temp" type="number" step=".1"><button class="btn" onclick="triage(${id})">Analyze</button><div id="result"></div></div>`}
async function triage(id){try{let d=await api("/api/cases/"+id+"/triage",{method:"POST",body:JSON.stringify({rr:$("rr").value,spo2:$("spo2").value,sbp:$("sbp").value,heart_rate:$("hr").value,consciousness:$("con").value,temperature:$("temp").value})});$("result").innerHTML=`<div class="card case ${d.risk}"><h2><span class="risk ${d.risk}">${d.risk} RISK</span></h2><p>Score: ${d.score}</p><p>${d.risk==="LOW"?"Ward care and routine monitoring.":d.risk==="MEDIUM"?"Urgent clinical review within 30 minutes.":"High alert patient automatically sent to doctor."}</p>${d.risk!=="HIGH"?`<button class="btn" onclick="transfer(${id})">Transfer to doctor</button>`:""}</div>`}catch(e){toast(e.message)}}
async function transfer(id){await api("/api/cases/"+id+"/transfer",{method:"POST"});toast("Transferred");nlist()}async function nmsg(){let x=await api("/api/messages");$("c").innerHTML=`<h2>Patient messages</h2>${x.map(m=>`<div class="card"><b>${m.username}</b> (${m.unique_id})<p>${esc(m.message)}</p></div>`).join("")||"No messages"}`}async function nhistory(){let x=await api("/api/history");$("c").innerHTML=`<h2>History by date</h2>${x.map(card).join("")}`}
function doctor(){A.innerHTML=nav([["Priority queue","dqueue()"],["Hospital risk settings","dsettings()"],["History","dhistory()"],["Profile","profile()"]])+`<div id="c"></div>`;dqueue()}
async function dqueue(){let x=await api("/api/doctor/queue");$("c").innerHTML=`<h2>Doctor priority queue</h2>${x.map(v=>`<div class="card case ${v.risk_level}">${card(v)}<select id="s${v.id}"><option value="under_review">Under review</option><option value="completed">Completed</option><option value="admitted">Admitted</option><option value="follow_up">Follow-up</option></select><button class="btn" onclick="status(${v.id})">Update</button></div>`).join("")||"No patients waiting"}`}
async function status(id){await api("/api/cases/"+id+"/status",{method:"POST",body:JSON.stringify({status:$("s"+id).value})});toast("Updated");dqueue()}
async function dsettings(){let s=await api("/api/settings");$("c").innerHTML=`<div class="panel"><h2>Hospital-only risk settings</h2><p>Only doctors can change these values for hospital ${u.hospital_id}.</p><label>Low maximum</label><input id="low" value="${s.low_max}" type="number"><label>Medium maximum</label><input id="med" value="${s.medium_max}" type="number"><label>Medium review minutes</label><input id="min" value="${s.medium_review_minutes}" type="number"><button class="btn" onclick="saveset()">Save</button><p class="muted">Default: Low ≤4, Medium 5–6, High ≥7.</p></div>`}
async function saveset(){try{await api("/api/settings",{method:"PUT",body:JSON.stringify({low_max:$("low").value,medium_max:$("med").value,medium_review_minutes:$("min").value})});toast("Hospital settings saved")}catch(e){toast(e.message)}}
async function dhistory(){let x=await api("/api/history");$("c").innerHTML=`<h2>History by date</h2>${x.map(card).join("")}`}render();
