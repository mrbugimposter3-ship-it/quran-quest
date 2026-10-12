import * as THREE from 'three';
const $=id=>document.getElementById(id);
const strip=s=>s.replace(/<[^>]+>/g,'');
// ---------- save ----------
const KEY='quranQuestSave1';
let save=JSON.parse(localStorage.getItem(KEY)||'{"xp":0,"done":{}}');
const persist=()=>localStorage.setItem(KEY,JSON.stringify(save));
const lvlOf=xp=>Math.floor(Math.sqrt(xp/50))+1, xpFor=l=>50*(l-1)**2;
// ---------- audio (simple synth sfx, no music) ----------
let ac;const tone=(f,d=.15,t='sine',v=.15,delay=0)=>{try{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,ac.currentTime+delay);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+delay+d);o.connect(g).connect(ac.destination);o.start(ac.currentTime+delay);o.stop(ac.currentTime+delay+d)}catch(e){}};
const sfx={click:()=>tone(660,.06,'triangle',.08),good:()=>[523,659,784].forEach((f,i)=>tone(f,.25,'sine',.12,i*.08)),bad:()=>tone(180,.25,'sawtooth',.06),level:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.4,'sine',.12,i*.1))};
// ---------- scene ----------
const R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.setSize(innerWidth,innerHeight);R.shadowMap.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;document.body.prepend(R.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b2a1c);scene.fog=new THREE.FogExp2(0x123d29,.012);
const cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,600);
scene.add(new THREE.HemisphereLight(0xbfffd8,0x0a2010,.9));
const sun=new THREE.DirectionalLight(0xfff2c0,1.6);sun.position.set(60,90,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-80,right:80,top:80,bottom:-80,far:250});scene.add(sun);
// sky dome
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,fog:false,uniforms:{},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(.07,.25,.16),vec3(.02,.08,.12),clamp(h,0.,1.));c+=vec3(.9,.8,.4)*pow(max(0.,1.-abs(h-.05)*6.),3.)*.25;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
// terrain
const H=(x,z)=>Math.sin(x*.04)*3+Math.cos(z*.05)*3+Math.sin((x+z)*.11)*1.2+Math.max(0,Math.hypot(x,z)-110)*.35;
const tg=new THREE.PlaneGeometry(400,400,160,160);tg.rotateX(-Math.PI/2);
const cols=[];const pa=tg.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),y=H(x,z);pa.setY(i,y);const c=new THREE.Color().setHSL(.33-y*.004,.55,.18+Math.random()*.05+y*.006);cols.push(c.r,c.g,c.b)}
tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));tg.computeVertexNormals();
const ground=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));ground.receiveShadow=true;scene.add(ground);
// trees (instanced)
const rnd=(a,b)=>a+Math.random()*(b-a);
const trunkG=new THREE.CylinderGeometry(.25,.4,3,6),leafG=new THREE.ConeGeometry(2,5,7);
const N=420,trunks=new THREE.InstancedMesh(trunkG,new THREE.MeshStandardMaterial({color:0x4a2f1a}),N),leaves=new THREE.InstancedMesh(leafG,new THREE.MeshStandardMaterial({color:0x1f7a3f,roughness:.8}),N*2);
trunks.castShadow=leaves.castShadow=true;const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
const shrinePos=[];
for(let i=0,k=0;i<N;i++){let x,z;do{x=rnd(-190,190);z=rnd(-190,190)}while(Math.hypot(x,z)<14);const s=rnd(.8,1.8),y=H(x,z);
 m4.compose(new THREE.Vector3(x,y+1.5*s,z),q,sc.set(s,s,s));trunks.setMatrixAt(i,m4);
 for(let j=0;j<2;j++){m4.compose(new THREE.Vector3(x,y+(4+j*2)*s,z),q,sc.set(s*(1-j*.3),s*(1-j*.25),s*(1-j*.3)));leaves.setMatrixAt(k++,m4)}
 const c=new THREE.Color().setHSL(rnd(.28,.4),.6,rnd(.2,.32));leaves.setColorAt(2*i,c);leaves.setColorAt(2*i+1,c)}
scene.add(trunks,leaves);
// fireflies / particles
const PN=900,pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3);for(let i=0;i<PN;i++){pp[i*3]=rnd(-150,150);pp[i*3+1]=rnd(1,14);pp[i*3+2]=rnd(-150,150)}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));const motes=new THREE.Points(pg,new THREE.PointsMaterial({color:0x9dffb5,size:.35,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(motes);
// ---------- shrines ----------
const shrines=[];const jade=new THREE.MeshStandardMaterial({color:0x2fbf71,emissive:0x0c5a30,roughness:.3,metalness:.2}),stone=new THREE.MeshStandardMaterial({color:0x8a9a88,roughness:.9}),gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.8,roughness:.3});
SURAHS.forEach((s,si)=>{const ang0=si*Math.PI/2+.4,rad=26+si*6;
 s.ayahs.forEach((a,ai)=>{const ang=ang0+ (ai-(s.ayahs.length-1)/2)*.32,dist=rad+ai*7;const x=Math.cos(ang)*dist,z=Math.sin(ang)*dist,y=H(x,z);
  const g=new THREE.Group();g.position.set(x,y,z);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3,3.4,.8,8),stone);base.position.y=.4;base.receiveShadow=base.castShadow=true;g.add(base);
  for(let p=0;p<4;p++){const pil=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,4,8),stone);const pa=p*Math.PI/2+Math.PI/4;pil.position.set(Math.cos(pa)*2.2,2.8,Math.sin(pa)*2.2);pil.castShadow=true;g.add(pil)}
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.6,20,10,0,Math.PI*2,0,Math.PI/2),gold);dome.position.y=4.8;dome.castShadow=true;g.add(dome);
  const crys=new THREE.Mesh(new THREE.OctahedronGeometry(.9),jade.clone());crys.position.y=2.4;g.add(crys);
  const light=new THREE.PointLight(0x3dffa0,8,16);light.position.y=2.4;g.add(light);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,60,12,1,true),new THREE.MeshBasicMaterial({color:0x6dffb0,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=32;g.add(beam);
  scene.add(g);shrines.push({g,crys,light,beam,s,a,id:s.id+':'+a.n,pos:new THREE.Vector3(x,y,z)});shrinePos.push([x,z]);});});
function refreshShrine(sh){const d=save.done[sh.id];sh.crys.material.color.set(d?0xffe680:0x2fbf71);sh.crys.material.emissive.set(d?0xb88a00:0x0c5a30);sh.light.color.set(d?0xffd97a:0x3dffa0);sh.beam.material.color.set(d?0xffe9a0:0x6dffb0);sh.beam.material.opacity=d?.22:.1}
shrines.forEach(refreshShrine);
// ---------- hero ----------
const hero=new THREE.Group();const robe=new THREE.MeshStandardMaterial({color:0x1d6b45,roughness:.7});
const body=new THREE.Mesh(new THREE.ConeGeometry(.75,2,10),robe);body.position.y=1;body.castShadow=true;hero.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),new THREE.MeshStandardMaterial({color:0xd9a77a}));head.position.y=2.25;head.castShadow=true;hero.add(head);
const hood=new THREE.Mesh(new THREE.SphereGeometry(.45,16,12,0,Math.PI*2,0,Math.PI*.6),robe);hood.position.set(0,2.3,-.05);hood.rotation.x=-.3;hero.add(hood);
const sash=new THREE.Mesh(new THREE.TorusGeometry(.48,.07,8,20),gold);sash.position.y=1.25;sash.rotation.x=Math.PI/2;hero.add(sash);
const staff=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.6),new THREE.MeshStandardMaterial({color:0x5a3a20}));staff.position.set(.7,1.3,.2);hero.add(staff);
const orb=new THREE.Mesh(new THREE.SphereGeometry(.15),new THREE.MeshBasicMaterial({color:0x9dffb5}));orb.position.set(.7,2.65,.2);hero.add(orb);const hl=new THREE.PointLight(0x9dffb5,3,8);hl.position.copy(orb.position);hero.add(hl);
scene.add(hero);
// ---------- input ----------
const keys={};let yaw=Math.PI,pitch=.35,zoom=11,drag=false,vy=0,started=false,inDlg=false;
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE'&&started&&!inDlg&&nearSh)openDlg(nearSh);if(e.code==='Escape'&&inDlg)closeDlg()});
addEventListener('keyup',e=>keys[e.code]=false);
R.domElement.addEventListener('mousedown',()=>drag=true);addEventListener('mouseup',()=>drag=false);
addEventListener('mousemove',e=>{if(drag&&!inDlg){yaw-=e.movementX*.005;pitch=Math.min(1.2,Math.max(.05,pitch+e.movementY*.004))}});
addEventListener('wheel',e=>zoom=Math.min(25,Math.max(4,zoom+e.deltaY*.01)));
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)});
// ---------- HUD ----------
function hud(){const l=lvlOf(save.xp);$('lvl').textContent=l;$('xp').style.width=(100*(save.xp-xpFor(l))/(xpFor(l+1)-xpFor(l)))+'%';$('xpt').textContent=save.xp+' XP';
 $('lit').textContent=Object.keys(save.done).length+'/'+shrines.length;
 $('ql').innerHTML=SURAHS.map(s=>{const n=s.ayahs.filter(a=>save.done[s.id+':'+a.n]).length;return `<div style="margin-top:6px"><b>${s.name}</b> <span class="ar">${s.arName}</span> — ${n}/${s.ayahs.length}${n==s.ayahs.length?' 🏅':''}</div>`+s.ayahs.map(a=>`<div class="q ${save.done[s.id+':'+a.n]?'done':''}">Ayah ${a.n}</div>`).join('')}).join('')}
function toast(t){const e=$('toast');e.innerHTML=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2200)}
function gainXP(n){const l0=lvlOf(save.xp);save.xp+=n;persist();hud();if(lvlOf(save.xp)>l0){sfx.level();toast('✦ Level '+lvlOf(save.xp)+' ✦');burst(hero.position,0xffd97a,120)}}
// ---------- burst particles ----------
const bursts=[];function burst(p,color,n=80){const g=new THREE.BufferGeometry(),a=new Float32Array(n*3),v=[];for(let i=0;i<n;i++){a.set([p.x,p.y+2,p.z],i*3);v.push(new THREE.Vector3(rnd(-1,1),rnd(.5,2),rnd(-1,1)).multiplyScalar(6))}
 g.setAttribute('position',new THREE.BufferAttribute(a,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({color,size:.4,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(pts);bursts.push({pts,v,t:0})}
// ---------- challenge dialog ----------
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
let cur;
function openDlg(sh){inDlg=true;cur=sh;$('prompt').style.display='none';sfx.click();study()}
function closeDlg(){inDlg=false;$('dlg').style.display='none'}
const D=h=>{const d=$('dlg');d.style.display='block';d.innerHTML=h};
const header=()=>`<h2>Shrine of ${cur.s.name} · Ayah ${cur.a.n}</h2>`;
function study(){const a=cur.a;D(header()+`<div class="verse ar">${a.ar} <span style="color:#ffd97a">﴿${a.n.toLocaleString('ar-EG')}﴾</span></div><div class="tr">${strip(a.tr)}</div><div class="en">“${a.en}”</div>
 <div style="font-family:Georgia;font-size:13px;opacity:.8">Read it slowly a few times. When you are ready, the shrine will test your memory.</div>
 <button class="b" id="go">I'm ready — Trial of Order</button><button class="b" id="cl">Leave (Esc)</button>`);$('go').onclick=order;$('cl').onclick=closeDlg}
function order(){const words=cur.a.ar.split(' ');if(words.length<2)return fill();let picked=[];const pool=shuffle(words.map((w,i)=>({w,i})));
 const render=()=>{D(header()+`<div class="tr">Trial I · Arrange the words in order (right to left)</div><div class="en">“${cur.a.en}”</div>
  <div class="tiles" id="ans">${picked.map((p,k)=>`<span class="tile" data-k="${k}">${p.w}</span>`).join('')}</div>
  <div class="tiles" id="pool">${pool.filter(p=>!picked.includes(p)).map(p=>`<span class="tile" data-i="${pool.indexOf(p)}">${p.w}</span>`).join('')}</div>
  <div class="msg" id="msg"></div><button class="b" id="chk">Check</button><button class="b" id="peek">Peek (−XP)</button><button class="b" id="cl">Leave</button>`);
  $('ans').querySelectorAll('.tile').forEach(t=>t.onclick=()=>{sfx.click();picked.splice(+t.dataset.k,1);render()});
  $('pool').querySelectorAll('.tile').forEach(t=>t.onclick=()=>{sfx.click();picked.push(pool[+t.dataset.i]);render()});
  $('peek').onclick=()=>{cur.peeked=true;$('msg').innerHTML=`<span class="ar" style="font-size:22px">${cur.a.ar}</span>`};$('cl').onclick=closeDlg;
  $('chk').onclick=()=>{if(picked.length<words.length){$('msg').innerHTML='<span class="bad">Place every word first.</span>';return}
   if(picked.every((p,k)=>p.w===words[k])){sfx.good();burst(cur.pos,0x9dffb5);gainXP(cur.peeked?10:20);fill()}else{sfx.bad();$('msg').innerHTML='<span class="bad">Not quite — tap placed words to return them and try again.</span>'}}};render()}
function fill(){const words=cur.a.ar.split(' ');const idx=Math.random()*words.length|0;const right=words[idx];
 const others=shuffle([...new Set(cur.s.ayahs.flatMap(a=>a.ar.split(' ')).concat(SURAHS[0].ayahs.flatMap(a=>a.ar.split(' '))))].filter(w=>w!==right)).slice(0,3);
 const opts=shuffle([right,...others]);
 D(header()+`<div class="tr">Trial II · Complete the ayah</div><div class="verse ar">${words.map((w,i)=>i===idx?'<span style="color:#ffd97a">﹏﹏</span>':w).join(' ')}</div><div class="en">“${cur.a.en}”</div>
 <div class="tiles">${opts.map((o,i)=>`<span class="tile" data-i="${i}">${o}</span>`).join('')}</div><div class="msg" id="msg"></div>`);
 document.querySelectorAll('#dlg .tile').forEach(t=>t.onclick=()=>{if(opts[+t.dataset.i]===right){sfx.good();finish()}else{sfx.bad();t.style.opacity=.3;$('msg').innerHTML='<span class="bad">Try again.</span>'}})}
function finish(){const first=!save.done[cur.id];save.done[cur.id]=1;persist();refreshShrine(cur);burst(cur.pos,0xffd97a,160);gainXP(first?(cur.peeked?20:40):10);cur.peeked=false;
 const s=cur.s,all=s.ayahs.every(a=>save.done[s.id+':'+a.n]);
 D(header()+`<div class="good" style="font-size:22px">✦ The shrine glows golden ✦</div><div class="verse ar">${cur.a.ar}</div>${all?`<div style="color:#ffd97a;font-size:18px">🏅 You have memorized all of Surah ${s.name}! Recite it in full:</div><div class="ar" style="font-size:22px;line-height:2">${s.ayahs.map(a=>a.ar+' ﴿'+a.n.toLocaleString('ar-EG')+'﴾').join(' ')}</div>`:''}
 <button class="b" id="cl">Continue the journey</button>`);$('cl').onclick=closeDlg;if(all)toast('Surah '+s.name+' complete!')}
// ---------- loop ----------
let nearSh=null;const clock=new THREE.Clock();hero.position.set(0,H(0,0),0);
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
 if(started&&!inDlg){const sp=(keys.ShiftLeft?14:7)*dt;const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(-f.z,0,f.x);const mv=new THREE.Vector3();
  if(keys.KeyW||keys.ArrowUp)mv.add(f);if(keys.KeyS||keys.ArrowDown)mv.sub(f);if(keys.KeyD||keys.ArrowRight)mv.add(r);if(keys.KeyA||keys.ArrowLeft)mv.sub(r);
  if(mv.lengthSq()){mv.normalize().multiplyScalar(sp);hero.position.add(mv);hero.rotation.y=Math.atan2(mv.x,mv.z);body.position.y=1+Math.abs(Math.sin(t*12))*.08}
  hero.position.x=THREE.MathUtils.clamp(hero.position.x,-180,180);hero.position.z=THREE.MathUtils.clamp(hero.position.z,-180,180);
  for(const sh of shrines){const d=new THREE.Vector2(hero.position.x-sh.pos.x,hero.position.z-sh.pos.z);if(d.length()<3.6&&d.length()>0){d.setLength(3.6);hero.position.x=sh.pos.x+d.x;hero.position.z=sh.pos.z+d.y}}
  const gy=H(hero.position.x,hero.position.z);if(keys.Space&&hero.position.y<=gy+.01)vy=8;vy-=22*dt;hero.position.y=Math.max(gy,hero.position.y+vy*dt);if(hero.position.y===gy)vy=0;}
 // nearest
 nearSh=null;let best=1e9,bu=null,bud=1e9;for(const sh of shrines){const d=sh.pos.distanceTo(hero.position);if(d<6.5&&d<best){best=d;nearSh=sh}if(!save.done[sh.id]&&d<bud){bud=d;bu=sh}
  sh.crys.rotation.y=t;sh.crys.position.y=2.4+Math.sin(t*2+sh.pos.x)*.25;sh.light.intensity=7+Math.sin(t*3+sh.pos.z)*2}
 $('prompt').style.display=started&&!inDlg&&nearSh?'block':'none';if(nearSh)$('prompt').innerHTML=`Press <b>E</b> — Shrine of ${nearSh.s.name}, Ayah ${nearSh.a.n}${save.done[nearSh.id]?' (lit — review)':''}`;
 $('near').textContent=bu?`${bu.s.name} ${bu.a.n} (${bud|0} m)`:'All shrines lit — mā shā’ Allāh!';
 // camera
 const tgt=hero.position.clone().add(new THREE.Vector3(0,2.2,0));const cp=tgt.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(zoom));cp.y=Math.max(cp.y,H(cp.x,cp.z)+.8);
 if(!started){cp.set(Math.sin(t*.1)*40,22,Math.cos(t*.1)*40)}cam.position.lerp(cp,started?.15:1);cam.lookAt(started?tgt:new THREE.Vector3(0,3,0));
 // particles
 const p=motes.geometry.attributes.position;for(let i=0;i<PN;i++){p.array[i*3+1]+=Math.sin(t+i)*.01;p.array[i*3]+=Math.cos(t*.5+i)*.01}p.needsUpdate=true;
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.t+=dt;const a=b.pts.geometry.attributes.position;b.v.forEach((v,k)=>{v.y-=6*dt;a.array[k*3]+=v.x*dt;a.array[k*3+1]+=v.y*dt;a.array[k*3+2]+=v.z*dt});a.needsUpdate=true;b.pts.material.opacity=1-b.t/1.5;if(b.t>1.5){scene.remove(b.pts);bursts.splice(i,1)}}
 R.render(scene,cam)}
$('start').onclick=()=>{started=true;$('title').style.display='none';sfx.good()};
$('reset').onclick=()=>{if(confirm('Reset all progress?')){save={xp:0,done:{}};persist();shrines.forEach(refreshShrine);hud()}};
hud();loop();
window.__qq={shrines,openDlg,start:()=>$('start').click()};
