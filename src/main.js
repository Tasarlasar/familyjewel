import * as THREE from 'three';
import { loadHospitalAssets } from './world/hospital-assets.js';
import { addHospitalVisualSlice } from './world/visual-slice.js';
import { createSpecimenJar } from './world/story-props.js';
import { applyHospitalSurfaceMaterials } from './world/surface-materials.js';

const $=s=>document.querySelector(s), sceneHost=$('#scene');
const renderScale=.8;const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(Math.floor(innerWidth*renderScale),Math.floor(innerHeight*renderScale),false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;sceneHost.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090b0c);scene.fog=new THREE.FogExp2(0x090b0c,.025);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.08,90);const player=new THREE.Group();scene.add(player);player.add(camera);camera.position.set(0,1.62,0);
const hemi=new THREE.HemisphereLight(0x75828a,0x201d19,.13);scene.add(hemi);const ambient=new THREE.AmbientLight(0x89908e,.035);scene.add(ambient);
const mat=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const wallMats=[mat(0x918c80),mat(0x777872),mat(0x69615d)],floorMats=[mat(0xb0ada2),mat(0x928f86),mat(0x756d69)],ceilingMat=mat(0x77766e),trimMat=mat(0x535148),rustMat=mat(0x4b3730),clothMat=mat(0x5a5b52),woodMat=mat(0x37302a),metalMat=mat(0x77766c,.62,.62);
applyHospitalSurfaceMaterials(THREE,wallMats,floorMats,ceilingMat);
const colliders=[],doors=[],interactables=[],throwables=[],soundEvents=[],lights=[],patrol=[],hospitalGeometry=[];
const boxGeo=new THREE.BoxGeometry(1,1,1), up=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3();
function box(parent,pos,size,material,opts={}){const m=new THREE.Mesh(boxGeo,material);m.position.set(...pos);m.scale.set(...size);m.castShadow=opts.cast??true;m.receiveShadow=true;if(opts.category){m.userData.hospitalCategory=opts.category;hospitalGeometry.push(m)}parent.add(m);if(opts.collide)colliders.push({mesh:m,box:new THREE.Box3().setFromObject(m)});return m}
function furnitureBox(parent,pos,size,material,opts={}){return box(parent,pos,size,material,{...opts,category:'furniture'})}
function pointLight(pos,color,intensity,distance,decay=2){const l=new THREE.PointLight(color,intensity,distance,decay);l.position.set(...pos);l.castShadow=false;scene.add(l);lights.push(l);return l}
const roomNames=[['RECEPTION','WAITING ROOM','PHARMACY','SECURITY','CONSULTATION','EMERGENCY'],['WARD A','WARD B','NURSES STATION','TREATMENT','RECORDS','BATHROOM'],['OPERATING ROOM','PREP ROOM','LABORATORY','DOCTOR’S OFFICE','STORAGE','OLD WARD']];
const roomCenters=[[-9,-7],[-1,-7],[7,-7],[-9,7],[-1,7],[7,7]];
const floorYs=[0,4.5,9]; let currentFloor=0,currentRoom='RECEPTION';
function addWall(x,y,z,w,h,d,material,collide=true){return box(scene,[x,y+h/2,z],[w,h,d],material,{collide,category:'wall'})}
const stairShaft={x0:12,x1:16,z0:-5.1,z1:5.1};
function addFloorSlab(y,material){
  box(scene,[-2.75,y-.12,0],[29.5,.24,22],material,{collide:true,cast:false,category:'floor'});
  box(scene,[16.75,y-.12,0],[1.5,.24,22],material,{collide:true,cast:false,category:'floor'});
  box(scene,[14,y-.12,-8.05],[4,.24,5.9],material,{collide:true,cast:false,category:'floor'});
  box(scene,[14,y-.12,8.05],[4,.24,5.9],material,{collide:true,cast:false,category:'floor'});
}
function addCeilingSlab(y,material){
  box(scene,[-2.75,y+3.5,0],[29.5,.22,22],material,{cast:false,category:'ceiling'});
  box(scene,[16.75,y+3.5,0],[1.5,.22,22],material,{cast:false,category:'ceiling'});
  box(scene,[14,y+3.5,-8.05],[4,.22,5.9],material,{cast:false,category:'ceiling'});
  box(scene,[14,y+3.5,8.05],[4,.22,5.9],material,{cast:false,category:'ceiling'});
}
const signCache=new Map();function roomSign(label,number,restricted=false){const key=`${label}-${number}-${restricted}`;if(signCache.has(key))return signCache.get(key);const c=document.createElement('canvas');c.width=384;c.height=112;const g=c.getContext('2d');g.fillStyle=restricted?'#382723':'#292c2b';g.fillRect(0,0,c.width,c.height);g.strokeStyle=restricted?'#9a5748':'#88887c';g.lineWidth=4;g.strokeRect(3,3,c.width-6,c.height-6);g.fillStyle='#bcb9aa';g.font='500 23px monospace';g.fillText(number,18,35);g.fillStyle=restricted?'#c17c6a':'#d0cec1';g.font='bold 26px monospace';g.fillText(label.slice(0,22),18,78);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:tex,roughness:.82,emissive:restricted?0x170806:0x080909,emissiveMap:tex});signCache.set(key,material);return material;}
function addFloor(fi){const y=floorYs[fi],wm=wallMats[fi],fm=floorMats[fi];addFloorSlab(y,fm);addCeilingSlab(y,ceilingMat);
  // Perimeter and six room shells. Front door gaps open onto the central corridor.
  if(fi===0){addWall(-9.5,y,-11,16,3.5,.35,wm);addWall(9.5,y,-11,16,3.5,.35,wm);addWall(0,y+2.35,-11,3,1.3,.35,wm);}else addWall(0,y,-11,35,3.5,.35,wm);addWall(-17.5,y,0,.35,3.5,22,wm);addWall(17.5,y,0,.35,3.5,22,wm);addWall(0,y,11,35,3.5,.35,wm);
  // corridor/room partition at z +/- 3.8 with openings in each room bay
  // Cross walls divide each wing into three distinct rooms, with narrow connecting gaps.
  for(const x of [-5,3])for(const side of [-1,1]){const cz=side*7;const near=cz-side*1.25;const far=cz+side*1.25;addWall(x,y,(side*2.4+near)/2,.25,3.5,Math.abs(near-side*2.4),wm);addWall(x,y,(far+side*11)/2,.25,3.5,Math.abs(side*11-far),wm);}
  for(const side of [-1,1])for(let col=0;col<3;col++){const cx=-9+col*8;const z=side*2.4;addWall(cx-2.8,y,z,2.4,3.5,.25,wm);addWall(cx+2.8,y,z,2.4,3.5,.25,wm);addWall(cx,y+2.5,z,3.2,1,.25,wm);box(scene,[cx,y+2.36,z],[3.2,.18,.32],trimMat,{collide:true,category:'wallTrim'});
    // door slab, initially ajar and operable
    const index=side===-1?col:col+3;const redDoor=fi===2&&index===5;const door=box(scene,[cx,y+1.08,z],[1.08,2.15,.12],mat(redDoor?0x63342c:fi===2?0x292624:0x363530),{collide:true,category:'door'});door.rotation.y=side===-1?.12:-.12;doors.push({mesh:door,open:false,room:roomNames[fi][index],floor:fi,center:new THREE.Vector3(cx,y+1,z)});
    // distinct landmarks and usable hiding/found items
    const sz=side===-1?-7:7;
    const roomFixtureMat=new THREE.MeshStandardMaterial({color:0xb8b7ae,emissive:fi===0?0x8b7950:fi===1?0x57716d:0x43536b,emissiveIntensity:fi===0?.6:.4,roughness:.4});
    box(scene,[cx,y+3.27,sz],[1.65,.08,.55],mat(0x444744,.75,.18),{cast:false,category:'fixture'});
    box(scene,[cx,y+3.215,sz],[1.42,.035,.38],roomFixtureMat,{cast:false,category:'fixture'});
    const roomLamp=pointLight([cx,y+2.88,sz],fi===0?0xffd89f:fi===1?0xaed5ce:0x9ab7df,fi===0?18:fi===1?9:4.5,fi===0?11:fi===1?8:7);
    roomLamp.userData.baseIntensity=roomLamp.intensity;
    roomLamp.userData.flicker=fi>0;
    if((fi===1&&(index===0||index===1))||(fi===2&&index===5)){}else if(index===0){furnitureBox(scene,[cx-1.5,y+.52,sz],[2.5,1,.72],woodMat,{collide:true});furnitureBox(scene,[cx-2.5,y+1.2,sz-.05],[.14,.24,.14],mat(0x77725e));}
    else if(index===1||index===6||index===7){for(let k=0;k<3;k++){const px=cx-2+k*2;furnitureBox(scene,[px,y+.35,sz],[1.5,.5,1.2],index===1?clothMat:mat(0x5c5b53),{collide:true});furnitureBox(scene,[px,y+.68,sz],[1.35,.12,.95],mat(0x77766c));if(k===1&&index===1)interactables.push({type:'hide',name:'CURTAIN',pos:new THREE.Vector3(px,y,sz),used:false});}}
    else if(index===2||index===8){furnitureBox(scene,[cx,y+.55,sz],[2.6,1.05,.85],metalMat,{collide:true});furnitureBox(scene,[cx,y+1.12,sz],[2.4,.12,.72],mat(0x77756c));}
    else if(index===3||index===9){furnitureBox(scene,[cx,y+.48,sz],[1.5,.9,.7],woodMat,{collide:true});furnitureBox(scene,[cx,y+1.5,sz-.4],[1.2,.95,.08],mat(0x403d36));}
    else if(index===4||index===10){furnitureBox(scene,[cx,y+.2,sz],[1.1,.4,.65],woodMat,{collide:true});for(let k=0;k<4;k++)furnitureBox(scene,[cx-1.8+k*1.15,y+.8,sz-.4],[.12,1.5,.55],woodMat,{collide:true});}
    else {furnitureBox(scene,[cx,y+.5,sz],[1.4,1,.7],mat(0x49463f),{collide:true});furnitureBox(scene,[cx+1.5,y+.8,sz-1],[.5,1.6,.5],mat(0x4b4b45),{collide:true});}
    // one hiding landmark on each floor
    if(index===5||index===11||index===17)interactables.push({type:'hide',name:'SCREEN',pos:new THREE.Vector3(cx,y,sz),used:false});
  }
  // floor-specific corridor landmarks and low pools of sick light
  for(let x=-14;x<=14;x+=7){
    const active=fi===0||((x/7+fi)%2===0);
    box(scene,[x,y+3.29,0],[1.2,.1,.48],mat(0x373a38,.72,.22),{cast:false,category:'fixture'});
    const tubeMaterial=new THREE.MeshStandardMaterial({color:0xd7d4c4,emissive:fi===0?0x756a4d:fi===1?0x425b59:0x344555,emissiveIntensity:fi===0?.7:.45,roughness:.36});
    box(scene,[x,y+3.225,-.13],[.98,.035,.075],tubeMaterial,{cast:false,category:'fixture'});
    box(scene,[x,y+3.225,.13],[.98,.035,.075],tubeMaterial,{cast:false,category:'fixture'});
    const color=fi===2?0x9cbbe0:fi===1?0xb2d5ce:0xffdfaa;
    const l=pointLight([x,y+3.02,0],color,active?(fi===0?24:fi===1?9:4.5):.18,fi===0?14:fi===1?10:8);
    l.userData.baseIntensity=l.intensity;l.userData.flicker=fi===2||(!active&&fi===1);
  }
  // Room signs and room numbers act as the building's quiet wayfinding.
  for(let i=0;i<6;i++){const [cx,cz]=roomCenters[i],side=cz<0?-1:1;const plaque=box(scene,[cx,y+2.53,side*2.22],[1.52,.46,.04],roomSign(roomNames[fi][i],`${fi+1}${String(i+1).padStart(2,'0')}`,fi===2&&i===5),{cast:false});}
  // Floors each carry one strong landmark, then quieter traces of abandonment.
  if(fi===0){box(scene,[11.3,y+1.14,-.75],[1.35,2.28,.72],mat(0x252a29));box(scene,[11.3,y+1.35,-1.13],[1.04,1.12,.035],mat(0x35413e,.55));for(let k=0;k<4;k++)box(scene,[10.92+k*.23,y+.62,-1.16],[.11,.1,.03],mat(k===0?0x8d4439:0x817d6c));pointLight([-15.7,y+2.5,0],0xa63830,.45,5);box(scene,[-15.4,y+1.15,0],[.34,2.3,.34],mat(0x383735));}
  if(fi===2){for(const x of [-12,0,10]){const cable=box(scene,[x,y+3.05,-.15],[.025,.55,.025],mat(0x282725));const bulb=pointLight([x,y+2.72,-.15],0x90938a,.08,3);}}
  // Decay marks, scattered forms, and a few overturned pieces give rooms history.
  for(let i=0;i<5;i++){const x=-14+i*6.7;box(scene,[x,y+.015,(i%2?9.8:-9.8)],[1.2,.018,.45],i%2?rustMat:mat(0x343a35),{cast:false});}
  if(fi===1){box(scene,[2,y+.04,8.7],[1.3,.08,.9],woodMat);for(let i=0;i<8;i++)box(scene,[-1.8+(i%3)*.34,y+.03,5.5+Math.floor(i/3)*.28],[.28,.025,.2],mat(0x827c6b),{cast:false});}
  if(fi===2){const cx=7,cz=7;for(let i=0;i<5;i++)box(scene,[cx-1.3+i*.64,y+.035,cz-1.25],[.035,.018,2.2],mat(0x4a2925),{cast:false});}
}
for(let i=0;i<3;i++)addFloor(i);
const startButton=$('#start');startButton.disabled=true;startButton.firstChild.textContent='PREPARING HOSPITAL  ';
const hospitalVisualsReady=loadHospitalAssets().then(assets=>addHospitalVisualSlice({scene,assets,floorYs,roomCenters,colliders,doors,markedMeshes:hospitalGeometry})).catch(error=>{console.error('Could not load the local hospital FBX kit',error);}).finally(()=>{startButton.disabled=false;startButton.firstChild.textContent='ENTER THE HOSPITAL  ';});
// Two switchback flights pass through the openings cut from each floor slab.
const stairFlights=[
  {floor:0,x:13.05,startZ:4.75,endZ:-4.75,startY:0},
  {floor:1,x:14.95,startZ:-4.75,endZ:4.75,startY:4.5},
];
const stairCount=30,stairRise=.15,stairRun=9.5,stairTread=stairRun/stairCount;
const stairTreadMat=mat(0x67665d,.86,.08),stairNosingMat=mat(0x88877b,.68,.2),stairRailMat=mat(0x454943,.58,.58);
function stairSurface(x,z,floor=currentFloor){
  if(z<stairShaft.z0||z>stairShaft.z1||x<stairShaft.x0||x>stairShaft.x1)return null;
  if(floor===1&&z<stairFlights[0].endZ)return floorYs[1];
  if(floor===0&&z>stairFlights[0].startZ&&Math.abs(x-stairFlights[0].x)<.8)return floorYs[0];
  if(floor===2&&z>stairFlights[1].endZ&&Math.abs(x-stairFlights[1].x)<.8)return floorYs[2];
  const flight=stairFlights.find((candidate)=>Math.abs(x-candidate.x)<.72&&z>=Math.min(candidate.startZ,candidate.endZ)&&z<=Math.max(candidate.startZ,candidate.endZ)&&floor>=candidate.floor&&floor<=candidate.floor+1);
  if(!flight)return null;
  const t=THREE.MathUtils.clamp((z-flight.startZ)/(flight.endZ-flight.startZ),0,1);
  // Keep the foot height continuous while the visible FBX-scale treads remain discrete.
  return flight.startY+t*stairRise*stairCount;
}
for(const flight of stairFlights){
  const direction=Math.sign(flight.endZ-flight.startZ),rise=4.5,midZ=(flight.startZ+flight.endZ)/2,midY=flight.startY+rise/2;
  for(let i=0;i<stairCount;i++){
    const z=flight.startZ+(i+.5)*direction*stairTread,topY=flight.startY+(i+1)*stairRise;
    box(scene,[flight.x,topY-stairRise/2,z],[1.6,stairRise,stairTread+.025],stairTreadMat,{cast:true});
    box(scene,[flight.x,topY-.012,z-direction*stairTread*.43],[1.56,.024,.045],stairNosingMat,{cast:false});
  }
  const angle=-Math.atan2(rise,flight.endZ-flight.startZ);
  for(const side of [-1,1]){
    const rail=box(scene,[flight.x+side*.87,midY+.88,midZ],[.09,.09,stairRun+.2],stairRailMat,{collide:true});
    rail.rotation.x=angle;
    const proxy=box(scene,[flight.x+side*.87,midY+.45,midZ],[.1,.9,stairRun+.2],mat(0x454943),{collide:true,cast:false});
    proxy.rotation.x=angle;
    for(let p=1;p<5;p++){
      const t=p/5,z=flight.startZ+(flight.endZ-flight.startZ)*t,y=flight.startY+rise*t;
      box(scene,[flight.x+side*.87,y+.45,z],[.055,.9,.055],stairRailMat,{collide:true});
    }
  }
}
box(scene,[14,4.41,-4.65],[3.9,.18,1.1],mat(0x57574f,.88,.08),{cast:false});
box(scene,[stairFlights[0].x,-.09,4.78],[1.5,.18,1.05],mat(0x57574f,.88,.08),{cast:false});
box(scene,[stairFlights[1].x,8.91,4.78],[1.5,.18,1.05],mat(0x57574f,.88,.08),{cast:false});
for(const [x,y,z] of [[14,2.4,0],[14,6.9,0]])pointLight([x,y,z],0xa9b7bf,2.5,6);
// Vestibule outside 1F and marked exit threshold.
box(scene,[0,-.125,-14.75],[11,.25,7.5],mat(0x282a29),{collide:true,category:'floor'});addWall(-5.5,0,-15,.25,3,.25,wallMats[0]);addWall(5.5,0,-15,.25,3,.25,wallMats[0]);const exitDoor=box(scene,[0,1.3,-11.5],[2.8,2.6,.2],mat(0x292b2b),{collide:true,category:'door'});doors.push({mesh:exitDoor,open:false,room:'EXIT',floor:0,center:new THREE.Vector3(0,1.3,-11.5)});
// Decorative ceiling stains, broken signage, and restrained light shafts.
for(let f=0;f<3;f++){const y=floorYs[f];for(let i=0;i<7;i++){const stain=box(scene,[-14+i*4.2,y+3.365,(i%2?2:-2)],[1.4,.015,.5],mat(0x292a28),{cast:false});} }

const torchLight=new THREE.SpotLight(0xe5d6a8,44,24,Math.PI/7,.52,1.4);torchLight.position.set(0,.05,0);torchLight.target.position.set(0,0,-1);camera.add(torchLight);camera.add(torchLight.target);torchLight.castShadow=true;torchLight.shadow.mapSize.set(512,512);torchLight.shadow.bias=-.0004;const droppedTorchLight=pointLight([0,-2,0],0xd9c48a,4,8);droppedTorchLight.visible=false;
const torchObj=new THREE.Group();const tbody=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.38,8),mat(0x514b3d,.55,.65));tbody.rotation.x=Math.PI/2;tbody.position.set(.32,-.29,-.48);torchObj.add(tbody);const thead=new THREE.Mesh(new THREE.CylinderGeometry(.075,.06,.1,8),mat(0xa99c74,.4,.7));thead.rotation.x=Math.PI/2;thead.position.set(.32,-.29,-.7);torchObj.add(thead);camera.add(torchObj);

function makeProp(type,pos,inventory=false){let mesh;if(type==='TORCH'){mesh=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.085,.4,8),mat(0x514b3d,.5,.6));b.rotation.x=Math.PI/2;mesh.add(b);mesh.userData={type,name:'TORCH',sound:.9,reusable:true};}
 else{const metal=type==='TRAY'||type==='CUP'||type==='INSTRUMENT',glass=type==='GLASS';const material=glass?new THREE.MeshPhysicalMaterial({color:0x789098,roughness:.16,transmission:.72,transparent:true,opacity:.62}):metal?metalMat:mat(0x8f8a78);mesh=new THREE.Mesh(type==='TRAY'?new THREE.BoxGeometry(.5,.08,.36):type==='GLASS'?new THREE.CylinderGeometry(.12,.16,.34,8):new THREE.CylinderGeometry(.12,.12,.2,8),material);mesh.userData={type,name:type,sound:glass?1:metal?.84:.58,reusable:!glass};}
 mesh.position.copy(pos);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);if(!inventory)throwables.push(mesh);return mesh;}
const items=[{type:'TRAY',pos:new THREE.Vector3(-8,.3,-7)},{type:'GLASS',pos:new THREE.Vector3(6,.24,-7)},{type:'CUP',pos:new THREE.Vector3(-2,4.74,7)},{type:'TRAY',pos:new THREE.Vector3(8,9.24,7)},{type:'GLASS',pos:new THREE.Vector3(2,9.24,-7)},{type:'INSTRUMENT',pos:new THREE.Vector3(-8,9.24,-7)},{type:'PLATE',pos:new THREE.Vector3(-1,.24,7)},{type:'CUP',pos:new THREE.Vector3(7,4.74,-7)}];
for(const it of items){const m=makeProp(it.type,it.pos);m.userData.ground=true;m.userData.pickable=true;}
let inventory=[{type:'TORCH',mesh:null},null,null],selected=0,torchOn=true,isCrouch=false,isHidden=false,phase='explore',micEnabled=false,micLevel=0,noiseFloor=.012,lastMicEvent=0,calibrationUntil=0,audioCtx=null, masterGain=null, analyser=null, micData=null, micStream=null,paused=false,gameStarted=false,debugOn=false,ambientOsc=null,ambientGain=null,environmentTimer=25;
const firstObject=createSpecimenJar(THREE,1,[7.5,floorYs[1]+.02,0],.18);scene.add(firstObject);
const secondObject=createSpecimenJar(THREE,2,[7.5,floorYs[2]+.02,0],-.23);scene.add(secondObject);

// Yokai: it follows a floor-spanning patrol and responds to weighted, decaying sound events.
const yokai=new THREE.Group();scene.add(yokai);const woodSkin=mat(0x30271e,.96),woodLight=mat(0x49382a,.93),carved=mat(0x0b0a09,.98),eyeMat=mat(0x706752,.8);const torso=new THREE.Mesh(new THREE.BoxGeometry(.62,1.22,.42),woodSkin);torso.position.y=1.05;yokai.add(torso);const bark=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,1.55,7),woodLight);bark.position.set(0,1.08,-.03);yokai.add(bark);const headPivot=new THREE.Group();headPivot.position.set(0,1.82,.02);yokai.add(headPivot);const head=new THREE.Mesh(new THREE.BoxGeometry(.54,.46,.4),woodLight);head.position.y=.22;headPivot.add(head);const face=new THREE.Mesh(new THREE.BoxGeometry(.35,.24,.022),carved);face.position.set(0,.21,.213);headPivot.add(face);for(const x of [-.09,.09]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),eyeMat);eye.position.set(x,.24,.232);headPivot.add(eye);}const mouth=new THREE.Mesh(new THREE.BoxGeometry(.16,.025,.025),mat(0x080706));mouth.position.set(0,.14,.228);headPivot.add(mouth);const armPivots=[],legPivots=[];for(const side of [-1,1]){const armPivot=new THREE.Group();armPivot.position.set(side*.34,1.48,0);yokai.add(armPivot);const arm=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.82,6),woodLight);arm.position.set(side*.07,-.4,0);arm.rotation.z=side*.1;armPivot.add(arm);const hand=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,.2),woodSkin);hand.position.set(side*.1,-.84,.02);armPivot.add(hand);armPivots.push(armPivot);const legPivot=new THREE.Group();legPivot.position.set(side*.17,.56,0);yokai.add(legPivot);const leg=new THREE.Mesh(new THREE.CylinderGeometry(.13,.1,.68,6),woodSkin);leg.position.y=-.32;legPivot.add(leg);legPivots.push(legPivot);}const yokaiShadow=new THREE.Mesh(new THREE.CircleGeometry(.62,16),new THREE.MeshBasicMaterial({color:0x050606,transparent:true,opacity:.48}));yokaiShadow.rotation.x=-Math.PI/2;yokaiShadow.position.y=.02;yokai.add(yokaiShadow);
 yokai.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const patrolPoints=[];for(let f=0;f<3;f++){const y=floorYs[f]+.1;patrolPoints.push(...[[-15,0],[ -9,0],[-1,0],[7,0],[14,0],[7,0],[ -1,0],[-9,0],[ -9,-6],[-1,-6],[7,-6],[7,6],[-1,6],[-9,6]].map(([x,z])=>new THREE.Vector3(x,y,z)));}patrolPoints.push(new THREE.Vector3(14,1.7,0),new THREE.Vector3(14,3.1,0),new THREE.Vector3(14,4.7,0),new THREE.Vector3(14,6.2,0),new THREE.Vector3(14,7.7,0),new THREE.Vector3(14,9.1,0));patrol.push(...patrolPoints);yokai.position.copy(patrol[28]);let patrolIndex=29,aiState='PATROL',aiTarget=null,aiTimer=0,investigateTimer=0,aggression=0,aiSound=null,aiPath=[],aiPathIndex=0,aiLastPosition=new THREE.Vector3(),sightCooldown=0;
const navNodes=[],navEdges=[],navHall=[],navRoomNodes=new Map();function navNode(pos){const id=navNodes.length;navNodes.push(pos.clone());navEdges.push([]);return id;}function navLink(a,b){const w=navNodes[a].distanceTo(navNodes[b]);navEdges[a].push([b,w]);navEdges[b].push([a,w]);}function buildNavigation(){const hallX=[-15,-9,-1,7,14];for(let f=0;f<3;f++){const y=floorYs[f]+.1;const h=hallX.map(x=>navNode(new THREE.Vector3(x,y,0)));navHall.push(h);for(let i=0;i<h.length-1;i++)navLink(h[i],h[i+1]);for(let i=0;i<6;i++){const [cx,cz]=roomCenters[i],side=Math.sign(cz),entrance=navNode(new THREE.Vector3(cx,y,side*2.55)),inside=navNode(new THREE.Vector3(cx,y,side*7.1));navLink(entrance,inside);navLink(entrance,h[1+Math.round(i%3)]);navRoomNodes.set(`${f}:${i}`,inside);}}
 for(let f=0;f<2;f++){const y0=floorYs[f]+.1,y1=floorYs[f+1]+.1,stair=[];for(let i=0;i<=6;i++){const t=i/6;stair.push(navNode(new THREE.Vector3(14,y0+(y1-y0)*t,-1.6+3.2*t)));}navLink(navHall[f][4],stair[0]);navLink(navHall[f+1][4],stair[6]);for(let i=0;i<6;i++)navLink(stair[i],stair[i+1]);}}
buildNavigation();function nearestNav(pos){let best=0,dist=Infinity;for(let i=0;i<navNodes.length;i++){const d=navNodes[i].distanceTo(pos);if(d<dist){dist=d;best=i;}}return best;}function routeTo(from,to){const start=nearestNav(from),goal=nearestNav(to),dist=Array(navNodes.length).fill(Infinity),prev=Array(navNodes.length).fill(-1),seen=new Set();dist[start]=0;while(seen.size<navNodes.length){let cur=-1,cd=Infinity;for(let i=0;i<dist.length;i++)if(!seen.has(i)&&dist[i]<cd){cd=dist[i];cur=i;}if(cur<0||cur===goal)break;seen.add(cur);for(const [n,w] of navEdges[cur])if(cd+w<dist[n]){dist[n]=cd+w;prev[n]=cur;}}const ids=[];for(let n=goal;n>=0;n=prev[n]){ids.push(n);if(n===start)break;}ids.reverse();return ids.slice(1).map(id=>navNodes[id].clone()).concat([to.clone()]);}
function emitSound(position,intensity,radius,source='player'){soundEvents.push({position:position.clone(),intensity,radius,timestamp:performance.now(),source});if(audioCtx&&masterGain&&source!=='microphone'){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),p=audioCtx.createStereoPanner();const d=position.distanceTo(player.position),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));const offset=position.clone().sub(player.position).normalize();p.pan(THREE.MathUtils.clamp(right.dot(offset),-1,1));osc.type=source==='object'?'triangle':'sine';osc.frequency.value=source==='object'?180+intensity*160:source==='environment'?92+intensity*42:70+intensity*70;const volume=Math.max(.0001,Math.min(.12,intensity*.075)*Math.exp(-d/17));gain.gain.setValueAtTime(.0001,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+1.3);osc.connect(gain).connect(p).connect(masterGain);osc.start();osc.stop(audioCtx.currentTime+1.35);} }
function subtitle(text){const s=$('#subtitle');s.textContent=text;s.classList.add('on');clearTimeout(subtitle.t);subtitle.t=setTimeout(()=>s.classList.remove('on'),2600)}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),1800)}

const keys={};let yaw=0,pitch=0,velocity=new THREE.Vector3(),lastStep=0,elapsed=0,firstFound=false,secondFound=false,dead=false,jumpRequested=false,jumpVelocity=0,jumpHeight=0,grounded=true;
function exitUnlocked(){return firstFound&&secondFound;}
function pointerMove(e){if(document.pointerLockElement!==renderer.domElement||paused)return;yaw-=e.movementX*.0022*(+$ ('#sensitivity').value);pitch-=e.movementY*.0022*(+$ ('#sensitivity').value);pitch=THREE.MathUtils.clamp(pitch,-1.45,1.45);player.rotation.y=yaw;camera.rotation.x=pitch;}
async function startGame(){if(gameStarted)return;startButton.disabled=true;await hospitalVisualsReady;if(!audioCtx)audioCtx=new AudioContext();if(!masterGain){masterGain=audioCtx.createGain();masterGain.gain.value=+$ ('#volume').value;masterGain.connect(audioCtx.destination);}if(!ambientOsc){ambientOsc=audioCtx.createOscillator();ambientGain=audioCtx.createGain();ambientOsc.type='sine';ambientOsc.frequency.value=48;ambientGain.gain.value=.004;ambientOsc.connect(ambientGain).connect(masterGain);ambientOsc.start();}jumpRequested=false;gameStarted=true;$('#intro').classList.add('hidden');$('#hud').classList.remove('hidden');renderer.domElement.requestPointerLock?.();if(micEnabled){calibrationUntil=performance.now()+2300;subtitle('Stay quiet for a moment. Listening to room tone.');}else subtitle('The Yokai cannot see you. It can hear you.');}
$('#start').addEventListener('click',startGame);$('#micToggle').addEventListener('click',async()=>{if(micEnabled){micEnabled=false;$('#micToggle').innerHTML='MICROPHONE: OFF <span>(OPTIONAL)</span>';try{micStream?.getTracks().forEach(t=>t.stop());}catch{}return;}try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});const source=audioCtx?.createMediaStreamSource(micStream)??new AudioContext().createMediaStreamSource(micStream);audioCtx??=source.context;analyser=audioCtx.createAnalyser();analyser.fftSize=512;source.connect(analyser);micData=new Uint8Array(analyser.fftSize);micEnabled=true;$('#micToggle').innerHTML='MICROPHONE: ON <span>(CLICK TO DISABLE)</span>';$('#micToggle').classList.add('active');}catch{$('#micToggle').innerHTML='MICROPHONE UNAVAILABLE <span>(IN-GAME SOUND ACTIVE)</span>';}});
addEventListener('mousemove',pointerMove);addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!keys.Space&&gameStarted&&!paused&&!dead)jumpRequested=true;}keys[e.code]=true;if(e.code==='Escape'){if(gameStarted){paused=!paused;$('#pause').classList.toggle('hidden',!paused);if(paused)document.exitPointerLock?.();else renderer.domElement.requestPointerLock?.();}}if(e.code==='KeyF')debugOn=!debugOn;if(['Digit1','Digit2','Digit3'].includes(e.code)){selected=+e.code.slice(-1)-1;if(selected===0&&inventory[0]?.type==='TORCH'){torchOn=!torchOn;torchLight.visible=torchOn;torchObj.visible=torchOn;}refreshSlots();}if(e.code==='ControlLeft'||e.code==='KeyC')isCrouch=true;if(e.code==='KeyE')interact();});addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='ControlLeft'||e.code==='KeyC')isCrouch=false;});
renderer.domElement.addEventListener('click',()=>{if(gameStarted&&!paused&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock?.();else if(gameStarted&&!paused)throwSelected();});$('#resume').addEventListener('click',()=>{paused=false;$('#pause').classList.add('hidden');renderer.domElement.requestPointerLock?.();});$('#restart').addEventListener('click',()=>location.reload());$('#restartDeath').addEventListener('click',()=>location.reload());$('#volume').addEventListener('input',e=>{if(masterGain)masterGain.gain.value=+e.target.value;});

function refreshSlots(){const slots=$('#slots');slots.innerHTML='';inventory.forEach((it,i)=>{const el=document.createElement('div');el.className='slot '+(i===selected?'selected ':'')+(it?'':'empty');el.innerHTML=`<span class="num">${i+1}</span><span class="name">${it?it.type:'—'}</span>`;slots.appendChild(el);});$('#floorLabel').textContent=`${currentFloor+1}F`;}
function nearestTarget(){let best=null,dist=2.2;for(const m of throwables){if(m.userData.ground&&m.userData.pickable){const d=m.position.distanceTo(player.position);if(d<dist){best={kind:'item',object:m,d};dist=d;}}}for(const d of doors){if(d.floor===currentFloor){const q=d.center.distanceTo(player.position);if(q<dist){best={kind:'door',object:d,d:q};dist=q;}}}for(const obj of [firstObject,secondObject]){if(obj.visible){const q=obj.position.distanceTo(player.position);if(q<dist){best={kind:'objective',object:obj,d:q};dist=q;}}}for(const h of interactables){if(h.used)continue;const q=h.pos.distanceTo(player.position);if(q<dist){best={kind:'hide',object:h,d:q};dist=q;}}return best;}
function interact(){if(!gameStarted)return;const target=nearestTarget();if(!target){const p=player.position;if(exitUnlocked()&&p.z<-12&&Math.abs(p.x)<2.5){completeGame();return;}return;}
 if(target.kind==='item'){const slot=inventory.findIndex(x=>!x);if(slot<0){toast('CARRIED ITEMS FULL');return;}const m=target.object;m.userData.ground=false;m.userData.pickable=false;scene.remove(m);inventory[slot]={type:m.userData.type,mesh:m};if(m.userData.type==='TORCH'){droppedTorchLight.visible=false;torchOn=true;torchLight.visible=true;torchObj.visible=true;}refreshSlots();emitSound(player.position,.08,2,'player');toast(`${m.userData.type} TAKEN`);}
 if(target.kind==='door'){const d=target.object;if(d.room==='EXIT'&&!exitUnlocked()){toast(`FIND BOTH SPECIMENS (${Number(firstFound)+Number(secondFound)}/2)`);emitSound(player.position,.08,3,'environment');return;}d.open=!d.open;d.mesh.rotation.y+=(d.room==='BATHROOM'?1:-1)*(d.open?1.35:-1.35);d.mesh.position.x+=d.open?.38:-.38;emitSound(player.position,.18,5,'environment');}
 if(target.kind==='objective'){
  target.object.visible=false;
  if(target.object.userData.objective===1){firstFound=true;aggression+=.3;toast('SPECIMEN 01 RECOVERED');subtitle('A voice on the recording: “They took both. Keep the seals intact.”');}
  else{secondFound=true;aggression=.85;}
  if(exitUnlocked()){phase='escape';toast('EXIT UNLOCKED');subtitle('Both specimens recovered. Return to the entrance.');$('#objective').textContent='Return to the entrance and open the exit.';}
  else if(firstFound){phase='first';$('#objective').textContent='Find specimen 02 on floor 3.';}
  else{phase='explore';$('#objective').textContent='Find specimen 01 on floor 2.';toast('SPECIMEN 02 RECOVERED');}
  emitSound(player.position,.45,12,'player');
 }
 if(target.kind==='hide'){isHidden=!isHidden;target.object.used=false;if(isHidden){toast('HOLD STILL');emitSound(player.position,.04,2,'player');}else toast('YOU STEP OUT');}}
function throwSelected(){const item=inventory[selected];if(!item){toast('EMPTY SLOT');return;}let m;if(item.type==='TORCH'){m=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.085,.4,8),mat(0x514b3d,.5,.6));b.rotation.x=Math.PI/2;m.add(b);m.userData={...item,ground:false,pickable:false};torchOn=false;torchLight.visible=false;torchObj.visible=false;droppedTorchLight.visible=true;}else{m=item.mesh;m.userData.ground=false;m.userData.pickable=false;}
 scene.add(m);const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).normalize();m.position.copy(camera.getWorldPosition(new THREE.Vector3())).addScaledVector(dir,.55);if(item.type==='TORCH')droppedTorchLight.position.copy(m.position);m.userData.velocity=dir.multiplyScalar(8.2).add(new THREE.Vector3(0,2.2,0));m.userData.ground=false;m.userData.pickable=false;m.userData.age=0;m.userData.kind=item.type;throwables.push(m);inventory[selected]=null;refreshSlots();emitSound(player.position,.2,5,'player');}
function completeGame(){dead=false;paused=true;document.exitPointerLock?.();$('#ending').classList.remove('hidden');}
function die(){if(dead)return;dead=true;paused=true;document.exitPointerLock?.();$('#death').classList.remove('hidden');}

function collidesAt(x,z,y){
  const bounds=new THREE.Box3();
  for(const collider of colliders){
    bounds.setFromObject(collider.mesh);
    if(bounds.max.y<y+.12||bounds.min.y>y+1.78)continue;
    if(x>.28+bounds.min.x&&x<bounds.max.x+.28&&z>.28+bounds.min.z&&z<bounds.max.z+.28)return true;
  }
  return false;
}
function headBlockedAt(x,z,feetY){
  const bounds=new THREE.Box3();
  for(const collider of colliders){
    bounds.setFromObject(collider.mesh);
    if(bounds.max.y<feetY+1.52||bounds.min.y>feetY+1.86)continue;
    if(x>.28+bounds.min.x&&x<bounds.max.x+.28&&z>.28+bounds.min.z&&z<bounds.max.z+.28)return true;
  }
  return false;
}
function inStairShaft(x,z){return x>stairShaft.x0&&x<stairShaft.x1&&z>stairShaft.z0&&z<stairShaft.z1;}
function canReachStairSurface(surface,fromY,dx,dz){return surface!==null&&Math.abs(surface-fromY)<=Math.hypot(dx,dz)*.52+stairRise+.02;}
function updatePlayer(dt){if(!gameStarted||paused||dead)return;player.rotation.y=yaw;camera.rotation.x=pitch;const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));let wish=new THREE.Vector3();if(keys.KeyW)wish.add(fwd);if(keys.KeyS)wish.sub(fwd);if(keys.KeyD)wish.add(right);if(keys.KeyA)wish.sub(right);const moving=wish.lengthSq()>0;if(moving)wish.normalize();const sprint=(keys.ShiftLeft||keys.ShiftRight)&&!isCrouch;const speed=isHidden?0:isCrouch?1.45:sprint?5.1:2.65;const target=wish.multiplyScalar(speed);const response=grounded?(moving?8:12):(moving?2.4:.16);velocity.x=THREE.MathUtils.damp(velocity.x,target.x,response,dt);velocity.z=THREE.MathUtils.damp(velocity.z,target.z,response,dt);const old=player.position.clone();
  const wantedX=THREE.MathUtils.clamp(old.x+velocity.x*dt,-16.7,16.6),wantedZ=THREE.MathUtils.clamp(old.z+velocity.z*dt,-15.8,10.5);
  player.position.x=old.x;player.position.z=old.z;
  const xSurface=stairSurface(wantedX,old.z,currentFloor);
  if(!collidesAt(wantedX,old.z,old.y)&&(!inStairShaft(wantedX,old.z)||canReachStairSurface(xSurface,old.y,wantedX-old.x,0)))player.position.x=wantedX;
  const zSurface=stairSurface(player.position.x,wantedZ,currentFloor);
  if(!collidesAt(player.position.x,wantedZ,old.y)&&(!inStairShaft(player.position.x,wantedZ)||canReachStairSurface(zSurface,old.y,0,wantedZ-old.z)))player.position.z=wantedZ;
  const surface=stairSurface(player.position.x,player.position.z,currentFloor);
  if(surface!==null)player.position.y=surface;
  else if(inStairShaft(player.position.x,player.position.z)){player.position.x=old.x;player.position.z=old.z;player.position.y=old.y;}
  else player.position.y=floorYs[currentFloor];
  const groundY=player.position.y;
  if(jumpRequested&&grounded&&!isCrouch&&!isHidden){jumpVelocity=4.7;grounded=false;emitSound(player.position,.12,3,'player');}
  jumpRequested=false;
  if(!grounded){jumpHeight+=jumpVelocity*dt;jumpVelocity-=11.5*dt;if(jumpHeight<=0){jumpHeight=0;jumpVelocity=0;grounded=true;}}
  if(jumpHeight>0&&headBlockedAt(player.position.x,player.position.z,groundY+jumpHeight)){jumpHeight=Math.max(0,jumpHeight-.08);jumpVelocity=Math.min(0,jumpVelocity);if(jumpHeight===0)grounded=true;}
  player.position.y=groundY+jumpHeight;
  currentFloor=Math.max(0,Math.min(2,Math.floor((groundY+.01)/4.5)));
  if(Math.abs(player.position.x-14)<2.2&&Math.abs(player.position.z)<5.2)$('#prompt').textContent='STAIRWELL · WALK UP OR DOWN';
  camera.position.y=(isCrouch||isHidden?1.02:1.62)+(moving?Math.sin(elapsed*(sprint?12:8))*.018:Math.sin(elapsed*1.3)*.008);torchLight.visible=torchOn&&!isHidden;torchObj.visible=torchOn&&!isHidden;
  if(moving&&performance.now()-lastStep>(sprint?320:isCrouch?850:590)){lastStep=performance.now();emitSound(player.position,isCrouch?.035:sprint?.24:.105,sprint?6:isCrouch?1.8:3.5,'player');if(Math.random()<.14)subtitle(aiState==='PATROL'?'(footsteps, somewhere above)':'(a slow dragging sound)');}
 }
function breakGlass(m){m.userData.velocity=null;scene.remove(m);throwables.splice(throwables.indexOf(m),1);const shards=new THREE.Mesh(new THREE.DodecahedronGeometry(.18,0),mat(0x85969a,.2,.1));shards.position.copy(m.position);scene.add(shards);setTimeout(()=>scene.remove(shards),6000);}
function updateItems(dt){for(const m of [...throwables]){if(!m.parent||!m.userData.velocity)continue;m.userData.age+=dt;const previous=m.position.clone();m.userData.velocity.y-=9.8*dt;m.position.addScaledVector(m.userData.velocity,dt);if(m.userData.kind==='TORCH')droppedTorchLight.position.copy(m.position);const fy=floorYs[Math.max(0,Math.min(2,Math.round(m.position.y/4.5)))];let struckWall=false;for(const c of colliders){if(c.mesh.position.y<fy+.04||c.mesh.position.y>fy+3.4)continue;const bounds=new THREE.Box3().setFromObject(c.mesh).expandByScalar(.13);if(bounds.containsPoint(m.position)){m.position.copy(previous);m.userData.velocity.x*=-.42;m.userData.velocity.z*=-.42;m.userData.velocity.y*=.45;struckWall=true;if(performance.now()-(m.userData.lastImpact||0)>550){m.userData.lastImpact=performance.now();emitSound(m.position,m.userData.sound||.65,(m.userData.sound||.65)*11,'object');if(m.userData.kind==='GLASS'&&m.userData.age>.15){breakGlass(m);break;}}break;}}if(!m.parent)continue;if(m.position.y<fy+.13){m.position.y=fy+.13;m.userData.velocity.y*=-.24;m.userData.velocity.x*=.63;m.userData.velocity.z*=.63;if(Math.abs(m.userData.velocity.y)>.7){m.userData.lastImpact=performance.now();emitSound(m.position,m.userData.sound||.75,(m.userData.sound||.75)*12,'object');if(m.userData.kind==='GLASS'){breakGlass(m);continue;}}}if(m.userData.age>1.5&&m.position.y<=fy+.14){m.userData.velocity=null;m.userData.ground=true;m.userData.pickable=true;}if(struckWall&&m.userData.age>1.5&&m.userData.velocity.length()<1.1){m.userData.velocity=null;m.userData.ground=true;m.userData.pickable=true;}}}
function updateMic(now){if(!micEnabled||!analyser||!micData)return;analyser.getByteTimeDomainData(micData);let sum=0;for(const v of micData){const n=(v-128)/128;sum+=n*n;}const rms=Math.sqrt(sum/micData.length);micLevel=micLevel*.82+rms*.18;if(now<calibrationUntil){noiseFloor=noiseFloor*.96+rms*.04;return;}noiseFloor=noiseFloor*.9995+rms*.0005;if(now-lastMicEvent>1100&&micLevel>Math.max(.025,noiseFloor*2.5)){const level=THREE.MathUtils.clamp((micLevel-noiseFloor)*10,.12,.9);emitSound(player.position,level,level*13,'microphone');lastMicEvent=now;}}
function roomKeyAt(p){const f=Math.max(0,Math.min(2,Math.round(p.y/4.5)));let best=0,dist=Infinity;roomCenters.forEach(([x,z],i)=>{const d=Math.hypot(p.x-x,p.z-z);if(d<dist){dist=d;best=i;}});return dist<5.4?`${f}:${best}`:`${f}:hall`;}
function soundTransmission(a,b){const fa=Math.max(0,Math.min(2,Math.round(a.y/4.5))),fb=Math.max(0,Math.min(2,Math.round(b.y/4.5)));const ra=roomKeyAt(a),rb=roomKeyAt(b);let factor=fa===fb?1:.2**Math.abs(fa-fb);if(ra!==rb&&fa===fb){factor*=ra.endsWith('hall')||rb.endsWith('hall')?.72:.36;for(const d of doors){if(!d.open&&d.floor===fa&&((ra===`${fa}:${roomNames[fa].indexOf(d.room)}`)||(rb===`${fa}:${roomNames[fa].indexOf(d.room)}`))){factor*=.62;break;}}}return factor;}
function walkPath(dt,speed){if(!aiPath.length){const dest=aiTarget||navNodes[navHall[2][3]];aiPath=routeTo(yokai.position,dest);aiPathIndex=0;}let target=aiPath[aiPathIndex];while(target&&yokai.position.distanceTo(target)<.32){aiPathIndex++;target=aiPath[aiPathIndex];}if(!target)return true;const dir=target.clone().sub(yokai.position);if(dir.lengthSq()>.01){dir.normalize();yokai.position.addScaledVector(dir,speed*dt);yokai.rotation.y=THREE.MathUtils.damp(yokai.rotation.y,Math.atan2(dir.x,dir.z),4,dt);}for(const d of doors){if(d.room==='EXIT'&&phase!=='escape')continue;if(!d.open&&d.floor===Math.round(yokai.position.y/4.5)&&d.center.distanceTo(yokai.position)<1.35){d.open=true;d.mesh.rotation.y+=(d.room==='BATHROOM'?1:-1)*1.35;d.mesh.position.x+=.38;emitSound(d.center,.08,3,'environment');}}return false;}
function updateAI(dt,now){let chosen=null,score=0;for(let i=soundEvents.length-1;i>=0;i--){const e=soundEvents[i],age=(now-e.timestamp)/1000;if(age>12){if(aiSound===e)aiSound=null;soundEvents.splice(i,1);continue;}const strength=e.intensity*Math.exp(-age*.35),distance=yokai.position.distanceTo(e.position);const audibility=strength*Math.max(0,1-distance/e.radius)*soundTransmission(e.position,yokai.position);if(audibility>.035&&audibility>score){chosen=e;score=audibility;}}
 if(chosen&&chosen!==aiSound&&score>.055){aiSound=chosen;aiTarget=chosen.position.clone();aiPath=routeTo(yokai.position,aiTarget);aiPathIndex=0;aiState=score>.22?'HUNT':'INVESTIGATE';investigateTimer=8+score*9;}
 if(chosen&&aiSound){aiState=score>.3?'HUNT':'INVESTIGATE';const listening=score>.08;const toward=aiTarget.clone().sub(yokai.position);headPivot.rotation.y=THREE.MathUtils.damp(headPivot.rotation.y,THREE.MathUtils.clamp(Math.atan2(toward.x,toward.z)-yokai.rotation.y,-1.1,1.1),listening?7:2,dt);if(!walkPath(dt,aiState==='HUNT'?3.1:1.3+aggression*.35)){investigateTimer-=dt;}else investigateTimer-=dt*.7;if(investigateTimer<=0){aiSound=null;aiTarget=null;aiPath=[];aiState='SEARCH';investigateTimer=3.5;}}
 else if(aiState==='INVESTIGATE'||aiState==='HUNT'){if(aiTarget)walkPath(dt,1.1+aggression*.3);investigateTimer-=dt;if(investigateTimer<=0){aiState='SEARCH';investigateTimer=3.5;aiPath=[];}}
 else if(aiState==='SEARCH'){investigateTimer-=dt;headPivot.rotation.y=Math.sin(now*.0017)*.55;if(investigateTimer<=0){aiState='PATROL';aiTarget=null;aiPath=[];}}
 else{if(!aiPath.length||aiPathIndex>=aiPath.length){const f=Math.random()<.14?currentFloor:Math.random()<.58?2:Math.floor(Math.random()*2);const goal=navNodes[navHall[f][1+Math.floor(Math.random()*3)]];aiPath=routeTo(yokai.position,goal);aiPathIndex=0;}walkPath(dt,1.03+aggression*.2);headPivot.rotation.y=THREE.MathUtils.damp(headPivot.rotation.y,Math.sin(now*.0007)*.12,2,dt);}
 const moving=aiState!=='SEARCH';const gait=moving?Math.sin(now*(aiState==='HUNT'?.009:.004)):.03;for(let i=0;i<2;i++){armPivots[i].rotation.x=gait*(aiState==='HUNT'?.22:.11);legPivots[i].rotation.x=-gait*.25;}torso.rotation.z=Math.sin(now*.0013)*.025;headPivot.rotation.x=Math.sin(now*.0011)*.035;if(aiState==='SEARCH')torso.rotation.z+=Math.sin(now*.005)*.012;
 const dy=Math.abs(yokai.position.y-player.position.y),dist=yokai.position.distanceTo(player.position);if(dist<1.05&&dy<2)die();}

function setPrompt(label,key='E'){const prompt=$('#prompt');if(!label){prompt.innerHTML='';return;}prompt.innerHTML=key?`<kbd>${key}</kbd><span>${label}</span>`:`<span>${label}</span>`;}
function updateHUD(){const near=nearestTarget();if(near){if(near.kind==='item')setPrompt(`PICK UP ${near.object.userData.type}`);else if(near.kind==='door')setPrompt(near.object.room==='EXIT'?(exitUnlocked()?(near.object.open?'CLOSE EXIT':'OPEN EXIT'):'FIND BOTH SPECIMENS'):`${near.object.open?'CLOSE':'OPEN'} DOOR`);else if(near.kind==='objective')setPrompt(`TAKE SPECIMEN 0${near.object.userData.objective}`);else if(near.kind==='hide')setPrompt(isHidden?'LEAVE HIDING PLACE':'HIDE');}else if(Math.abs(player.position.x-14)<2.5&&Math.abs(player.position.z)<5.2)setPrompt('STAIRS · WALK UP OR DOWN','');else if(exitUnlocked()&&player.position.z<-11)setPrompt('LEAVE THE HOSPITAL');else setPrompt('');
 const f=Math.max(0,Math.min(2,Math.round(player.position.y/4.5)));currentFloor=f;let nearest=roomCenters.map(([x,z],i)=>({i,d:Math.hypot(player.position.x-x,player.position.z-z)})).sort((a,b)=>a.d-b.d)[0];currentRoom=nearest.d<7?roomNames[f][nearest.i]:'MAIN CORRIDOR';$('#floorLabel').textContent=`${f+1}F`;$('#roomLabel').textContent=currentRoom;refreshSlots();}
function updateSpecimenVisuals(dt){for(const specimen of [firstObject,secondObject]){if(!specimen.visible)continue;const orb=specimen.userData.orb,halo=specimen.userData.halo;orb.position.y=.72+Math.sin(elapsed*2.1+specimen.userData.objective)*.035;orb.rotation.y+=dt*.7;halo.position.y=orb.position.y;halo.rotation.z+=dt*.45;}}
function updateAtmosphere(dt,now){for(const l of lights){if(!l.userData.flicker)continue;l.userData.timer=(l.userData.timer||0)-dt;if(l.userData.timer<=0&&Math.random()<dt*.11)l.userData.timer=.06+Math.random()*.19;const target=l.userData.timer>0?l.userData.baseIntensity*.04:l.userData.baseIntensity;l.intensity=THREE.MathUtils.damp(l.intensity,target,l.userData.timer>0?45:3,dt);}environmentTimer-=dt;if(environmentTimer<=0){environmentTimer=24+Math.random()*24;const x=-14+Math.random()*28,z=Math.random()<.5?0:(Math.random()<.5?-7:7),f=Math.random()<.55?2:Math.floor(Math.random()*2);emitSound(new THREE.Vector3(x,floorYs[f]+.1,z),.12+Math.random()*.08,8+Math.random()*3,'environment');}const distance=yokai.position.distanceTo(player.position),threat=THREE.MathUtils.clamp((9-distance)/9,0,.35);$('.vignette').style.opacity=String(.72+threat*.65);}
function frame(t){requestAnimationFrame(frame);const dt=Math.min(.04,(t-(frame.last||t))/1000);frame.last=t;elapsed+=dt;updateSpecimenVisuals(dt);if(gameStarted&&!paused){updatePlayer(dt);updateItems(dt);updateMic(t);updateAI(dt,t);updateAtmosphere(dt,t);updateHUD();}renderer.render(scene,camera);if(debugOn&&gameStarted){$('#debug').classList.remove('hidden');$('#debug').textContent=`FPS ${Math.round(1/Math.max(.001,dt))} · DRAW ${renderer.info.render.calls}\nFLOOR ${currentFloor+1} · ${currentRoom}\nPLAYER ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}\nMIC ${micLevel.toFixed(3)} · AI ${aiState}\nSOUNDS ${soundEvents.length} · TARGET ${aiTarget?aiTarget.toArray().map(x=>x.toFixed(1)).join(','):'—'}`;}else $('#debug').classList.add('hidden');}
player.position.set(0,0,8);yokai.position.set(-14,.1,0);camera.rotation.order='YXZ';refreshSlots();requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(1);renderer.setSize(Math.floor(innerWidth*renderScale),Math.floor(innerHeight*renderScale),false);});
