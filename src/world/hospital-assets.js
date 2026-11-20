import { MeshStandardMaterial, SRGBColorSpace, TextureLoader } from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const ROOT = `${import.meta.env.BASE_URL}assets/hospital-fbx/`;
const FILES = {
  bed: 'bed.fbx', bench: 'bench.fbx', cabinet1: 'cabinet_1.fbx', cabinet2: 'cabinet_2.fbx', cabinet3: 'cabinet_3.fbx',
  ceilingLight: 'ceiling_light.fbx', ceilingTile: 'ceiling_tile.fbx', chair: 'chair.fbx', door1: 'door_1.fbx', door2: 'door_2.fbx',
  exitSign: 'Exit_sign.fbx', floorTile1: 'floor_tile_1.fbx', floorTile2: 'floor_tile_2.fbx', ivBag: 'IV_Bag.fbx', ivHolder: 'IV_Bag_holder.fbx',
  magazine: 'Magazine1.fbx', pillar: 'pillar.fbx', table: 'table.fbx', corner: 'tile_corner.fbx', doorway1: 'tile_doorway_1.fbx',
  doorway2: 'tile_doorway_2.fbx', wall: 'tile_wall.fbx', wallHalf: 'tile_wall_half.fbx', window: 'tile_window.fbx', wheelchair: 'wheel_chair.fbx',
};

const TEXTURES = {
  bed: 'bed/Bed_BaseColor.png', ceiling: 'ceiling_1/Ceiling_1_BaseColor.png', ceilingLight: 'Ceiling_light/Ceiling_light_BaseColor.png',
  furniture: 'Chairs_table_1/Chairs_tables_1_BaseColor.png', doorway: 'Doorway_1/Doorway_1_BaseColor.png', door: 'Door_1/Door_1_BaseColor.png',
  exitSign: 'exit_sign/Exit_sign_Base_color.png', floor: 'Floors_1/Floors_1_BaseColor.png', ivBag: 'Iv_bag/IV_Bag_IV_pole_bag_BaseColor.png',
  ivHolder: 'Iv_pole/IV_pole_bag_Base_color.png', magazine: 'Magazine/Magazine_Base_color.png', walls: 'Walls_1/Walls_1_BaseColor.png',
  wheelchair: 'wheel_chair/Wheel_chair_BaseColor.png',
};

const TEXTURE_FOR_ASSET = {
  bed: 'bed', bench: 'furniture', cabinet1: 'furniture', cabinet2: 'furniture', cabinet3: 'furniture', chair: 'furniture', table: 'furniture',
  ceilingLight: 'ceilingLight', ceilingTile: 'ceiling', door1: 'door', door2: 'door', exitSign: 'exitSign', floorTile1: 'floor', floorTile2: 'floor',
  ivBag: 'ivBag', ivHolder: 'ivHolder', magazine: 'magazine', pillar: 'walls', corner: 'walls', doorway1: 'doorway', doorway2: 'doorway',
  wall: 'walls', wallHalf: 'walls', window: 'walls', wheelchair: 'wheelchair',
};

export async function loadHospitalAssets() {
  const loader = new FBXLoader();
  const textureLoader = new TextureLoader();
  const textureEntries = await Promise.all(Object.entries(TEXTURES).map(async ([key, path]) => {
    const texture = await textureLoader.loadAsync(`${ROOT}textures/${path}`);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return [key, texture];
  }));
  const textures = new Map(textureEntries);
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
    const model = await loader.loadAsync(`${ROOT}models/${file}`);
    const texture = textures.get(TEXTURE_FOR_ASSET[key]);
    const roughness = key === 'door1' || key === 'door2' ? .78 : key.startsWith('cabinet') ? .86 : .92;
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const materialFor = (source) => {
        return new MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          roughness,
          metalness: key === 'ceilingLight' || key === 'ivHolder' || key === 'wheelchair' ? .22 : .02,
          side: source.side,
          transparent: source.transparent,
          opacity: source.opacity,
          alphaTest: source.alphaTest,
        });
      };
      node.material = Array.isArray(node.material) ? node.material.map(materialFor) : materialFor(node.material);
    });
    model.userData.assetKey = key;
    model.updateMatrixWorld(true);
    return [key, model];
  }));
  return new Map(entries);
}

export function getAssetBounds(THREE, model) {
  model.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(model);
}

export function createInstancedAsset(THREE, model, capacity, name) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((node) => { if (node.isMesh) meshes.push(node); });
  if (meshes.length !== 1) throw new Error(`${name} must contain one mesh to be instanced (found ${meshes.length})`);
  const source = meshes[0];
  const geometry = source.geometry.clone();
  geometry.applyMatrix4(source.matrixWorld);
  geometry.scale(.01, .01, .01);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const instances = new THREE.InstancedMesh(geometry, source.material, capacity);
  instances.name = `hospital-fbx-${name}`;
  instances.castShadow = true;
  instances.receiveShadow = true;
  instances.frustumCulled = false;
  return instances;
}
