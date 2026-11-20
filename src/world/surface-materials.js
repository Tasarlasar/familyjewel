function canvasTexture(THREE, draw, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function noise(ctx, size, count, seed = 91) {
  let value = seed;
  const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) {
    const shade = Math.floor(55 + random() * 150);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${.025 + random() * .09})`;
    const x = random() * size, y = random() * size;
    ctx.fillRect(x, y, .5 + random() * 2, .5 + random() * 2);
  }
}

export function applyHospitalSurfaceMaterials(THREE, wallMats, floorMats, ceilingMat) {
  const plaster = canvasTexture(THREE, (ctx, size) => {
    ctx.fillStyle = '#d1cbbd'; ctx.fillRect(0, 0, size, size);
    noise(ctx, size, 14000, 32);
    // Damp vertical trails and old paint repairs break up the blank plaster.
    for (let i = 0; i < 18; i++) {
      const x = (i * 83 + 17) % size;
      const h = 50 + ((i * 61) % 220);
      const gradient = ctx.createLinearGradient(x, 0, x + 12, h);
      gradient.addColorStop(0, 'rgba(79,76,66,.15)');
      gradient.addColorStop(1, 'rgba(79,76,66,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x, 0, 3 + i % 9, h);
    }
    ctx.fillStyle = 'rgba(244,239,225,.09)';
    for (let y = 31; y < size; y += 97) ctx.fillRect(0, y, size, 2);
  });
  plaster.colorSpace = THREE.SRGBColorSpace;
  for (const material of wallMats) {
    material.map = plaster.clone();
    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    material.bumpMap = plaster.clone();
    material.bumpMap.colorSpace = THREE.NoColorSpace;
    material.bumpScale = .028;
    material.roughness = .97;
    material.needsUpdate = true;
  }

  const tiles = canvasTexture(THREE, (ctx, size) => {
    ctx.fillStyle = '#77766e'; ctx.fillRect(0, 0, size, size);
    const cell = size / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const shade = 105 + ((x * 17 + y * 23) % 24);
      ctx.fillStyle = `rgb(${shade},${shade + 1},${shade - 5})`;
      ctx.fillRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
      ctx.fillStyle = 'rgba(35,34,30,.11)';
      for (let n = 0; n < 4; n++) ctx.fillRect(x * cell + 12 + n * 21, y * cell + 33 + ((n * 17 + x * 11) % 71), 16, 2);
    }
    noise(ctx, size, 9000, 73);
    ctx.strokeStyle = 'rgba(39,39,36,.65)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke(); }
  });
  for (const material of floorMats) {
    material.map = tiles.clone();
    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    material.map.repeat.set(8.75, 5.5);
    material.bumpMap = tiles.clone();
    material.bumpMap.colorSpace = THREE.NoColorSpace;
    material.bumpMap.wrapS = material.bumpMap.wrapT = THREE.RepeatWrapping;
    material.bumpMap.repeat.copy(material.map.repeat);
    material.bumpScale = .035;
    material.roughness = .84;
    material.needsUpdate = true;
  }

  const panels = canvasTexture(THREE, (ctx, size) => {
    ctx.fillStyle = '#aaa99f'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i <= 8; i++) {
      ctx.fillStyle = 'rgba(36,39,38,.24)'; ctx.fillRect(i * size / 8, 0, 2, size); ctx.fillRect(0, i * size / 8, size, 2);
    }
    noise(ctx, size, 5000, 81);
  });
  ceilingMat.map = panels;
  ceilingMat.roughness = .92;
  ceilingMat.needsUpdate = true;
}
