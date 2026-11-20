import * as THREE from 'three';

/** Shared imported-object base with a matching invisible collision volume. */
export class HospitalObject extends THREE.Group {
  constructor({ scene, assets, colliders, asset, position, floorY, rotation = 0, scale = 1, collide = true }) {
    super();
    const source = assets.get(asset);
    if (!source) return;
    const sourceBounds = new THREE.Box3().setFromObject(source);
    const center = sourceBounds.getCenter(new THREE.Vector3());
    const unitScale = scale * .01; // The supplied FBX models are authored in centimeters.
    this.name = `hospital-${asset}`;
    this.rotation.y = rotation;
    this.scale.setScalar(unitScale);
    const centerOffset = new THREE.Vector3(center.x, 0, center.z).multiplyScalar(unitScale).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    this.position.set(position[0] - centerOffset.x, floorY - sourceBounds.min.y * unitScale, position[1] - centerOffset.z);
    const model = source.clone(true);
    model.traverse((node) => {
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    this.add(model);
    scene.add(this);
    if (!collide) return;
    this.updateMatrixWorld(true);
    const worldBounds = new THREE.Box3().setFromObject(this);
    const size = worldBounds.getSize(new THREE.Vector3());
    const centerWorld = worldBounds.getCenter(new THREE.Vector3());
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.copy(centerWorld);
    proxy.visible = false;
    proxy.name = `${this.name}-collision`;
    scene.add(proxy);
    colliders.push({ mesh: proxy, floor: Math.max(0, Math.min(2, Math.round(floorY / 4.5))), object: asset });
  }
}

export class HospitalBed extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'bed', scale: options.scale ?? .66 }); }
}
export class WaitingBench extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'bench', scale: options.scale ?? .55 }); }
}
export class MedicalCabinet extends HospitalObject {
  constructor(options) { super({ ...options, asset: options.asset ?? 'cabinet1', scale: options.scale ?? .75 }); }
}
export class HospitalChair extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'chair', scale: options.scale ?? .75 }); }
}
export class HospitalTable extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'table', scale: options.scale ?? .68 }); }
}
export class Wheelchair extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'wheelchair', scale: options.scale ?? .62 }); }
}
export class IVStand extends HospitalObject {
  constructor(options) { super({ ...options, asset: 'ivHolder', scale: options.scale ?? .5 }); }
}

/** A four-bed ward is assembled from the supplied FBX bed and IV-stand models. */
export class WardRoom {
  constructor({ scene, assets, colliders, center, floorY, beds = 4, rotation = 0 }) {
    const spots = beds === 2 ? [[-1.35, 0], [1.35, 0]] : [[-1.45, -1.7], [1.45, -1.7], [-1.45, 1.7], [1.45, 1.7]];
    for (const [x, z] of spots) {
      const offset = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      const px = center[0] + offset.x;
      const pz = center[1] + offset.z;
      new HospitalBed({ scene, assets, colliders, position: [px, pz], floorY, rotation });
      const head = new THREE.Vector3(0, 0, -1.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      new IVStand({ scene, assets, colliders, position: [px + head.x, pz + head.z], floorY, rotation });
    }
  }
}
