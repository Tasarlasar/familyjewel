import * as THREE from 'three';
import { createInstancedAsset, getAssetBounds } from './hospital-assets.js';
import { HospitalBed, HospitalChair, HospitalTable, IVStand, MedicalCabinet, WardRoom, WaitingBench, Wheelchair } from './hospital-objects.js';

const CATEGORY = 'hospitalCategory';

function instanceTransform(position, rotation, scale) {
  return new THREE.Matrix4().compose(position, rotation, scale);
}

function addModularFloors(scene, assets, floorYs, markedMeshes) {
  const oldFloors = markedMeshes.filter((mesh) => mesh.userData[CATEGORY] === 'floor' || mesh.userData[CATEGORY] === 'ceiling');
  oldFloors.forEach((mesh) => { mesh.visible = false; });
  const floorTile = assets.get('floorTile1');
  const ceilingTile = assets.get('ceilingTile');
  const floorInstances = createInstancedAsset(THREE, floorTile, 3200, 'floor-tile');
  const ceilingInstances = createInstancedAsset(THREE, ceilingTile, 3200, 'ceiling-tile');
  const up = new THREE.Vector3(0, 1, 0), identity = new THREE.Quaternion();
  let floorIndex = 0, ceilingIndex = 0;
  const tileBounds = getAssetBounds(THREE, floorTile);
  const tileSize = tileBounds.getSize(new THREE.Vector3()).multiplyScalar(.01);
  const addTile = (x0, x1, z0, z1, y) => {
    if (x1 - x0 < .015 || z1 - z0 < .015) return;
    const position = new THREE.Vector3((x0 + x1) / 2, y, (z0 + z1) / 2);
    const scale = new THREE.Vector3((x1 - x0) / tileSize.x, 1, (z1 - z0) / tileSize.z);
    floorInstances.setMatrixAt(floorIndex++, instanceTransform(position, identity, scale));
    ceilingInstances.setMatrixAt(ceilingIndex++, instanceTransform(new THREE.Vector3(position.x, y + 3.6, position.z), identity, scale));
  };
  for (const floorY of floorYs) {
    for (let ix = 0; ix < 35; ix++) for (let iz = 0; iz < 22; iz++) {
      const x0 = -17.5 + ix, x1 = x0 + 1;
      const z0 = -11 + iz, z1 = z0 + 1;
      const overlapsShaft = x0 < 16 && x1 > 12 && z0 < 5.1 && z1 > -5.1;
      if (!overlapsShaft) {
        addTile(x0, x1, z0, z1, floorY - .1);
        continue;
      }
      // Trim partial tiles to the exact stairwell opening instead of leaving a
      // jagged 0.5 m cutout around the landing.
      addTile(x0, Math.min(x1, 12), z0, z1, floorY - .1);
      addTile(Math.max(x0, 16), x1, z0, z1, floorY - .1);
      const openingX0 = Math.max(x0, 12), openingX1 = Math.min(x1, 16);
      addTile(openingX0, openingX1, z0, Math.min(z1, -5.1), floorY - .1);
      addTile(openingX0, openingX1, Math.max(z0, 5.1), z1, floorY - .1);
    }
  }
  // Tiled flooring continues to the entrance with a flush half-tile threshold.
  for (let ix = 0; ix < 11; ix++) for (let iz = 0; iz < 7; iz++) {
    const x0 = -5.5 + ix, z0 = -18.5 + iz;
    addTile(x0, x0 + 1, z0, z0 + 1, -.1);
  }
  for (let ix = 0; ix < 11; ix++) {
    const x0 = -5.5 + ix;
    addTile(x0, x0 + 1, -11.5, -11, -.1);
  }
  floorInstances.count = floorIndex;
  ceilingInstances.count = ceilingIndex;
  floorInstances.instanceMatrix.needsUpdate = true;
  ceilingInstances.instanceMatrix.needsUpdate = true;
  floorInstances.computeBoundingSphere();
  ceilingInstances.computeBoundingSphere();
  scene.add(floorInstances, ceilingInstances);
}

function addModularWalls(scene, assets, markedMeshes) {
  const walls = markedMeshes.filter((mesh) => mesh.userData[CATEGORY] === 'wall');
  const trim = markedMeshes.filter((mesh) => mesh.userData[CATEGORY] === 'wallTrim');
  walls.forEach((mesh) => { mesh.visible = false; });
  trim.forEach((mesh) => { mesh.visible = false; });
  const model = assets.get('wall');
  const instances = createInstancedAsset(THREE, model, walls.length * 24, 'wall-tile');
  // createInstancedAsset bakes the FBX's centimeter transforms into meter geometry.
  // Measure the baked geometry here so wall tiles keep their authored 2 m × 2.5 m size.
  const tileSize = instances.geometry.boundingBox.getSize(new THREE.Vector3());
  const yaw = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let index = 0;
  for (const wall of walls) {
    const alongX = wall.scale.x >= wall.scale.z;
    const length = alongX ? wall.scale.x : wall.scale.z;
    const depth = alongX ? wall.scale.z : wall.scale.x;
    const count = Math.ceil(length / tileSize.x);
    const rotation = alongX ? 0 : Math.PI / 2;
    yaw.setFromAxisAngle(up, rotation);
    let consumed = 0;
    while (consumed < length - .001) {
      const span = Math.min(tileSize.x, length - consumed);
      const offset = -length / 2 + consumed + span / 2;
      const position = wall.position.clone();
      if (alongX) position.x += offset; else position.z += offset;
      position.y -= wall.scale.y / 2;
      const scale = new THREE.Vector3(span / tileSize.x, wall.scale.y / tileSize.y, depth / tileSize.z);
      instances.setMatrixAt(index++, instanceTransform(position, yaw, scale));
      consumed += span;
    }
    if (index > instances.instanceMatrix.count) throw new Error(`Wall tile capacity too small (${count} for wall)`);
  }
  instances.count = index;
  instances.instanceMatrix.needsUpdate = true;
  instances.computeBoundingSphere();
  scene.add(instances);
}

function addCenteredModel(scene, assets, key, position, rotation = 0, scale = 1) {
  const source = assets.get(key);
  if (!source) return null;
  const bounds = getAssetBounds(THREE, source);
  const center = bounds.getCenter(new THREE.Vector3());
  const root = source.clone(true);
  root.rotation.y = rotation;
  root.scale.setScalar(scale * .01);
  const centerOffset = center.multiplyScalar(scale * .01).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  root.position.set(position[0] - centerOffset.x, position[1] - centerOffset.y, position[2] - centerOffset.z);
  root.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  scene.add(root);
  return root;
}

function addDoorFrames(scene, assets, doors, floorYs) {
  const source = assets.get('doorway2');
  if (!source) return;
  const bounds = getAssetBounds(THREE, source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  for (const door of doors) {
    const root = source.clone(true);
    const targetWidth = door.room === 'EXIT' ? 3.2 : 3.2;
    root.scale.set(targetWidth / size.x, 2.5 / size.y, .25 / size.z);
    root.rotation.y = door.center.z > 0 ? Math.PI : 0;
    root.position.set(
      door.center.x - center.x * root.scale.x,
      floorYs[door.floor] - bounds.min.y * root.scale.y,
      door.center.z - center.z * root.scale.z,
    );
    root.name = `hospital-door-frame-${door.room}`;
    root.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    scene.add(root);
  }
}

function addDoorModels(THREE, scene, assets, doors, colliders, floorYs) {
  for (const door of doors) {
    const oldMesh = door.mesh;
    const source = assets.get(door.room === 'EXIT' ? 'door2' : 'door1');
    if (!source) continue;
    const bounds = getAssetBounds(THREE, source);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const targetWidth = oldMesh.scale.x;
    const targetHeight = oldMesh.scale.y;
    const targetDepth = Math.max(.12, oldMesh.scale.z);
    const root = new THREE.Group();
    root.name = `hospital-door-${door.room}`;
    root.position.copy(oldMesh.position);
    root.rotation.y = oldMesh.rotation.y;
    const model = source.clone(true);
    model.scale.set(targetWidth / size.x, targetHeight / size.y, targetDepth / size.z);
    model.position.set(-center.x * model.scale.x, -center.y * model.scale.y, -center.z * model.scale.z);
    root.add(model);
    scene.add(root);
    oldMesh.visible = false;
    const oldCollider = colliders.find((collider) => collider.mesh === oldMesh);
    if (oldCollider) oldCollider.mesh = root;
    door.mesh = root;
    door.floorY = floorYs[door.floor];
  }
}

function addLocalFurniture(scene, assets, floorYs, roomCenters, colliders) {
  for (let i = colliders.length - 1; i >= 0; i--) {
    if (colliders[i].mesh.userData[CATEGORY] === 'furniture') {
      colliders[i].mesh.visible = false;
      colliders.splice(i, 1);
    }
  }
  for (let floor = 0; floor < 3; floor++) {
    for (let index = 0; index < roomCenters.length; index++) {
      const [cx, roomZ] = roomCenters[index];
      const side = Math.sign(roomZ);
      const z = side * 7;
      const floorY = floorYs[floor];
      const isWard = (floor === 1 && (index === 0 || index === 1)) || (floor === 2 && index === 5);
      if (isWard) {
        new WardRoom({ scene, assets, colliders, center: [cx, z], floorY, beds: 4 });
      } else if (index === 0) {
        new HospitalTable({ scene, assets, colliders, position: [cx - .65, z], floorY, scale: .58 });
        new HospitalChair({ scene, assets, colliders, position: [cx + 1.2, z + .8], floorY, scale: .65 });
        new MedicalCabinet({ scene, assets, colliders, asset: 'cabinet3', position: [cx + 2.5, z - 1.2], floorY, scale: .8 });
      } else if (index === 1) {
        new WaitingBench({ scene, assets, colliders, position: [cx - 1.35, z], floorY, scale: .52 });
        new WaitingBench({ scene, assets, colliders, position: [cx + 1.35, z], floorY, scale: .52 });
      } else if (index === 2 || index === 3) {
        new HospitalTable({ scene, assets, colliders, position: [cx - .25, z], floorY, scale: .58 });
        new HospitalChair({ scene, assets, colliders, position: [cx + 1.45, z + .85], floorY, scale: .65 });
        new MedicalCabinet({ scene, assets, colliders, asset: index === 2 ? 'cabinet1' : 'cabinet2', position: [cx + 2.45, z - 1.3], floorY, scale: .7 });
      } else if (index === 4) {
        new MedicalCabinet({ scene, assets, colliders, asset: 'cabinet1', position: [cx - 1.6, z - 1.2], floorY, scale: .55 });
        new MedicalCabinet({ scene, assets, colliders, asset: 'cabinet1', position: [cx + .6, z - 1.2], floorY, scale: .55 });
        new HospitalTable({ scene, assets, colliders, position: [cx + 1.1, z + 1.2], floorY, scale: .52 });
      } else {
        new HospitalBed({ scene, assets, colliders, position: [cx - 1, z], floorY, scale: .58 });
        new MedicalCabinet({ scene, assets, colliders, asset: 'cabinet2', position: [cx + 1.8, z - 1.2], floorY, scale: .72 });
        new IVStand({ scene, assets, colliders, position: [cx - 1, z - 1.2], floorY, scale: .45 });
      }
    }
  }
  new Wheelchair({ scene, assets, colliders, position: [-2.2, .8], floorY: floorYs[1], rotation: -.25, scale: .62 });
}

/** Replace visible architectural primitives with the user's local modular FBX hospital kit. */
export function addHospitalVisualSlice({ scene, assets, floorYs, roomCenters, colliders, doors, markedMeshes }) {
  addModularFloors(scene, assets, floorYs, markedMeshes);
  addModularWalls(scene, assets, markedMeshes);
  addDoorFrames(scene, assets, doors, floorYs);
  addDoorModels(THREE, scene, assets, doors, colliders, floorYs);
  addLocalFurniture(scene, assets, floorYs, roomCenters, colliders);

  const fixtureMeshes = markedMeshes.filter((mesh) => mesh.userData[CATEGORY] === 'fixture');
  fixtureMeshes.forEach((mesh) => { mesh.visible = false; });
  for (const y of floorYs) {
    for (const [x, z] of roomCenters) addCenteredModel(scene, assets, 'ceilingLight', [x, y + 3.5, z], 0, .95);
    for (let x = -14; x <= 14; x += 7) addCenteredModel(scene, assets, 'ceilingLight', [x, y + 3.5, 0], 0, .95);
    addCenteredModel(scene, assets, 'exitSign', [0, y + 2.76, -10.74], 0, 1);
  }
  return { wallTiles: markedMeshes.filter((mesh) => mesh.userData[CATEGORY] === 'wall').length, importedModels: assets.size };
}
