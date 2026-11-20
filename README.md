# The Quiet Ward

A first-person Three.js horror game set inside an abandoned three-floor hospital. The Yokai is blind and reacts to a short-lived field of sound events. There is no map, compass, enemy marker, or objective arrow.

## Run locally

Install Node.js, then from this folder run:

```sh
npm install
npm run dev
```

Open the local Vite URL in a desktop browser. Microphone access is optional and is only available from localhost or a secure origin. If permission is denied, in-game sound still drives the Yokai.

## Controls

- **WASD** move; **mouse** look
- **Space** jump over low obstacles
- **Shift** run; **Ctrl** or **C** crouch
- **E** interact, pick up, hide, or leave
- **1–3** select an inventory slot; **1** also toggles the torch
- **Left click** throw the selected item
- **Esc** pause; **F** show developer diagnostics

Walk the switchback stairs at the east end of the main corridor to move between floors. The player collides with hospital furniture and imported equipment. Items are limited, glass breaks, and reusable metal objects can be picked up again. Throwing the torch leaves the player without its light until recovered.

## Notes

Three.js is the only 3D engine. The hospital now uses modular CC0 GLB assets for patient wards, corridor junctions, and medical equipment, with local files in `public/assets/hospital/`. The models are loaded before the start button becomes available. Google Fonts are optional; system fonts remain usable if the font request is unavailable.

The Yokai is a custom, low-poly wooden figure with procedural listening and movement animation. The requested BakaFoxAssets Tung Tung Tung Sahur model is 3.7k triangles on [its Sketchfab page](https://sketchfab.com/3d-models/tung-tung-tung-sahur-791037052de04c3baa68d5d4db70ab8b). The uploader's description says CC0, while the page's license field currently says Free Standard; I did not assume those grants are interchangeable or bundle the asset. Sketchfab's download endpoint also requires authentication. The in-game figure is not a copy of that model. If you provide an authorized GLB, I can swap it into the existing character presentation and retain the fallback.

The asset modules are defined in `src/world/hospital-assets.js` and placed by `src/world/visual-slice.js`. KTX2 textures are transcoded locally with the Three.js Basis files in `public/basis/`; the game does not need a network connection to decode them. The asset author lists the models as CC0 on [Tevy's model library](https://tevy.dev/models). The shell also uses generated plaster, tile and ceiling panel textures from `src/world/surface-materials.js`.

The scene also has room number signage, floor-specific palette and lighting, 1F reception landmarks, and a distinct 3F restricted wing. The Yokai starts on 3F and follows room/corridor routes with sound attenuation between rooms and floors. The Tung Tung Tung Sahur Sketchfab model is not included: the uploader description and platform license field conflict, and the platform's authenticated download was unavailable. The game's existing procedural Yokai remains the local fallback.
