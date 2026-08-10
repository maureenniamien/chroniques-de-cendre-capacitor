import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b14);
scene.fog = new THREE.Fog(0x080b14, 20, 52);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 9, 14);
const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, true);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9eb8e8, 0x180d12, 1.25));
const moon = new THREE.DirectionalLight(0xc8d9ff, 1.7);
moon.position.set(-8, 15, 8); moon.castShadow = true; scene.add(moon);
const fire = new THREE.PointLight(0xe56c3a, 2.1, 18); fire.position.set(0, 3, 1); scene.add(fire);function buildSky(){const dome=new THREE.Mesh(new THREE.SphereGeometry(58,32,20),new THREE.MeshBasicMaterial({color:0x101a38,side:THREE.BackSide,fog:false}));dome.name='night_sky_dome';scene.add(dome);const starGeo=new THREE.BufferGeometry();const pts=[];for(let i=0;i<260;i++){const a=Math.random()*Math.PI*2;const y=10+Math.random()*25;const r=28+Math.random()*18;pts.push(Math.cos(a)*r,y,Math.sin(a)*r-10);}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xbad4ff,size:.09,transparent:true,opacity:.85}));stars.name='cave_stars';scene.add(stars);const moon=new THREE.Mesh(new THREE.SphereGeometry(2.1,24,16),new THREE.MeshBasicMaterial({color:0xffdca4}));moon.name='moon_light';moon.position.set(-18,18,-26);scene.add(moon);const moonGlow=new THREE.Mesh(new THREE.SphereGeometry(3.2,24,16),new THREE.MeshBasicMaterial({color:0xff9d5c,transparent:true,opacity:.08}));moonGlow.position.copy(moon.position);scene.add(moonGlow);}buildSky();

const message = document.getElementById('message');
const statusEl = document.getElementById('status');
const combat = document.getElementById('combat');
const combatStats = document.getElementById('combatStats');
const combatLog = document.getElementById('combatLog');
const keys = {};
const loader = new GLTFLoader();
const mixers = [];const effects=[];const ambientMusic=new Audio('https://cdn.cinevva.com/elevenlabs-music/1bf676d5-b6ed-422a-aa84-a87b31b9753e.mp3');ambientMusic.loop=true;ambientMusic.volume=.28;let audioStarted=false;function startAudio(){if(audioStarted)return;audioStarted=true;ambientMusic.play().catch(()=>{});}addEventListener('pointerdown',startAudio,{once:true});addEventListener('keydown',startAudio,{once:true});
const heroURLs = {
  Knight:'https://cdn.cinevva.com/assets/packs/quaternius/ultimate-animated-characters/Knight_Golden_Male.glb',
  Wizard:'https://cdn.cinevva.com/assets/packs/quaternius/ultimate-animated-characters/Wizard.glb'
};
const HERO_SOURCES = {
  Guerrier:{url:'assets/heroes/guerrier.glb',local:true},
  Paladin:{url:'assets/heroes/paladin.glb',local:true},
  Assassin:{url:'assets/heroes/assassin.glb',local:true},
  Mage:{url:heroURLs.Wizard,local:false},
  Archer:{url:heroURLs.Knight,local:false}
};
const heroCache = {};
let mode='home', stage=1, room=0, score=0, selected='Archer', heroName='Aventurier';
let player, enemy, heroModel, heroMixer, enemyMixer, door=null;let doorOpenProgress=0;const firstPerson=false;
let heroHp=100, maxHp=100, mana=100, maxMana=100, potions=2, attackCooldown=0;

const DATA = {
  Archer:{hp:90,damage:18,speed:7,skill:'Pluie de flèches',desc:'Rapide et précis.'},
  Assassin:{hp:75,damage:25,speed:8,skill:'Frappe dans l’ombre',desc:'Critiques et mobilité.'},
  Guerrier:{hp:135,damage:16,speed:5.5,skill:'Tourbillon de fer',desc:'Armure lourde et brutalité.'},
  Mage:{hp:78,damage:14,speed:6,skill:'Météore de cendre',desc:'Sorts puissants à distance.'},
  Paladin:{hp:120,damage:15,speed:5.7,skill:'Jugement sacré',desc:'Bouclier, soin et lumière.'}
};
const ART = {
  Mage:'https://cdn.cinevva.com/flux/98f1c9cb-9f3c-4505-ac30-f71cc746146f/image.png',
  Paladin:'https://cdn.cinevva.com/flux/6707e618-6cdb-46b0-a22b-da6c5a8256c7/image.png',
  Guerrier:'https://cdn.cinevva.com/flux/ecf28700-91d4-4f5f-807a-5de1887b1572/image.png',
  Archer:'https://cdn.cinevva.com/flux/9fad65ae-4369-4436-80c3-166777bd1b25/image.png',
  Assassin:'https://cdn.cinevva.com/flux/83d6f834-08ed-4e0e-9bda-35361ce7fe13/image.png'
};

function resize(){ renderer.setSize(innerWidth,innerHeight,true); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
function mat(color, emissive=0){ return new THREE.MeshStandardMaterial({color, roughness:.72, metalness:.12, emissive, emissiveIntensity:emissive?1.4:0}); }function tierForStage(){return stage>=15?3:stage>=10?2:stage>=5?1:0;}function tierName(){return ['Novice','Aguerri','Élite','Légendaire'][tierForStage()];}function tierColor(){return [0x6f7894,0xc78b4f,0x6fd6e8,0xffd36f][tierForStage()];}
function clearWorld(){ for(let i=scene.children.length-1;i>=0;i--){const o=scene.children[i]; if(o.userData.room || o.userData.actor) scene.remove(o);} }
function addPillar(x,z){ const g=new THREE.Group();g.name='stone_pillar';g.userData.room=true;const base=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,.35,8),mat(0x393746));base.position.y=.18;const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.38,.5,2.5,8),mat(0x272837));shaft.position.y=1.55;const cap=new THREE.Mesh(new THREE.CylinderGeometry(.62,.48,.3,8),mat(0x424153));cap.position.y=2.9;g.add(base,shaft,cap);g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(g); }function addDoor(){const g=new THREE.Group();g.name='room_door';g.userData.room=true;const stone=mat(0x414052);const wood=mat(0x4b2b24);for(const x of [-1.65,1.65]){const post=new THREE.Mesh(new THREE.BoxGeometry(.45,4.2,.65),stone);post.position.set(x,2.1,-8.45);g.add(post);}const lintel=new THREE.Mesh(new THREE.BoxGeometry(3.75,.55,.7),stone);lintel.position.set(0,4.05,-8.45);g.add(lintel);const leaf=new THREE.Mesh(new THREE.BoxGeometry(3.1,3.45,.22),wood);leaf.name='door_leaf';leaf.position.set(0,1.78,-8.1);leaf.castShadow=true;g.add(leaf);const rune=new THREE.Mesh(new THREE.TorusGeometry(.48,.055,8,24),mat(0x6fd6e8,0x1b7a96));rune.position.set(0,2.1,-7.95);rune.userData.doorRune=true;g.add(rune);scene.add(g);door=g;doorOpenProgress=0;}function addCampTier(){const t=tierForStage();const bed=new THREE.Mesh(new THREE.BoxGeometry(2.4,.16,1),mat(t>=2?0x543e65:0x49352f));bed.position.set(-4,.1,2.5);bed.rotation.y=-.2;bed.userData.room=true;scene.add(bed);const rack=new THREE.Group();rack.name='weapon_rack';rack.userData.room=true;const postMat=mat(0x3a241b);for(const x of [-.8,.8]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,1.7,8),postMat);p.position.set(8+x,.85,2);rack.add(p);}for(let i=0;i<Math.max(1,t+1);i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.08,1.3,.16),mat(t>=2?0x77cfe2:0x8d8f9a));blade.position.set(7.5+i*.45,1.25,2);blade.rotation.z=-.15;rack.add(blade);}scene.add(rack);if(t>=2){const rune=new THREE.Mesh(new THREE.TorusGeometry(1.5,.045,8,32),mat(t===3?0xffd36f:0x6fd6e8,t===3?0xff8a32:0x1a6680));rune.rotation.x=Math.PI/2;rune.position.set(0,.08,0);rune.userData.room=true;scene.add(rune);}}function addLavaTier(){const t=tierForStage();const count=10+t*8;for(let i=0;i<count;i++){const v=new THREE.Mesh(new THREE.BoxGeometry(.14,.035,3.2+Math.random()*2),mat(t>=2?0xff8a3d:0xe15d35,t>=3?0xff3d12:0x9c2815));v.position.set((Math.random()-.5)*24,.03,(Math.random()-.5)*14);v.rotation.y=Math.random()*Math.PI;v.userData.room=true;scene.add(v);}}function addTorch(x,z){const g=new THREE.Group();g.name='wall_torch';g.userData.room=true;const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,1.35,8),mat(0x3a211a));post.position.y=1.4;const flame=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),mat(0xff6b32,0xff3d12));flame.scale.y=1.5;flame.position.y=2.15;g.add(post,flame);g.position.set(x,0,z);scene.add(g);}function addRuinArch(x,z,rot=0){const g=new THREE.Group();g.name='ruin_arch';g.userData.room=true;const stone=mat(0x313344);for(const dx of [-1.3,1.3]){const p=new THREE.Mesh(new THREE.BoxGeometry(.65,3.6,.75),stone);p.position.set(dx,1.8,0);g.add(p);}const top=new THREE.Mesh(new THREE.BoxGeometry(3.2,.7,.75),stone);top.position.y=3.5;g.add(top);g.rotation.y=rot;g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(g);}
function buildRoom(type='dungeon'){
  clearWorld();
  const floor=new THREE.Mesh(new THREE.BoxGeometry(28,.45,18),mat(type==='lava'?0x3a1718:0x222432)); floor.position.y=-.25; floor.receiveShadow=true; floor.userData.room=true; scene.add(floor);
  const wallMat=mat(type==='lava'?0x241116:0x171a26);
  for(const [x,z,sx,sz] of [[-8,-9,12,.5],[8,-9,12,.5],[0,9,28,.5],[-14,0,.5,18],[14,0,.5,18]]){const w=new THREE.Mesh(new THREE.BoxGeometry(sx,5,sz),wallMat);w.position.set(x,2.5,z);w.userData.room=true;w.receiveShadow=true;scene.add(w);}
  for(const [x,z] of [[-11,-6],[11,-6],[-11,6],[11,6]]) addPillar(x,z);addTorch(-13,-2);addTorch(13,2);addRuinArch(-5,-8,0);addRuinArch(5,8,Math.PI);addDoor();
  if(type==='camp')addCampTier();if(type==='lava')addLavaTier();
  player=new THREE.Group(); player.name='player3D'; player.userData.actor=true; player.position.set(0,0,4.8); player.rotation.y=window.__lastPlayerRotY||0; const marker=new THREE.Mesh(new THREE.RingGeometry(.62,.78,32),new THREE.MeshBasicMaterial({color:0xffd36f,transparent:true,opacity:.38,side:THREE.DoubleSide}));marker.name='player_visibility_ring';marker.rotation.x=-Math.PI/2;marker.position.y=.035;player.add(marker);scene.add(player); attachHero();
}
function attachHero(){ const kind=selected; const src=HERO_SOURCES[kind]; const cached=heroCache[kind]; if(cached){putHero(cached,kind,src.local);return;} loader.load(src.url, gl=>{heroCache[kind]=gl; if(player)putHero(gl,kind,src.local);}, undefined, ()=>{createVisibleFallback(kind);}); }function createVisibleFallback(kind){if(!player||heroModel)return;heroModel=new THREE.Group();heroModel.name=kind+'_fallback_hero';const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.9,8,14),mat(kind==='Mage'?0x342a5a:0x6b3c39));body.position.y=1.05;const hood=new THREE.Mesh(new THREE.SphereGeometry(.52,16,12),mat(0x171626));hood.scale.y=1.1;hood.position.y=1.95;const visor=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),mat(0x6fd6e8,0x6fd6e8));visor.scale.set(1.4,.7,.35);visor.position.set(0,1.95,.43);heroModel.add(body,hood,visor);heroModel.userData.fallback=true;heroModel.visible=!firstPerson;player.add(heroModel);}
const CLASS_TINT={Archer:0x7c9a5c,Assassin:0x3a2f45,Guerrier:0x8a3b2a,Paladin:0xe8d9a0,Mage:0xffffff};
function buildProceduralClips(root){
  const bones={}; root.traverse(o=>{ if(o.isBone) bones[o.name.replace('mixamorig:','')]=o; });
  if(!bones['Hips'])return null;
  function bindQ(n){ return bones[n]?bones[n].quaternion.clone():new THREE.Quaternion(); }
  function qtrack(n,times,eulers){ const base=bindQ(n); const values=[]; for(const [x,y,z] of eulers){ const q=base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z))); values.push(q.x,q.y,q.z,q.w);} return new THREE.QuaternionKeyframeTrack('mixamorig:'+n+'.quaternion',times,values); }
  function hipsY(times,deltas){ const base=bones['Hips'].position.clone(); const values=[]; for(const dy of deltas) values.push(base.x,base.y+dy,base.z); return new THREE.VectorKeyframeTrack('mixamorig:Hips.position',times,values); }
  const idleT=[0,1.2,2.4];
  const idle=new THREE.AnimationClip('Idle',2.4,[
    hipsY(idleT,[0,.015,0]),
    qtrack('Spine',idleT,[[0,0,0],[.025,0,0],[0,0,0]]),
    qtrack('LeftArm',idleT,[[0,0,0],[.05,0,.02],[0,0,0]]),
    qtrack('RightArm',idleT,[[0,0,0],[.05,0,-.02],[0,0,0]]),
    qtrack('Head',idleT,[[0,0,0],[0,.03,0],[0,0,0]]),
  ]);
  const wT=[0,.225,.45,.675,.9];
  const walk=new THREE.AnimationClip('Walk',.9,[
    qtrack('LeftUpLeg',wT,[[0,0,0],[-.5,0,0],[0,0,0],[.5,0,0],[0,0,0]]),
    qtrack('RightUpLeg',wT,[[0,0,0],[.5,0,0],[0,0,0],[-.5,0,0],[0,0,0]]),
    qtrack('LeftLeg',wT,[[.1,0,0],[.6,0,0],[.1,0,0],[.1,0,0],[.1,0,0]]),
    qtrack('RightLeg',wT,[[.1,0,0],[.1,0,0],[.1,0,0],[.6,0,0],[.1,0,0]]),
    qtrack('LeftArm',wT,[[0,0,0],[.35,0,0],[0,0,0],[-.35,0,0],[0,0,0]]),
    qtrack('RightArm',wT,[[0,0,0],[-.35,0,0],[0,0,0],[.35,0,0],[0,0,0]]),
    qtrack('Spine',wT,[[0,.03,0],[0,0,0],[0,-.03,0],[0,0,0],[0,.03,0]]),
    hipsY(wT,[0,.045,0,.045,0]),
  ]);
  const rT=[0,.15,.3,.45,.6];
  const run=new THREE.AnimationClip('Run',.6,[
    qtrack('LeftUpLeg',rT,[[0,0,0],[-.8,0,0],[0,0,0],[.8,0,0],[0,0,0]]),
    qtrack('RightUpLeg',rT,[[0,0,0],[.8,0,0],[0,0,0],[-.8,0,0],[0,0,0]]),
    qtrack('LeftLeg',rT,[[.2,0,0],[.9,0,0],[.2,0,0],[.2,0,0],[.2,0,0]]),
    qtrack('RightLeg',rT,[[.2,0,0],[.2,0,0],[.2,0,0],[.9,0,0],[.2,0,0]]),
    qtrack('LeftArm',rT,[[0,0,0],[.5,0,0],[0,0,0],[-.5,0,0],[0,0,0]]),
    qtrack('RightArm',rT,[[0,0,0],[-.5,0,0],[0,0,0],[.5,0,0],[0,0,0]]),
    qtrack('Spine',rT,[[0,.05,.03],[0,0,0],[0,-.05,.03],[0,0,0],[0,.05,.03]]),
    hipsY(rT,[0,.06,0,.06,0]),
  ]);
  const aT=[0,.15,.3,.5];
  const slash=new THREE.AnimationClip('SwordSlash',.5,[
    qtrack('RightArm',aT,[[0,0,0],[-1.15,.3,0],[.55,-.2,0],[0,0,0]]),
    qtrack('RightForeArm',aT,[[0,0,0],[-.35,0,0],[.2,0,0],[0,0,0]]),
    qtrack('Spine',aT,[[0,0,0],[0,-.14,0],[0,.1,0],[0,0,0]]),
  ]);
  return [idle,walk,run,slash];
}
function putHero(gl,kind,isLocal){ if(heroModel&&heroModel.parent)heroModel.parent.remove(heroModel); heroModel=gl.scene.clone(true); heroModel.name=kind+'_hero_model'; heroModel.scale.setScalar(isLocal?1.05:(kind==='Mage'?.92:(kind==='Guerrier'?1.22:kind==='Assassin'?1.05:1.15))); heroModel.rotation.y=Math.PI; const tint=CLASS_TINT[selected]||0xffffff; heroModel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!isLocal&&kind!=='Mage'&&tint!==0xffffff){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(tint));}if(tierForStage()>=2&&o.material&&o.material.emissive){o.material.emissive.setHex(tierColor());o.material.emissiveIntensity=tierForStage()===3?1.2:.55;}}}); player.add(heroModel);heroModel.visible=!firstPerson;decorateHero(kind); heroMixer=new THREE.AnimationMixer(heroModel); heroModel.userData.active='Idle'; const clips=(gl.animations&&gl.animations.length)?gl.animations:buildProceduralClips(heroModel); heroModel.userData.animations=clips||[]; const idle=clips&&(THREE.AnimationClip.findByName(clips,'Idle')||clips[0]); if(idle)heroMixer.clipAction(idle).play(); mixers.push(heroMixer); }function decorateHero(kind){const t=tierForStage();const deco=new THREE.Group();deco.name='hero_tier_'+tierName().toLowerCase();const col=tierColor();if(t>=1){for(const x of [-.52,.52]){const pauldron=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),mat(t>=2?0x9f714e:0x5e5d69));pauldron.scale.set(1,.55,1);pauldron.position.set(x,1.45,0);deco.add(pauldron);}}if(kind==='Mage'){const sash=new THREE.Mesh(new THREE.TorusGeometry(.42,.035,8,24),mat(col,t>=2?col:0));sash.rotation.x=Math.PI/2;sash.position.y=1.2;deco.add(sash);}if(selected==='Archer'){const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.14,.11,.85,8),mat(0x4a3624));quiver.rotation.z=.25;quiver.position.set(-.3,1.55,.15);deco.add(quiver);}if(selected==='Assassin'){for(const x of [-.28,.28]){const dagger=new THREE.Mesh(new THREE.ConeGeometry(.05,.42,6),mat(0x2c2c33));dagger.rotation.x=Math.PI;dagger.position.set(x,.95,-.32);deco.add(dagger);}}if(selected==='Paladin'){const cape=new THREE.Mesh(new THREE.PlaneGeometry(.85,1.55),mat(0xc7273a));cape.position.set(0,1.35,.42);cape.rotation.y=Math.PI;deco.add(cape);}if(t>=2){for(const y of [1.1,1.8,2.45]){const rune=new THREE.Mesh(new THREE.TorusGeometry(.48,.018,6,20),mat(col,col));rune.rotation.x=Math.PI/2;rune.position.y=y;deco.add(rune);}}if(t===3){const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.06,10,32),mat(0xffd36f,0xff8a32));halo.rotation.x=Math.PI/2;halo.position.y=2.65;deco.add(halo);for(let i=0;i<8;i++){const orb=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),mat(0xffd36f,0xff8a32));const a=i/8*Math.PI*2;orb.position.set(Math.cos(a)*.78,1.6+Math.sin(a)*.7,Math.sin(a)*.18);deco.add(orb);}}heroModel.add(deco);}
function heroClip(name){ if(!heroMixer||!heroModel||heroModel.userData.active===name)return; const clip=THREE.AnimationClip.findByName(heroModel.userData.animations,name); if(!clip)return; heroMixer.stopAllAction(); heroMixer.clipAction(clip).reset().fadeIn(.1).play(); heroModel.userData.active=name; }
const texLoader=new THREE.TextureLoader();
function enemyMesh(boss=false,imgPath='assets/monsters/monster_squelettique.jpg'){
  const g=new THREE.Group();g.name='enemy3D';g.userData.actor=true;
  const tex=texLoader.load(imgPath);tex.colorSpace=THREE.SRGBColorSpace;
  const h=boss?3.6:2.2;const w=h*.64;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex}));sprite.scale.set(w,h,1);sprite.position.y=h/2;g.add(sprite);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(w*.42,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.4}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;g.add(shadow);
  if(boss){const glow=new THREE.PointLight(0xff5a2e,2.6,12);glow.position.set(0,h*.5,.6);g.add(glow);}
  const t=tierForStage();if(t>=1){const aura=new THREE.Mesh(new THREE.TorusGeometry(boss?1.25:.85,.05,8,24),mat(t===3?0xff5b37:0x8b6cff,t>=2?0xff3b18:0x27164f));aura.rotation.x=Math.PI/2;aura.position.y=.08;g.add(aura);}if(t===3){const crown=new THREE.Mesh(new THREE.TorusGeometry(boss?1.5:1,.06,8,24),mat(0xffd36f,0xff5b18));crown.rotation.x=Math.PI/2;crown.position.y=boss?3.1:2.2;g.add(crown);}g.position.set(0,0,-3);scene.add(g);return g;
}
const MONSTERS=[['Gobelin féroce','assets/monsters/goblin_feroce.jpg'],['Golem de lave','assets/monsters/monster_golem_lave.jpg'],['Chauve-souris','assets/monsters/monster_chauve_souris.jpg'],['Spectre d’ombre','assets/monsters/monster_spectre_ombre.jpg'],['Squelette','assets/monsters/monster_squelettique.jpg'],['Chimère nocturne','assets/monsters/monster_chimere_nocturne.jpg'],['Chien de lave','assets/monsters/monster_chien_lava.jpg'],['Esprit de fumée','assets/monsters/monster_esprit_fumee.jpg'],['Horreur grise','assets/monsters/monster_horreur_grise.jpg'],['Colosse démoniaque','assets/monsters/monster_colosse_demoniaque.jpg']];
function spawnEnemy(boss=false){if(enemy)scene.remove(enemy);const pick=boss?['Boss',`assets/bosses/boss_palier_${Math.min(stage,20)}.jpg`]:MONSTERS[(room+stage)%MONSTERS.length];enemy=enemyMesh(boss,pick[1]);enemy.userData.boss=boss;enemy.userData.hp=boss?120+stage*35:45+stage*8;enemy.userData.maxHp=enemy.userData.hp;enemy.userData.name=boss?`Boss du palier ${stage}`:pick[0];}
function hud(){statusEl.textContent=`${heroName} · ${selected} · Palier ${stage}/20 · Salle ${room} · PV ${Math.ceil(heroHp)}/${maxHp} · Score ${score}`;combatStats.innerHTML=`${enemy?.userData?.name||'Exploration'} · PV ${enemy?Math.ceil(enemy.userData.hp):0}/${enemy?enemy.userData.maxHp:0}`;combatLog.innerHTML=(window.combatMessages||[]).map(x=>`<div>${x}</div>`).join('');}
function log(x){window.combatMessages=window.combatMessages||[];window.combatMessages.unshift(x);hud();}
function skillBurst(color=0xffb35c){const orb=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),mat(color,color));orb.position.copy(player.position);orb.position.y+=1.25;scene.add(orb);effects.push({mesh:orb,life:.45});if(enemy){const from=player.position.clone();from.y+=1.25;const to=enemy.position.clone();to.y+=1.1;const dir=to.clone().sub(from);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,dir.length(),8),mat(color,color));beam.position.copy(from).add(to).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());scene.add(beam);effects.push({mesh:beam,life:.22});const hit=new THREE.Mesh(new THREE.TorusGeometry(.4,.07,8,18),mat(color,color));hit.rotation.x=Math.PI/2;hit.position.copy(to);scene.add(hit);effects.push({mesh:hit,life:.35});}}function attack(mult=1,skill='Attaque'){if(mode!=='combat'||attackCooldown>0||!enemy)return;const toEnemy=enemy.position.clone().sub(player.position);toEnemy.y=0;const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y);if(toEnemy.length()>4.2||forward.dot(toEnemy.normalize())<0.35){log('La cible doit être devant toi.');return;}attackCooldown=.38;skillBurst(selected==='Mage'?0x6fa8ff:selected==='Paladin'?0xffe8a3:0xff8b52);heroClip(selected==='Mage'?'Shoot_OneHanded':'SwordSlash');const d=Math.round((DATA[selected].damage+(selected==='Paladin'?4:0))*mult);enemy.userData.hp-=d;log(`${skill} inflige ${d} dégâts.`);if(enemy.userData.hp<=0){score+=enemy.userData.boss?stage*250:50;mode='explore';combat.classList.remove('show');if(enemy.userData.boss){if(stage>=20){finish(true);return;}stage++;room=1;buildRoom('lava');spawnEnemy(false);}else{room++;buildRoom(room%3===0?'camp':'dungeon');spawnEnemy(room>=4);}hud();return;}heroHp-=enemy.userData.boss?10:6;if(heroHp<=0){finish(false);return;}if(selected==='Mage')mana=Math.min(maxMana,mana+8);hud();}
function showHome(){mode='home';combat.classList.remove('show');message.classList.remove('hidden');message.innerHTML=`<div class="brand">Vertical slice 3D · Valdorne</div><h1>Chroniques de Cendre</h1><p class="muted">Des héros concrets, des armures visibles et des animations différentes selon ta classe — dans un donjon sombre en vue rapprochée.</p><input id="heroName" maxlength="18" value="${heroName}" placeholder="Nom du héros"><div class="classes" id="classes"></div><img id="preview" class="preview" src="${ART[selected]}"><p id="desc" class="muted"></p><button id="start">Entrer dans la grotte</button>`;const box=document.getElementById('classes');for(const n of Object.keys(DATA)){const b=document.createElement('button');b.textContent=n;b.className=n===selected?'active':'';b.onclick=()=>{selected=n;document.getElementById('preview').src=ART[n];document.getElementById('desc').textContent=DATA[n].desc;box.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');buildRoom();};box.appendChild(b);}document.getElementById('desc').textContent=DATA[selected].desc;document.getElementById('start').onclick=start;buildRoom();}
function start(){heroName=document.getElementById('heroName').value.trim()||'Aventurier';const d=DATA[selected];stage=1;room=1;score=0;heroHp=maxHp=d.hp;mana=maxMana=d.hp<90?110:80;potions=2;mode='explore';message.classList.add('hidden');buildRoom('corridor');enemy=null;log('Tu entres dans un couloir de ruines. La porte est devant toi.');hud();}
function finish(win){mode=win?'win':'dead';combat.classList.remove('show');message.classList.remove('hidden');message.innerHTML=`<div class="brand">${win?'Succès légendaire':'Défaite'}</div><h1>${win?'Le cycle est brisé':'La cendre t’emporte'}</h1><p class="muted">${win?'Les 20 boss ont été vaincus.':'Tu es tombé au palier '+stage+'.'}<br>Score : ${score}</p><button id="again">${win?'Retour à l’accueil':'Recommencer'}</button>`;document.getElementById('again').onclick=showHome;}
function update(dt){attackCooldown=Math.max(0,attackCooldown-dt);if(mode==='explore'||mode==='combat'){const x=(keys.d||keys.arrowright||keys.right?1:0)-(keys.a||keys.arrowleft||keys.left?1:0);const z=(keys.s||keys.arrowdown||keys.down?1:0)-(keys.w||keys.arrowup||keys.up?1:0);const moving=Math.hypot(x,z)>0;const n=Math.hypot(x,z)||1;player.position.x=THREE.MathUtils.clamp(player.position.x+x/n*DATA[selected].speed*dt,-11,11);player.position.z=THREE.MathUtils.clamp(player.position.z+z/n*DATA[selected].speed*dt,-8.8,6);if(moving){player.rotation.y=Math.atan2(x,z);heroClip(keys.shift?'Run':'Walk');window.__lastPlayerRotY=player.rotation.y;}else heroClip('Idle');if(heroModel&&heroModel.userData.fallback){heroModel.position.y=Math.sin(performance.now()*.006)*.03;}if(enemy&&mode==='explore'&&player.position.distanceTo(enemy.position)<2.3){mode='combat';combat.classList.add('show');log(`Combat engagé contre ${enemy.userData.name}.`);}if(mode==='explore'&&door&&player.position.z<-6.1){doorOpenProgress=Math.min(1,doorOpenProgress+dt*2.4);if(player.position.z<-8.15){room++;buildRoom(room%3===0?'treasure':'dungeon');spawnEnemy(false);}}}hud();}
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.code==='Space')attack();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const joystick=document.getElementById('joystick'),joystickKnob=document.getElementById('joystickKnob');let joyId=null;function resetJoy(){joyId=null;joystickKnob.style.transform='translate(0,0)';keys.up=keys.down=keys.left=keys.right=false;}function moveJoy(e){const r=joystick.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const max=42;const len=Math.hypot(dx,dy)||1;if(len>max){dx=dx/len*max;dy=dy/len*max;}joystickKnob.style.transform=`translate(${dx}px,${dy}px)`;const dead=8;keys.left=dx<-dead;keys.right=dx>dead;keys.up=dy<-dead;keys.down=dy>dead;}joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joystick.setPointerCapture(joyId);moveJoy(e);startAudio();});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)moveJoy(e);});joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);document.getElementById('touchAttack').onclick=()=>{startAudio();attack();};
document.getElementById('musicToggle').onclick=()=>{startAudio();ambientMusic.muted=!ambientMusic.muted;document.getElementById('musicToggle').textContent=ambientMusic.muted?'♫ Muet':'♫ Musique';};document.getElementById('attack').onclick=()=>{startAudio();attack();};document.getElementById('skill').onclick=()=>attack(selected==='Mage'?2.7:selected==='Assassin'?2.3:1.8,DATA[selected].skill);document.getElementById('potion').onclick=()=>{if(potions>0&&heroHp<maxHp){potions--;heroHp=Math.min(maxHp,heroHp+35);log('Potion utilisée : +35 PV.');}};document.getElementById('nextRoom').onclick=()=>{mode='explore';combat.classList.remove('show');player.position.z=3;hud();};
function animate(t){requestAnimationFrame(animate);const dt=Math.min(.033,(t-(animate.last||t))/1000||0);animate.last=t;update(dt);if(door){const leaf=door.getObjectByName('door_leaf');if(leaf){leaf.rotation.y=-doorOpenProgress*1.45;leaf.position.x=doorOpenProgress*1.35;}}for(const m of mixers)m.update(dt);for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.mesh.position.y+=dt*2;e.mesh.scale.multiplyScalar(1+dt*1.8);e.mesh.material.opacity=Math.max(0,e.life*2);e.mesh.material.transparent=true;if(e.life<=0){scene.remove(e.mesh);effects.splice(i,1);}}if(player){const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y);const desiredCam=player.position.clone().addScaledVector(forward,-7);desiredCam.y+=4.8;camera.position.lerp(desiredCam,Math.min(1,dt*5));camera.lookAt(player.position.x,player.position.y+1.35,player.position.z); }renderer.render(scene,camera);}
window.__game={scene,camera,renderer,player};window.getGameState=()=>({mode,stage,room,score,heroName,class:selected,hp:heroHp,mana,enemy:enemy?.userData?.name||null,player:player?{x:player.position.x,y:player.position.y,z:player.position.z}:null});window.setGameState=p=>{if(p.stage!==undefined)stage=p.stage;if(p.hp!==undefined)heroHp=p.hp;hud();};
resize();showHome();animate(0);
