import * as THREE from 'three';
const $=id=>document.getElementById(id);
const BYID={};SURAHS.forEach(s=>BYID[s.id]=s);
// ---------- save ----------
const KEY='quranQuestSave1';
let save=Object.assign({xp:0,done:{},active:1,t:{},best:{},secs:0,words:0},JSON.parse(localStorage.getItem(KEY)||'{}'));
let lastPersist=0;const persist=()=>{localStorage.setItem(KEY,JSON.stringify(save));lastPersist=performance.now()};
const lvlOf=xp=>Math.floor(Math.sqrt(xp/50))+1, xpFor=l=>50*(l-1)**2;
const wc=a=>a.ar.split(' ').length;
const fmt=s=>{s=Math.round(s);const h=s/3600|0,m=(s%3600)/60|0,x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const DEFAULT_RATE=9; // seconds per word, before you have personal data
const rate=()=>save.words>=15?save.secs/save.words:DEFAULT_RATE;
const doneCount=s=>s.ayahs.filter(a=>save.done[s.id+':'+a.n]).length;
const eta=s=>s.ayahs.filter(a=>!save.done[s.id+':'+a.n]).reduce((t,a)=>t+15+wc(a)*rate(),0);
const T=id=>save.t[id]||(save.t[id]={el:0,run:false,fin:null});
// ---------- audio (synth sfx, no music) ----------
let ac;const tone=(f,d=.15,t='sine',v=.15,delay=0)=>{try{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,ac.currentTime+delay);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+delay+d);o.connect(g).connect(ac.destination);o.start(ac.currentTime+delay);o.stop(ac.currentTime+delay+d)}catch(e){}};
const sfx={click:()=>tone(660,.06,'triangle',.07),good:()=>[523,659,784].forEach((f,i)=>tone(f,.25,'sine',.12,i*.08)),bad:()=>tone(180,.25,'sawtooth',.05),level:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.4,'sine',.12,i*.1)),portal:()=>[392,523,784].forEach((f,i)=>tone(f,.6,'sine',.09,i*.12))};
// ---------- renderer & scene ----------
const R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.setSize(innerWidth,innerHeight);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;document.body.prepend(R.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x1b4a33,.0105);
const cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,700);
scene.add(new THREE.HemisphereLight(0xc8ffe0,0x0d2412,.85));
const sun=new THREE.DirectionalLight(0xffe7b0,2.0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:260});scene.add(sun,sun.target);
const sky=new THREE.Mesh(new THREE.SphereGeometry(500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,fog:false,uniforms:{t:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec3 p;uniform float t;void main(){vec3 d=normalize(p);float h=d.y;vec3 c=mix(vec3(.16,.42,.3),vec3(.03,.12,.17),smoothstep(-.05,.6,h));vec3 sd=normalize(vec3(.6,.35,.3));float s=max(0.,dot(d,sd));c+=vec3(1.,.85,.5)*(pow(s,600.)*3.+pow(s,8.)*.35);c+=vec3(.9,.8,.4)*pow(max(0.,1.-abs(h)*5.),3.)*.18;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
// ---------- terrain ----------
const LAKE={x:-62,z:58,r:30};
const n2=(x,z)=>Math.sin(x*.045)*3.2+Math.cos(z*.052)*3+Math.sin((x+z)*.11)*1.1+Math.sin(x*.21+z*.17)*.35;
const H=(x,z)=>{const d=Math.hypot(x,z);let y=n2(x,z)*Math.min(1,d/30)+Math.max(0,d-120)*.45;const l=Math.hypot(x-LAKE.x,z-LAKE.z);y-=7*Math.exp(-(l*l)/(LAKE.r*LAKE.r*.55));return y};
const tg=new THREE.PlaneGeometry(440,440,200,200);tg.rotateX(-Math.PI/2);
const cols=[];const pa=tg.attributes.position,c=new THREE.Color();
for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),y=H(x,z);pa.setY(i,y);
 if(y<-2.2)c.setRGB(.55,.5,.35);else if(y>12)c.setHSL(.3,.18,.32+Math.random()*.04);else c.setHSL(.31+Math.sin(x*.07)*.03,.55,.2+Math.random()*.035+y*.006);cols.push(c.r,c.g,c.b)}
tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));tg.computeVertexNormals();
const ground=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));ground.receiveShadow=true;scene.add(ground);
// water
const wmat=new THREE.MeshStandardMaterial({color:0x1d8a7a,roughness:.08,metalness:.35,transparent:true,opacity:.82,emissive:0x053d33});
const wg=new THREE.CircleGeometry(LAKE.r*1.25,64);wg.rotateX(-Math.PI/2);const water=new THREE.Mesh(wg,wmat);water.position.set(LAKE.x,-2.3,LAKE.z);scene.add(water);
// ---------- shrine layout (spiral path) ----------
const MAXA=Math.max(...SURAHS.map(s=>s.ayahs.length));
const slots=[];for(let i=0;slots.length<MAXA;i++){const a=.9+i*.5,r=22+i*2.55,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+6)continue;slots.push([x,z])}
// path stones along spiral
const pathG=new THREE.CylinderGeometry(.9,1,.25,7),pathM=new THREE.MeshStandardMaterial({color:0xb7b096,roughness:1});
const pathPts=[];for(let k=0;k<slots.length-1;k++){const[a,b]=slots[k],[c2,d]=slots[k+1];const L=Math.hypot(c2-a,d-b);for(let u=0;u<L;u+=2.6)pathPts.push([a+(c2-a)*u/L,b+(d-b)*u/L])}
for(let u=0;u<22;u+=2.6){const a=.9;pathPts.push([Math.cos(a)*u,Math.sin(a)*u])}
const path=new THREE.InstancedMesh(pathG,pathM,pathPts.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),v3=new THREE.Vector3();
pathPts.forEach(([x,z],i)=>{m4.compose(v3.set(x,H(x,z)+.05,z),q.setFromAxisAngle(new THREE.Vector3(0,1,0),i),sc.set(1,1,1));path.setMatrixAt(i,m4)});path.receiveShadow=true;scene.add(path);
const nearPath=(x,z,r)=>pathPts.some(p=>Math.abs(p[0]-x)<r&&Math.abs(p[1]-z)<r);
// ---------- vegetation ----------
const rnd=(a,b)=>a+Math.random()*(b-a);
const free=(x,z,r)=>Math.hypot(x,z)>16&&Math.hypot(x-LAKE.x,z-LAKE.z)>LAKE.r+3&&!nearPath(x,z,r);
const N=520,trunkG=new THREE.CylinderGeometry(.22,.38,3,6),pineG=new THREE.ConeGeometry(2,4.5,8),roundG=new THREE.IcosahedronGeometry(2.4,1);
const trunks=new THREE.InstancedMesh(trunkG,new THREE.MeshStandardMaterial({color:0x4a2f1a,roughness:1}),N),pines=new THREE.InstancedMesh(pineG,new THREE.MeshStandardMaterial({roughness:.85,flatShading:true}),N*3),rounds=new THREE.InstancedMesh(roundG,new THREE.MeshStandardMaterial({roughness:.8,flatShading:true}),N);
trunks.castShadow=pines.castShadow=rounds.castShadow=true;let pk=0,rk=0;const trees=[];
for(let i=0;i<N;i++){let x,z,t=0;do{x=rnd(-200,200);z=rnd(-200,200)}while(!free(x,z,5)&&++t<50);const s=rnd(.8,1.7),y=H(x,z);trees.push([x,z]);
 m4.compose(v3.set(x,y+1.5*s,z),q.identity(),sc.set(s,s,s));trunks.setMatrixAt(i,m4);
 if(Math.random()<.62){const col=new THREE.Color().setHSL(rnd(.3,.4),.55,rnd(.16,.26));for(let j=0;j<3;j++){m4.compose(v3.set(x,y+(3.4+j*1.7)*s,z),q.identity(),sc.set(s*(1-j*.25),s*(1-j*.2),s*(1-j*.25)));pines.setMatrixAt(pk,m4);pines.setColorAt(pk++,col)}}
 else{m4.compose(v3.set(x,y+4.6*s,z),q.setFromEuler(new THREE.Euler(rnd(0,3),rnd(0,3),0)),sc.set(s,s*rnd(.8,1.1),s));rounds.setMatrixAt(rk,m4);rounds.setColorAt(rk++,new THREE.Color().setHSL(rnd(.24,.36),.6,rnd(.22,.34)))}}
pines.count=pk;rounds.count=rk;scene.add(trunks,pines,rounds);
// rocks, grass, flowers
const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x7d8a7c,roughness:1,flatShading:true}),120);rocks.castShadow=rocks.receiveShadow=true;
for(let i=0;i<120;i++){let x,z;do{x=rnd(-190,190);z=rnd(-190,190)}while(!free(x,z,3));const s=rnd(.4,1.8);m4.compose(v3.set(x,H(x,z)+s*.3,z),q.setFromEuler(new THREE.Euler(rnd(0,3),rnd(0,3),0)),sc.set(s,s*.7,s));rocks.setMatrixAt(i,m4)}scene.add(rocks);
const GN=5000,grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.08,.7,3),new THREE.MeshStandardMaterial({color:0x4fae4a,roughness:1}),GN);
for(let i=0;i<GN;i++){let x,z;do{x=rnd(-120,120);z=rnd(-120,120)}while(Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r);m4.compose(v3.set(x,H(x,z)+.3,z),q.setFromEuler(new THREE.Euler(rnd(-.3,.3),0,rnd(-.3,.3))),sc.set(1,rnd(.6,1.4),1));grass.setMatrixAt(i,m4)}scene.add(grass);
const FN=700,flowers=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshStandardMaterial({emissive:0x222222}),FN);
for(let i=0;i<FN;i++){let x,z;do{x=rnd(-110,110);z=rnd(-110,110)}while(Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r);m4.compose(v3.set(x,H(x,z)+.35,z),q.identity(),sc.set(1,1,1));flowers.setMatrixAt(i,m4);flowers.setColorAt(i,new THREE.Color().setHSL([.12,.95,.75,.55][i%4],.8,.7))}scene.add(flowers);
// lily pads
const lily=new THREE.InstancedMesh(new THREE.CircleGeometry(.8,10).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x2f8f3a}),40);
for(let i=0;i<40;i++){const a=rnd(0,6.3),r=rnd(4,LAKE.r*.9);m4.compose(v3.set(LAKE.x+Math.cos(a)*r,-2.25,LAKE.z+Math.sin(a)*r),q.identity(),sc.set(1,1,1));lily.setMatrixAt(i,m4)}scene.add(lily);
// fireflies
const PN=900,pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3);for(let i=0;i<PN;i++){pp[i*3]=rnd(-150,150);pp[i*3+1]=rnd(1,14);pp[i*3+2]=rnd(-150,150)}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));const motes=new THREE.Points(pg,new THREE.PointsMaterial({color:0x9dffb5,size:.35,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(motes);
// ---------- materials ----------
const stone=new THREE.MeshStandardMaterial({color:0x9aa898,roughness:.9}),gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.85,roughness:.28}),jadeBase=new THREE.MeshStandardMaterial({color:0x2fbf71,emissive:0x0c5a30,roughness:.25,metalness:.2});
// ---------- portal hub ----------
const hub=new THREE.Group();hub.position.set(0,H(0,0),0);scene.add(hub);
const plat=new THREE.Mesh(new THREE.CylinderGeometry(9,9.6,.6,32),stone);plat.position.y=.1;plat.receiveShadow=true;hub.add(plat);
for(let i=0;i<8;i++){const a=i*Math.PI/4,col=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,5,8),stone);col.position.set(Math.cos(a)*8,2.8,Math.sin(a)*8);col.castShadow=true;hub.add(col);const cap=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),gold);cap.position.set(Math.cos(a)*8,5.5,Math.sin(a)*8);hub.add(cap)}
const ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,.28,12,48),gold);ring.position.set(0,3.6,-4);ring.castShadow=true;hub.add(ring);
const portalMat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,uniforms:{t:{value:0}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec2 u;uniform float t;void main(){vec2 p=u-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float s=sin(a*6.+t*2.-r*10.)*.5+.5;vec3 c=mix(vec3(.1,.9,.5),vec3(1.,.85,.4),s*r);gl_FragColor=vec4(c,(1.-smoothstep(.85,1.,r))*(.55+.35*s));}'});
const portal=new THREE.Mesh(new THREE.CircleGeometry(2.4,48),portalMat);portal.position.copy(ring.position);hub.add(portal);
const pl=new THREE.PointLight(0x7dffb5,14,22);pl.position.set(0,3.6,-3);hub.add(pl);
const PORTAL_POS=new THREE.Vector3(0,hub.position.y,-4);
// ---------- shrines (only active surah) ----------
let shrines=[],active=null;
function makeShrine(s,a,i){const[x,z]=slots[i],y=H(x,z);const g=new THREE.Group();g.position.set(x,y,z);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(3,3.4,.8,8),stone);base.position.y=.3;base.receiveShadow=base.castShadow=true;g.add(base);
 for(let p=0;p<4;p++){const pil=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,4,8),stone);const pa=p*Math.PI/2+Math.PI/4;pil.position.set(Math.cos(pa)*2.2,2.7,Math.sin(pa)*2.2);pil.castShadow=true;g.add(pil)}
 const dome=new THREE.Mesh(new THREE.SphereGeometry(2.6,20,10,0,Math.PI*2,0,Math.PI/2),gold);dome.position.y=4.7;dome.castShadow=true;g.add(dome);
 const fin=new THREE.Mesh(new THREE.ConeGeometry(.2,1.2,8),gold);fin.position.y=7.8;g.add(fin);
 const crys=new THREE.Mesh(new THREE.OctahedronGeometry(.9),jadeBase.clone());crys.position.y=2.4;g.add(crys);
 const light=new THREE.PointLight(0x3dffa0,7,15);light.position.y=2.4;g.add(light);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,60,12,1,true),new THREE.MeshBasicMaterial({color:0x6dffb0,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=32;g.add(beam);
 // ayah number plaque
 const cv=document.createElement('canvas');cv.width=cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#ffd97a';cx.font='bold 70px Georgia';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(a.n,64,68);
 const lbl=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));lbl.position.y=9.3;lbl.scale.set(2.4,2.4,1);g.add(lbl);
 scene.add(g);return{g,crys,light,beam,s,a,id:s.id+':'+a.n,pos:new THREE.Vector3(x,y,z)}}
function refreshShrine(sh){const d=save.done[sh.id];sh.crys.material.color.set(d?0xffe680:0x2fbf71);sh.crys.material.emissive.set(d?0xb88a00:0x0c5a30);sh.light.color.set(d?0xffd97a:0x3dffa0);sh.beam.material.color.set(d?0xffe9a0:0x6dffb0);sh.beam.material.opacity=d?.2:.1}
function setSurah(id){shrines.forEach(sh=>{scene.remove(sh.g);sh.g.traverse(o=>{o.geometry&&o.geometry!==undefined&&o.geometry.dispose?.();if(o.material?.map)o.material.map.dispose()})});
 active=BYID[id]||SURAHS[0];save.active=active.id;shrines=active.ayahs.map((a,i)=>makeShrine(active,a,i));shrines.forEach(refreshShrine);persist();hud()}
// ---------- hero ----------
const hero=new THREE.Group();const robe=new THREE.MeshStandardMaterial({color:0x1d6b45,roughness:.7}),skin=new THREE.MeshStandardMaterial({color:0xd9a77a});
const body=new THREE.Mesh(new THREE.ConeGeometry(.75,2,12),robe);body.position.y=1;body.castShadow=true;hero.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),skin);head.position.y=2.25;head.castShadow=true;hero.add(head);
const hood=new THREE.Mesh(new THREE.SphereGeometry(.45,16,12,0,Math.PI*2,0,Math.PI*.6),robe);hood.position.set(0,2.3,-.05);hood.rotation.x=-.3;hero.add(hood);
const sash=new THREE.Mesh(new THREE.TorusGeometry(.48,.07,8,20),gold);sash.position.y=1.25;sash.rotation.x=Math.PI/2;hero.add(sash);
const cape=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.7,1,4),new THREE.MeshStandardMaterial({color:0x0f4a2c,side:THREE.DoubleSide}));cape.position.set(0,1.2,-.42);cape.rotation.x=.15;hero.add(cape);
const staff=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.6),new THREE.MeshStandardMaterial({color:0x5a3a20}));staff.position.set(.7,1.3,.2);hero.add(staff);
const orb=new THREE.Mesh(new THREE.SphereGeometry(.15),new THREE.MeshBasicMaterial({color:0x9dffb5}));orb.position.set(.7,2.65,.2);hero.add(orb);const hl=new THREE.PointLight(0x9dffb5,3,8);hl.position.copy(orb.position);hero.add(hl);
const guide=new THREE.Mesh(new THREE.ConeGeometry(.25,.8,8).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0x9dffb5,transparent:true,opacity:.85}));guide.position.y=3.4;scene.add(guide);
scene.add(hero);
// ---------- input ----------
const keys={};let yaw=Math.PI,pitch=.38,zoom=11,drag=null,vy=0,started=false,joy={x:0,y:0};
const modalOpen=()=>$('dlg').style.display==='block'||$('sel').style.display==='block';
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(!started)return;
 if(e.code==='KeyE'&&!modalOpen())interact();if(e.code==='Escape'){closeDlg();closeSel()}if(e.code==='KeyM'||e.code==='Tab'){e.preventDefault();$('sel').style.display==='block'?closeSel():openSel()}});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
const cv0=R.domElement;
cv0.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.clientX>innerWidth*.35)drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)drag=null});
addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId&&!modalOpen()){yaw-=(e.clientX-drag.x)*.006;pitch=Math.min(1.25,Math.max(.05,pitch+(e.clientY-drag.y)*.005));drag.x=e.clientX;drag.y=e.clientY}});
addEventListener('wheel',e=>zoom=Math.min(26,Math.max(4,zoom+e.deltaY*.01)),{passive:true});
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)});
if('ontouchstart' in window||navigator.maxTouchPoints>0)document.body.classList.add('touchui');
{const J=$('joy'),K=$('knob');let jid=null;const mv=e=>{const r=J.getBoundingClientRect();let dx=e.clientX-r.left-65,dy=e.clientY-r.top-65;const l=Math.hypot(dx,dy);if(l>50){dx*=50/l;dy*=50/l}K.style.left=40+dx+'px';K.style.top=40+dy+'px';joy={x:dx/50,y:dy/50}};
 J.addEventListener('pointerdown',e=>{jid=e.pointerId;J.setPointerCapture(jid);mv(e)});J.addEventListener('pointermove',e=>{if(e.pointerId===jid)mv(e)});
 const up=()=>{jid=null;joy={x:0,y:0};K.style.left=K.style.top='40px'};J.addEventListener('pointerup',up);J.addEventListener('pointercancel',up);
 $('act').onclick=()=>{if(started&&!modalOpen())interact()}}
$('prompt').onclick=()=>{if(!modalOpen())interact()};
// ---------- HUD ----------
function hud(){const l=lvlOf(save.xp);$('lvl').textContent=l;$('xp').style.width=(100*(save.xp-xpFor(l))/(xpFor(l+1)-xpFor(l)))+'%';$('xpt').textContent=save.xp+' XP';
 const fin=SURAHS.filter(s=>doneCount(s)===s.ayahs.length).length;$('tot').textContent=`Surahs ${fin}/${SURAHS.length}`;
 if(!active)return;const s=active,n=doneCount(s),t=T(s.id);
 $('sname').innerHTML=`${s.id}. ${s.name} <span class="ar" style="font-size:16px">${s.arName}</span>`;$('sp').style.width=100*n/s.ayahs.length+'%';$('sprog').textContent=`${n}/${s.ayahs.length} ayahs`;
 $('best').textContent=save.best[s.id]?'🏆 Best '+fmt(save.best[s.id]):'🏆 Best —';$('eta').textContent=n===s.ayahs.length?'✔ complete':'≈ '+fmt(eta(s))+' left';
 $('ql').innerHTML=`<div><b>${s.name}</b> · ${s.meaning}</div>`+s.ayahs.map(a=>`<div class="q ${save.done[s.id+':'+a.n]?'done':''}">Ayah ${a.n}</div>`).join('');tick()}
function tick(){if(active)$('clock').textContent=fmt(T(active.id).fin??T(active.id).el)}
function toast(t){const e=$('toast');e.innerHTML=t;e.style.display='block';e.classList.remove('fadein');void e.offsetWidth;e.classList.add('fadein');clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2400)}
function gainXP(n){const l0=lvlOf(save.xp);save.xp+=n;persist();hud();if(lvlOf(save.xp)>l0){sfx.level();toast('✦ Level '+lvlOf(save.xp)+' ✦');burst(hero.position,0xffd97a,120)}}
// ---------- bursts ----------
const bursts=[];function burst(p,color,n=80){const g=new THREE.BufferGeometry(),a=new Float32Array(n*3),v=[];for(let i=0;i<n;i++){a.set([p.x,p.y+2,p.z],i*3);v.push(new THREE.Vector3(rnd(-1,1),rnd(.5,2),rnd(-1,1)).multiplyScalar(6))}
 g.setAttribute('position',new THREE.BufferAttribute(a,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({color,size:.4,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(pts);bursts.push({pts,v,t:0})}
// ---------- surah selector ----------
function openSel(){const S=$('sel');S.style.display='block';S.classList.remove('fadein');void S.offsetWidth;S.classList.add('fadein');
 S.innerHTML=`<h2>📖 The Surah Book</h2><div style="font-family:Georgia;font-size:13px;opacity:.85">Choose a surah — its shrines will rise along the spiral path from the portal. Time estimates use ${save.words>=15?'your own pace ('+rate().toFixed(1)+' s/word)':'a default pace until you have completed a few ayahs'}.</div>
 <div id="grid">${SURAHS.map(s=>{const n=doneCount(s),f=n===s.ayahs.length,t=T(s.id);return `<div class="card ${s===active?'act':''} ${f?'fin':''}" data-id="${s.id}"><span class="ar">${s.arName}</span><b>${s.id}. ${s.name}</b><br>${s.meaning}<br>${n}/${s.ayahs.length} ayahs ${f?'🏅':''}<br>⏱ ${f?'done '+fmt(t.fin??t.el):'≈ '+fmt(eta(s))+(t.el?' · spent '+fmt(t.el):'')}<br>🏆 ${save.best[s.id]?fmt(save.best[s.id]):'—'}</div>`}).join('')}</div>
 <button class="b" id="selx">Close (Esc)</button>`;
 S.querySelectorAll('.card').forEach(c=>c.onclick=()=>{sfx.portal();closeSel();if(+c.dataset.id!==active.id){setSurah(+c.dataset.id);hero.position.set(0,H(0,0),4);toast(`${active.name} — ${active.ayahs.length} shrines await`)}});$('selx').onclick=closeSel}
function closeSel(){$('sel').style.display='none'}
// ---------- challenge ----------
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
let cur,nearSh=null,nearPortal=false;
function interact(){if(nearSh)openDlg(nearSh);else if(nearPortal)openSel()}
function openDlg(sh){cur=sh;cur.peeked=false;$('prompt').style.display='none';sfx.click();const t=T(sh.s.id);if(!t.run&&t.fin==null){t.run=true;toast('⏱ Timer started — '+sh.s.name)}cur.t0=t.el;study()}
function closeDlg(){$('dlg').style.display='none'}
const D=h=>{const d=$('dlg');d.style.display='block';d.innerHTML=h;d.classList.remove('fadein');void d.offsetWidth;d.classList.add('fadein')};
const header=()=>`<h2>Shrine of ${cur.s.name} · Ayah ${cur.a.n}</h2>`;
const num=n=>'﴿'+n.toLocaleString('ar-EG')+'﴾';
function study(){const a=cur.a;D(header()+`<div class="verse ar">${a.ar} <span style="color:#ffd97a">${num(a.n)}</span></div><div class="tr">${a.tr}</div><div class="en">“${a.en}”</div>
 <div style="font-family:Georgia;font-size:13px;opacity:.8">Read it slowly a few times. When ready, the shrine will test your memory.</div>
 <button class="b" id="go">I'm ready — Trial of Order</button><button class="b" id="cl">Leave (Esc)</button>`);$('go').onclick=order;$('cl').onclick=closeDlg}
function order(){const words=cur.a.ar.split(' ');if(words.length<2)return fill();
 // long ayahs: group into at most 8 phrase tiles
 const per=Math.ceil(words.length/8),parts=[];for(let i=0;i<words.length;i+=per)parts.push(words.slice(i,i+per).join(' '));
 let picked=[];let pool=shuffle(parts.map((w,i)=>({w,i})));if(pool.every((p,k)=>p.i===k))pool.reverse();
 const render=()=>{D(header()+`<div class="tr">Trial I · Arrange the ${per>1?'phrases':'words'} in order (right to left)</div><div class="en">“${cur.a.en}”</div>
  <div class="tiles" id="ans">${picked.map((p,k)=>`<span class="tile" data-k="${k}">${p.w}</span>`).join('')}</div>
  <div class="tiles" id="pool">${pool.map((p,k)=>picked.includes(p)?'':`<span class="tile" data-i="${k}">${p.w}</span>`).join('')}</div>
  <div class="msg" id="msg"></div><button class="b" id="chk">Check</button><button class="b" id="peek">Peek (−XP)</button><button class="b" id="cl">Leave</button>`);
  $('ans').querySelectorAll('.tile').forEach(t=>t.onclick=()=>{sfx.click();picked.splice(+t.dataset.k,1);render()});
  $('pool').querySelectorAll('.tile').forEach(t=>t.onclick=()=>{sfx.click();picked.push(pool[+t.dataset.i]);render();if(picked.length===parts.length)$('chk').click()});
  $('peek').onclick=()=>{cur.peeked=true;$('msg').innerHTML=`<span class="ar" style="font-size:22px">${cur.a.ar}</span>`};$('cl').onclick=closeDlg;
  $('chk').onclick=()=>{if(picked.length<parts.length){$('msg').innerHTML='<span class="bad">Place every tile first.</span>';return}
   if(picked.every((p,k)=>p.w===parts[k])){sfx.good();burst(cur.pos,0x9dffb5);gainXP(cur.peeked?10:20);fill()}else{sfx.bad();$('msg').innerHTML='<span class="bad">Not quite — tap placed tiles to return them and try again.</span>'}}};render()}
function fill(){const words=cur.a.ar.split(' ');const idx=Math.random()*words.length|0;const right=words[idx];
 const others=shuffle([...new Set(cur.s.ayahs.flatMap(a=>a.ar.split(' ')).concat(SURAHS[0].ayahs.flatMap(a=>a.ar.split(' '))))].filter(w=>w!==right)).slice(0,3);
 const opts=shuffle([right,...others]);
 D(header()+`<div class="tr">Trial II · Complete the ayah</div><div class="verse ar">${words.map((w,i)=>i===idx?'<span style="color:#ffd97a">﹏﹏</span>':w).join(' ')}</div><div class="en">“${cur.a.en}”</div>
 <div class="tiles">${opts.map((o,i)=>`<span class="tile" data-i="${i}">${o}</span>`).join('')}</div><div class="msg" id="msg"></div>`);
 document.querySelectorAll('#dlg .tile').forEach(t=>t.onclick=()=>{if(opts[+t.dataset.i]===right){sfx.good();finish()}else{sfx.bad();t.style.opacity=.3;cur.peeked=true;$('msg').innerHTML='<span class="bad">Try again.</span>'}})}
function finish(){const s=cur.s,t=T(s.id),first=!save.done[cur.id];save.done[cur.id]=1;
 if(first&&t.run){const spent=t.el-cur.t0;if(spent>2&&spent<1800){save.secs+=spent;save.words+=wc(cur.a)}}
 refreshShrine(cur);burst(cur.pos,0xffd97a,160);gainXP(first?(cur.peeked?20:40):10);
 const all=doneCount(s)===s.ayahs.length;let rec='';
 if(all&&t.run){t.run=false;t.fin=t.el;const b=save.best[s.id];if(!b||t.el<b){save.best[s.id]=t.el;rec=b?' — new best time!':''}gainXP(25+s.ayahs.length*3)}persist();hud();
 D(header()+`<div class="good" style="font-size:22px">✦ The shrine glows golden ✦</div><div class="verse ar">${cur.a.ar}</div>${all?`<div style="color:#ffd97a;font-size:18px">🏅 You have completed Surah ${s.name}${t.fin!=null?' in '+fmt(t.fin)+rec:''}! Recite it in full:</div><div class="ar" style="font-size:22px;line-height:2;max-height:40vh;overflow:auto">${s.ayahs.map(a=>a.ar+' '+num(a.n)).join(' ')}</div>`:''}
 <button class="b" id="cl">Continue</button>${all?'<button class="b" id="nx">Open Surah Book</button>':''}`);$('cl').onclick=closeDlg;if(all){$('nx').onclick=()=>{closeDlg();openSel()};toast('Surah '+s.name+' complete!')}}
$('book').onclick=()=>started&&openSel();
$('restart').onclick=()=>{if(!active||!confirm(`Retry ${active.name}? Its shrines will be relit from scratch and the timer reset (best time is kept).`))return;active.ayahs.forEach(a=>delete save.done[active.id+':'+a.n]);save.t[active.id]={el:0,run:false,fin:null};shrines.forEach(refreshShrine);persist();hud()};
// ---------- minimap ----------
const mc=$('mc').getContext('2d');const MR=70;
function minimap(){const W=320,S=W/2/MR;mc.clearRect(0,0,W,W);mc.save();mc.beginPath();mc.arc(160,160,158,0,7);mc.clip();mc.fillStyle='#0d3a22';mc.fillRect(0,0,W,W);
 mc.translate(160,160);mc.rotate(yaw+Math.PI);mc.scale(S,S);mc.translate(-hero.position.x,-hero.position.z);
 mc.fillStyle='#1d8a7a';mc.beginPath();mc.arc(LAKE.x,LAKE.z,LAKE.r,0,7);mc.fill();
 mc.fillStyle='#1a5a33';for(const[x,z]of trees)if(Math.abs(x-hero.position.x)<MR&&Math.abs(z-hero.position.z)<MR){mc.beginPath();mc.arc(x,z,1.6,0,7);mc.fill()}
 mc.fillStyle='#ffd97a';mc.beginPath();mc.arc(0,0,4,0,7);mc.fill();
 for(const sh of shrines){mc.fillStyle=save.done[sh.id]?'#ffd97a':'#5dffa8';mc.beginPath();mc.arc(sh.pos.x,sh.pos.z,save.done[sh.id]?1.6:2.4,0,7);mc.fill()}
 mc.restore();mc.fillStyle='#fff';mc.beginPath();mc.moveTo(160,148);mc.lineTo(168,170);mc.lineTo(160,165);mc.lineTo(152,170);mc.fill();mc.strokeStyle='#c9a646';mc.lineWidth=4;mc.beginPath();mc.arc(160,160,157,0,7);mc.stroke()}
// ---------- loop ----------
const clock=new THREE.Clock();hero.position.set(0,H(0,0),4);let mmT=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
 if(started&&!modalOpen()){const sp=(keys.ShiftLeft||keys.ShiftRight||Math.hypot(joy.x,joy.y)>.9?14:7)*dt;const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(-f.z,0,f.x);const mv=new THREE.Vector3();
  if(keys.KeyW||keys.ArrowUp)mv.add(f);if(keys.KeyS||keys.ArrowDown)mv.sub(f);if(keys.KeyD||keys.ArrowRight)mv.add(r);if(keys.KeyA||keys.ArrowLeft)mv.sub(r);mv.addScaledVector(f,-joy.y).addScaledVector(r,joy.x);
  if(mv.lengthSq()>.01){if(mv.length()>1)mv.normalize();hero.position.addScaledVector(mv,sp);const tr=Math.atan2(mv.x,mv.z);let d=tr-hero.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));hero.rotation.y+=d*.25;body.position.y=1+Math.abs(Math.sin(t*12))*.08;cape.rotation.x=.35+Math.sin(t*10)*.08}else cape.rotation.x=.15+Math.sin(t*2)*.03;
  hero.position.x=THREE.MathUtils.clamp(hero.position.x,-180,180);hero.position.z=THREE.MathUtils.clamp(hero.position.z,-180,180);
  if(Math.hypot(hero.position.x-LAKE.x,hero.position.z-LAKE.z)<LAKE.r*.8){const d=new THREE.Vector2(hero.position.x-LAKE.x,hero.position.z-LAKE.z).setLength(LAKE.r*.8);hero.position.x=LAKE.x+d.x;hero.position.z=LAKE.z+d.y}
  for(const sh of shrines){const d=new THREE.Vector2(hero.position.x-sh.pos.x,hero.position.z-sh.pos.z);if(d.length()<3.6&&d.length()>0){d.setLength(3.6);hero.position.x=sh.pos.x+d.x;hero.position.z=sh.pos.z+d.y}}
  const gy=H(hero.position.x,hero.position.z)+(Math.hypot(hero.position.x,hero.position.z)<9.4?.4:0);if(keys.Space&&hero.position.y<=gy+.01)vy=8;vy-=22*dt;hero.position.y=Math.max(gy,hero.position.y+vy*dt);if(hero.position.y===gy)vy=0;}
 // timer: runs while surah in progress, game started, tab visible, selector closed
 if(started&&active&&!document.hidden&&$('sel').style.display!=='block'){const tm=T(active.id);if(tm.run){tm.el+=dt;tick();if(performance.now()-lastPersist>5000)persist()}}
 // nearest
 nearSh=null;let best=1e9,bu=null,bud=1e9;for(const sh of shrines){const d=sh.pos.distanceTo(hero.position);if(d<6.5&&d<best){best=d;nearSh=sh}if(!save.done[sh.id]&&d<bud){bud=d;bu=sh}
  sh.crys.rotation.y=t;sh.crys.position.y=2.4+Math.sin(t*2+sh.pos.x)*.25;sh.light.intensity=6+Math.sin(t*3+sh.pos.z)*2}
 nearPortal=!nearSh&&hero.position.distanceTo(PORTAL_POS)<5.5;
 const pr=$('prompt');if(started&&!modalOpen()&&(nearSh||nearPortal)){pr.style.display='block';pr.innerHTML=nearSh?`<b>E</b> / tap — Shrine of ${nearSh.s.name}, Ayah ${nearSh.a.n}${save.done[nearSh.id]?' (lit — review)':''}`:'<b>E</b> / tap — Enter the Portal of Surahs'}else pr.style.display='none';
 // compass + guide arrow
 const tgtS=bu?bu.pos:PORTAL_POS;const dx=tgtS.x-hero.position.x,dz=tgtS.z-hero.position.z;
 const rel=Math.atan2(dx,dz)-Math.atan2(-Math.sin(yaw),-Math.cos(yaw));$('arrow').style.transform=`rotate(${-rel*180/Math.PI-90}deg)`;
 $('near').textContent=bu?`Next: ${bu.s.name} · Ayah ${bu.a.n} — ${Math.hypot(dx,dz)|0} m`:'All shrines lit — visit the Portal for a new surah';
 guide.position.set(hero.position.x,hero.position.y+3.3+Math.sin(t*3)*.1,hero.position.z);guide.lookAt(tgtS.x,guide.position.y,tgtS.z);guide.visible=started&&Math.hypot(dx,dz)>7;
 // camera
 const tgt=hero.position.clone().add(new THREE.Vector3(0,2.2,0));const cp=tgt.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(zoom));cp.y=Math.max(cp.y,H(cp.x,cp.z)+.8);
 if(!started)cp.set(Math.sin(t*.08)*45,24,Math.cos(t*.08)*45);cam.position.lerp(cp,started?.15:1);cam.lookAt(started?tgt:new THREE.Vector3(0,3,0));
 sun.position.set(hero.position.x+60,90,hero.position.z+40);sun.target.position.copy(hero.position);
 portalMat.uniforms.t.value=t;ring.rotation.z=t*.3;water.position.y=-2.3+Math.sin(t)*.05;wmat.emissive.setHSL(.47,.8,.05+Math.sin(t*.7)*.02);
 const p=motes.geometry.attributes.position;for(let i=0;i<PN;i++){p.array[i*3+1]+=Math.sin(t+i)*.01;p.array[i*3]+=Math.cos(t*.5+i)*.01}p.needsUpdate=true;
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.t+=dt;const a=b.pts.geometry.attributes.position;b.v.forEach((v,k)=>{v.y-=6*dt;a.array[k*3]+=v.x*dt;a.array[k*3+1]+=v.y*dt;a.array[k*3+2]+=v.z*dt});a.needsUpdate=true;b.pts.material.opacity=1-b.t/1.5;if(b.t>1.5){scene.remove(b.pts);b.pts.geometry.dispose();bursts.splice(i,1)}}
 if((mmT+=dt)>.1){mmT=0;minimap()}
 R.render(scene,cam)}
$('start').onclick=()=>{started=true;$('title').style.display='none';sfx.good();if(!localStorage.getItem(KEY+'seen')){localStorage.setItem(KEY+'seen',1);toast('Begin with Al-Fātiḥah — follow the arrow')}};
$('reset').onclick=()=>{if(confirm('Reset all progress, XP and times?')){save={xp:0,done:{},active:1,t:{},best:{},secs:0,words:0};persist();setSurah(1)}};
addEventListener('beforeunload',persist);document.addEventListener('visibilitychange',persist);
setSurah(save.active);loop();
window.__qq={get shrines(){return shrines},openDlg,openSel,setSurah,start:()=>$('start').click(),hero};
