export function createSpecimenJar(THREE, number, position, rotation = 0) {
  const jar = new THREE.Group();
  const accent = number === 1 ? 0xff7657 : 0x62d8c4;
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xa9b7b1,
    roughness: .2,
    metalness: .08,
    transmission: .38,
    transparent: true,
    opacity: .78,
    thickness: .12,
  });
  const sample = new THREE.MeshStandardMaterial({ color: number === 1 ? 0x54352d : 0x3f3430, roughness: .5 });
  const cap = new THREE.MeshStandardMaterial({ color: 0x777363, metalness: .55, roughness: .42 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .32, 16, 1, true), glass);
  body.position.y = .18;
  jar.add(body);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .025, 16), glass);
  bottom.position.y = .025;
  jar.add(bottom);
  const contents = new THREE.Mesh(new THREE.CylinderGeometry(.115, .12, .115, 12), sample);
  contents.position.y = .095;
  jar.add(contents);
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .065, 12), cap);
  stopper.position.y = .375;
  jar.add(stopper);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d0ccba';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#34342f';
  ctx.font = 'bold 23px monospace';
  ctx.fillText(`SPECIMEN 0${number}`, 12, 35);
  ctx.font = '16px monospace';
  ctx.fillText('PATIENT K. A.', 12, 65);
  const labelTexture = new THREE.CanvasTexture(canvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.151, .151, .11, 16, 1, true), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: .94 }));
  label.position.y = .215;
  jar.add(label);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(.16, 24, 18),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.8, roughness: .2, metalness: .16 }),
  );
  orb.position.y = .72;
  jar.add(orb);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(.255, .018, 8, 36),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .82 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = .72;
  jar.add(halo);
  const beacon = new THREE.PointLight(accent, 2.3, 5, 2);
  beacon.position.y = .78;
  jar.add(beacon);
  jar.position.set(...position);
  jar.rotation.y = rotation;
  jar.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  jar.userData = { objective: number, name: `A sealed patient specimen, ${number === 1 ? 'left' : 'right'}`, orb, halo };
  return jar;
}
