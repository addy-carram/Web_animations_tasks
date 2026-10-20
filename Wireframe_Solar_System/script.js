import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const MONTREAL = { lat: 45.5017, lon: -73.5673 };
const STREET_NAME = "Rue Sainte-Catherine Ouest";
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const sm = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const R_KM = 6371; // raza Pământului în km

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1337);

// 1. Scena, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  12000,
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Distanțele călătoriei: de la galaxia întreagă până la Soare + Pământ
const DIST_FAR = 2300;
const DIST_NEAR = 85;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; // zoom-ul îl facem noi, cu scroll
controls.enablePan = false;
camera.position.set(0, 0.35, 1).normalize().multiplyScalar(DIST_FAR);
controls.target.set(0, 0, 0);
controls.update();

// Bloom (strălucirea care se revarsă din zonele foarte luminoase)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.1, // strength
  0.7, // radius
  0.8, // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// 2. Luminile
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Textură de strălucire (Soare, galaxie, lămpi, marcaj)
function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,200,80,0.9)");
  g.addColorStop(0.35, "rgba(255,140,0,0.35)");
  g.addColorStop(1, "rgba(255,100,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// 3. Galaxia + stelele de fundal
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function makePoints(pos, col, size) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize;
      uniform float uPR; varying vec3 vColor; varying float vFade;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = -mv.z;
        float k = clamp(1500.0 / dist, 0.4, 1.6);
        gl_PointSize = max(1.0, aSize * uPR * k);
        vFade = smoothstep(2.0, 40.0, dist);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * vFade);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

function createGalaxy() {
  const ARMS = 2,
    RADIUS = 800,
    TWIST = 2.4;
  const ARM_COUNT = 70000,
    BULGE_COUNT = 18000;
  const total = ARM_COUNT + BULGE_COUNT;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const size = new Float32Array(total);
  const inner = new THREE.Color(1.0, 0.82, 0.55);
  const outer = new THREE.Color(0.25, 0.65, 0.9);
  const pink = new THREE.Color(1.0, 0.5, 0.7);
  const c = new THREE.Color();

  for (let i = 0; i < total; i++) {
    let x, y, z;
    if (i < ARM_COUNT) {
      const r = Math.pow(Math.random(), 1.5) * RADIUS;
      const t = r / RADIUS;
      const angle = ((i % ARMS) / ARMS) * Math.PI * 2 + t * TWIST * Math.PI;
      const spread = 10 + r * 0.12;
      x = Math.cos(angle) * r + gauss() * spread;
      z = Math.sin(angle) * r + gauss() * spread;
      y = gauss() * (25 * (1 - t) + 4);
      c.copy(inner).lerp(outer, Math.min(1, t * 1.4));
      if (Math.random() < 0.04) c.lerp(pink, 0.7);
      size[i] = 1.2 + Math.pow(Math.random(), 6) * 7;
    } else {
      x = gauss() * RADIUS * 0.16;
      y = gauss() * RADIUS * 0.09;
      z = gauss() * RADIUS * 0.16;
      c.copy(inner);
      size[i] = 1 + Math.random() * 2.5;
    }
    c.multiplyScalar(0.5 + Math.random() * 0.5);
    pos.set([x, y, z], i * 3);
    col.set([c.r, c.g, c.b], i * 3);
  }

  const galaxy = new THREE.Group();
  galaxy.add(makePoints(pos, col, size));

  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xffe6b0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
    }),
  );
  core.scale.set(420, 420, 1);
  galaxy.add(core);
  galaxy.userData.core = core;
  return galaxy;
}

const galaxy = createGalaxy();
galaxy.rotation.set(0.9, 0.3, 0.5);
scene.add(galaxy);

// stele de fundal, în toate direcțiile
{
  const N = 5000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const tints = [0xffffff, 0xaec6ff, 0xfff1c0, 0xffd0b0].map(
    (h) => new THREE.Color(h),
  );
  for (let i = 0; i < N; i++) {
    const radius = 2800 + Math.random() * 2500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos.set(
      [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      ],
      i * 3,
    );
    const t = tints[Math.floor(Math.random() * tints.length)];
    const b = 0.4 + Math.random() * 0.6;
    col.set([t.r * b, t.g * b, t.b * b], i * 3);
    size[i] = 2 + Math.pow(Math.random(), 5) * 8;
  }
  scene.add(makePoints(pos, col, size));
}

// 4. Sistemul solar: un grup așezat ÎN interiorul galaxiei
const solarSystem = new THREE.Group();
solarSystem.position.set(520, 0, 0);
galaxy.add(solarSystem);

const sunLight = new THREE.PointLight(0xffffff, 6000, 0, 2);
solarSystem.add(sunLight);

// 5. Soarele
const SUN_RADIUS = 8;
const sunGroup = new THREE.Group();
sunGroup.rotation.z = THREE.MathUtils.degToRad(7.25);
solarSystem.add(sunGroup);

const noiseGLSL = `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
`;

const sunVertex = `
  varying vec3 vPos; varying vec3 vNormalV; varying vec3 vViewPos;
  void main(){
    vPos = position;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const sunMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uBright: { value: 1.6 } },
  vertexShader: sunVertex,
  fragmentShader: `
    uniform float uTime; uniform float uBright;
    varying vec3 vPos; varying vec3 vNormalV; varying vec3 vViewPos;
    ${noiseGLSL}
    void main(){
      vec3 p = normalize(vPos);
      float t = uTime * 0.05;

      vec3 q = vec3(fbm(p*3.0+t), fbm(p*3.0+5.2-t), fbm(p*3.0+9.1+t));
      float n = fbm(p*4.0 + q*1.5 + t);
      float gran = fbm(p*18.0 + t*2.0);
      float ridge = 1.0 - abs(fbm(p*6.0 + q*2.0 - t)*2.0 - 1.0);
      ridge = pow(ridge, 3.0);
      float spots = smoothstep(0.62, 0.72, fbm(p*2.5 + 3.0 + t*0.3));

      vec3 cDark = vec3(0.45, 0.08, 0.0);
      vec3 cMid  = vec3(1.0, 0.45, 0.02);
      vec3 cHot  = vec3(1.0, 0.85, 0.35);

      float h = clamp(n*1.1 + gran*0.35, 0.0, 1.0);
      vec3 col = mix(cDark, cMid, smoothstep(0.2, 0.6, h));
      col = mix(col, cHot, smoothstep(0.55, 0.95, h));
      col += cHot * ridge * 0.6;
      col = mix(col, cDark*0.4, spots*0.85);

      vec3 N = normalize(vNormalV);
      vec3 V = normalize(-vViewPos);
      float fres = 1.0 - max(dot(N, V), 0.0);
      col += vec3(1.0, 0.35, 0.0) * pow(fres, 2.5) * 1.5;

      gl_FragColor = vec4(col * uBright, 1.0);
    }
  `,
});

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS, 64, 64),
  sunMaterial,
);
sunGroup.add(sun);

const coronaMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: sunVertex,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos; varying vec3 vNormalV; varying vec3 vViewPos;
    ${noiseGLSL}
    void main(){
      vec3 N = normalize(vNormalV);
      vec3 V = normalize(-vViewPos);
      float f = pow(1.0 - max(dot(N, V), 0.0), 2.0);
      float n = fbm(normalize(vPos)*5.0 + uTime*0.1);
      float a = f * (0.4 + n*1.2);
      gl_FragColor = vec4(vec3(1.0, 0.5, 0.1) * a * 2.0, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const corona = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS * 1.07, 64, 64),
  coronaMaterial,
);
sunGroup.add(corona);

// Axa de rotație a Soarelui
const axisLength = SUN_RADIUS * 2.2;
const axisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, -axisLength, 0),
  new THREE.Vector3(0, axisLength, 0),
]);
const sunAxis = new THREE.Group();
sunAxis.add(
  new THREE.Line(
    axisGeometry,
    new THREE.LineBasicMaterial({ color: 0x00ffff }),
  ),
);
for (const y of [-axisLength, axisLength]) {
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ffff }),
  );
  tip.position.y = y;
  sunAxis.add(tip);
}
sunGroup.add(sunAxis);

const glow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }),
);
glow.scale.set(SUN_RADIUS * 6, SUN_RADIUS * 6, 1);
solarSystem.add(glow);

// 6. Pământul
const EARTH_RADIUS = 3;
const ORBIT_RADIUS = 38;
const texPath =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/";
const loader = new THREE.TextureLoader();

const earthMap = loader.load(texPath + "earth_atmos_2048.jpg");
earthMap.colorSpace = THREE.SRGBColorSpace;
earthMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
const earthNormal = loader.load(texPath + "earth_normal_2048.jpg");
const earthSpecular = loader.load(texPath + "earth_specular_2048.jpg");
const cloudsMap = loader.load(texPath + "earth_clouds_1024.png");
cloudsMap.colorSpace = THREE.SRGBColorSpace;

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
  new THREE.MeshPhongMaterial({
    map: earthMap,
    normalMap: earthNormal,
    specularMap: earthSpecular,
    specular: new THREE.Color(0x444444),
    shininess: 18,
  }),
);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 64, 64),
  new THREE.MeshPhongMaterial({
    map: cloudsMap,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
);

const earthPivot = new THREE.Group();
const earthTilt = new THREE.Group();
earthTilt.rotation.z = THREE.MathUtils.degToRad(23.4);
earthTilt.add(earth);
earthTilt.add(clouds);
earthPivot.add(earthTilt);
solarSystem.add(earthPivot);

// poziția Montréalului pe glob (latitudine/longitudine -> punct pe sferă)
function latLonToVec3(lat, lon) {
  const phi = THREE.MathUtils.degToRad(lon + 180);
  const theta = THREE.MathUtils.degToRad(90 - lat);
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
  );
}
const montrealLocal = latLonToVec3(MONTREAL.lat, MONTREAL.lon);

// marcaj luminos pe Montréal
const pin = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }),
);
pin.position.copy(montrealLocal).multiplyScalar(EARTH_RADIUS * 1.02);
earth.add(pin);

// sferă invizibilă mai mare, ca Pământul să fie ușor de nimerit cu click
const earthHit = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 2.2, 16, 16),
  new THREE.MeshBasicMaterial({ visible: false }),
);
earthPivot.add(earthHit);

// Atmosfera (culoarea se schimbă cu altitudinea prin uCol)
const atmoUniforms = {
  uSun: { value: new THREE.Vector3(1, 0, 0) },
  uStr: { value: 1 },
  uCol: { value: new THREE.Vector3(0.3, 0.6, 1.0) },
};
const atmoVertex = `
  varying vec3 vWN; varying vec3 vWP;
  void main(){
    vWN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const atmoInner = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64),
  new THREE.ShaderMaterial({
    uniforms: atmoUniforms,
    vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uSun; uniform float uStr; uniform vec3 uCol;
      varying vec3 vWN; varying vec3 vWP;
      void main(){
        vec3 N = normalize(vWN);
        vec3 V = normalize(cameraPosition - vWP);
        float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        float lit = clamp(dot(N, normalize(uSun)) * 1.3 + 0.3, 0.0, 1.0);
        gl_FragColor = vec4(uCol, f * lit * uStr * 1.4);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
const atmoOuter = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.22, 64, 64),
  new THREE.ShaderMaterial({
    uniforms: atmoUniforms,
    vertexShader: atmoVertex,
    fragmentShader: `
      uniform vec3 uSun; uniform float uStr; uniform vec3 uCol;
      varying vec3 vWN; varying vec3 vWP;
      void main(){
        vec3 N = normalize(vWN);
        vec3 V = normalize(cameraPosition - vWP);
        float d = clamp(-dot(N, V), 0.0, 1.0);
        float g = pow(smoothstep(0.0, 0.55, d), 2.0);
        float lit = clamp(dot(N, normalize(uSun)) * 1.3 + 0.35, 0.0, 1.0);
        gl_FragColor = vec4(uCol, g * lit * uStr * 0.9);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
earthPivot.add(atmoInner);
earthPivot.add(atmoOuter);

// Linia orbitei
const orbitPoints = [];
for (let i = 0; i <= 128; i++) {
  const a = (i / 128) * Math.PI * 2;
  orbitPoints.push(
    new THREE.Vector3(
      Math.cos(a) * ORBIT_RADIUS,
      0,
      Math.sin(a) * ORBIT_RADIUS,
    ),
  );
}
const orbitLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(orbitPoints),
  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
  }),
);
solarSystem.add(orbitLine);

// 7. ORAȘUL (scenă separată: hartă din satelit + stradă procedurală la apus)
const cityScene = new THREE.Scene();
const GRID = THREE.MathUtils.degToRad(30); // grila străzilor din Montréal e rotită față de nord
cityScene.fog = new THREE.FogExp2(0x000000, 0.003);
cityScene.fog.color.setRGB(0.8, 0.4, 0.24);

// cer de apus (shader). uHigh = 0 la sol, 1 sus: cerul devine mai adânc spre spațiu
const skySun = new THREE.Vector3(-1, 0.1, 0)
  .applyAxisAngle(Y_AXIS, GRID)
  .normalize();
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: skySun }, uHigh: { value: 0 } },
  vertexShader: `
    varying vec3 vDir;
    void main(){
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 uSun; uniform float uHigh; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = clamp(d.y, -0.2, 1.0);
      vec3 horizon = vec3(0.95, 0.48, 0.28);
      vec3 mid = mix(vec3(0.45, 0.25, 0.35), vec3(0.2, 0.32, 0.62), uHigh);
      vec3 zenith = mix(vec3(0.04, 0.07, 0.2), vec3(0.01, 0.03, 0.12), uHigh);
      vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, h));
      col = mix(col, zenith, smoothstep(0.2, 0.9, h));
      float s = max(dot(d, normalize(uSun)), 0.0);
      col += vec3(1.0, 0.6, 0.3) * pow(s, 6.0) * 0.8;
      col += vec3(1.0, 0.85, 0.6) * pow(s, 400.0) * 12.0;
      col = mix(col, vec3(0.3, 0.15, 0.1), smoothstep(0.0, -0.2, d.y));
      gl_FragColor = vec4(col, 1.0);
    }`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat);
sky.renderOrder = -10;
sky.frustumCulled = false;
cityScene.add(sky);

// harta de reflexii din cer (sticla și asfaltul reflectă apusul)
try {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  const pm = new THREE.PMREMGenerator(renderer);
  cityScene.environment = pm.fromScene(envScene, 0, 1, 1000).texture;
  pm.dispose();
} catch (err) {
  console.warn("Harta de reflexii nu a putut fi creată:", err);
}

cityScene.add(new THREE.HemisphereLight(0xffb98a, 0x241a2e, 0.6));
const keyLight = new THREE.DirectionalLight(0xffa860, 2.2);
keyLight.position.set(-200, 120, 150);
cityScene.add(keyLight);

// pământul de sub oraș
const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 9000),
  new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 1 }),
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.6;
cityScene.add(groundPlane);

// harta din satelit (Esri World Imagery), tile-uri zoom 15 în jurul Montréalului
const tileMats = [];
{
  const Z = 15;
  const N = Math.pow(2, Z);
  const latR = THREE.MathUtils.degToRad(MONTREAL.lat);
  const xt = ((MONTREAL.lon + 180) / 360) * N;
  const yt =
    ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * N;
  const size = (40075016.686 * Math.cos(latR)) / N;
  const cx = Math.floor(xt);
  const cy = Math.floor(yt);
  const tl = new THREE.TextureLoader();
  tl.setCrossOrigin("anonymous");
  const planeGeo = new THREE.PlaneGeometry(size, size);
  const R = 4; // 9x9 tile-uri, ~7,7 km
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      const tx = cx + i;
      const ty = cy + j;
      const tex = tl.load(
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${ty}/${tx}`,
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xe6cdb8,
        transparent: true,
      });
      tileMats.push(mat);
      const m = new THREE.Mesh(planeGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set((tx + 0.5 - xt) * size, -0.1, (ty + 0.5 - yt) * size);
      cityScene.add(m);
    }
  }
}

// norii din troposferă (printre ei treci la coborâre; de jos îi vezi pe cer)
function createCloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const rr = mulberry32(99);
  for (let i = 0; i < 34; i++) {
    const ang = rr() * Math.PI * 2;
    const rad = Math.pow(rr(), 0.7) * 70;
    const x = 128 + Math.cos(ang) * rad * 1.3;
    const y = 128 + Math.sin(ang) * rad * 0.7;
    const r = 26 + rr() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.28)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // estompăm marginile ca puful să nu aibă contur dur
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const cloudTex = createCloudTexture();
const cloudSprites = [];
const cloudColor = new THREE.Color(1, 0.8, 0.66);
for (let i = 0; i < 140; i++) {
  const mat = new THREE.SpriteMaterial({
    map: cloudTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const s = new THREE.Sprite(mat);
  const rad = 200 + rnd() * 2200;
  const a = rnd() * Math.PI * 2;
  s.position.set(Math.cos(a) * rad, 1700 + rnd() * 1700, Math.sin(a) * rad);
  const sc = 500 + rnd() * 900;
  s.scale.set(sc, sc * 0.55, 1);
  s.userData.base = 0.5 + rnd() * 0.4;
  cityScene.add(s);
  cloudSprites.push(s);
}

// strada: grup rotit pe grila Montréalului (crește din sol când cobori)
const cityStreet = new THREE.Group();
cityStreet.rotation.y = GRID;
cityScene.add(cityStreet);

// --- Texturi de fațadă (hartă de culoare + hartă emisivă pentru ferestre aprinse) ---
function canvasPair(W, H) {
  const a = document.createElement("canvas");
  a.width = W;
  a.height = H;
  const b = document.createElement("canvas");
  b.width = W;
  b.height = H;
  return [a, b, a.getContext("2d"), b.getContext("2d")];
}
function finishTex(a, b) {
  const map = new THREE.CanvasTexture(a);
  const emi = new THREE.CanvasTexture(b);
  for (const t of [map, emi]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, emi };
}
function winPath(ctx, x, y, w, h, arch) {
  ctx.beginPath();
  if (arch) {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.closePath();
}

// cărămidă sau piatră (arch = ferestre cu arc). Placa: 16 m lățime x 14 m înălțime (4 etaje)
function makeBrickFacade(seed, arch, base) {
  const r = mulberry32(seed);
  const [a, b, cx, ce] = canvasPair(512, 512);
  cx.fillStyle = base;
  cx.fillRect(0, 0, 512, 512);
  if (!arch) {
    for (let y = 0; y < 512; y += 8) {
      for (let x = ((y / 8) % 2) * 16; x < 512; x += 32) {
        const v = (196 + r() * 44) | 0;
        cx.fillStyle = `rgb(${v},${v - 8},${v - 16})`;
        cx.fillRect(x + 1, y + 1, 30, 6);
      }
    }
  } else {
    // piatră fățuită: rosturi orizontale și verticale
    for (let y = 0; y < 512; y += 16) {
      cx.fillStyle = "rgba(0,0,0,0.08)";
      cx.fillRect(0, y, 512, 2);
      for (let x = ((y / 16) % 2) * 32; x < 512; x += 64) {
        cx.fillRect(x, y, 2, 16);
      }
    }
  }
  ce.fillStyle = "#000";
  ce.fillRect(0, 0, 512, 512);
  cx.fillStyle = "rgba(244,236,222,0.5)"; // pilaștri la marginile plăcii
  cx.fillRect(0, 0, 9, 512);
  cx.fillRect(503, 0, 9, 512);
  for (let rr = 0; rr < 4; rr++) {
    cx.fillStyle = "rgba(240,232,218,0.75)"; // brâu de piatră între etaje
    cx.fillRect(0, rr * 128, 512, 5);
    for (let c = 0; c < 4; c++) {
      const wx = c * 128 + 26;
      const wy = rr * 128 + 22;
      const ww = 76;
      const wh = 82;
      cx.fillStyle = "#efe8dc"; // ancadrament
      winPath(cx, wx - 5, wy - 5, ww + 10, wh + 10, arch);
      cx.fill();
      const g = cx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, "#36465f");
      g.addColorStop(1, "#141a26");
      cx.fillStyle = g;
      winPath(cx, wx, wy, ww, wh, arch);
      cx.fill();
      cx.fillStyle = "#e2dacb"; // ramă
      cx.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
      cx.fillRect(wx, wy + wh * 0.45, ww, 3);
      cx.fillRect(wx - 8, wy + wh + 5, ww + 16, 6); // pervaz
      if (r() < 0.5) {
        ce.fillStyle = `rgb(255,${(175 + r() * 55) | 0},${(85 + r() * 65) | 0})`;
        winPath(ce, wx, wy, ww, wh, arch);
        ce.fill();
        ce.fillStyle = "#000";
        ce.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
        ce.fillRect(wx, wy + wh * 0.45, ww, 3);
        if (r() < 0.4) {
          ce.fillStyle = "rgba(0,0,0,0.45)"; // perdea trasă
          ce.fillRect(wx, wy, ww * (0.3 + r() * 0.4), wh);
        }
      }
    }
  }
  return finishTex(a, b);
}

// perete cortină din sticlă. Placa: 16 m x 15,2 m (4 etaje de 3,8 m, panouri de 2 m)
function makeGlassFacade(seed) {
  const r = mulberry32(seed);
  const [a, b, cx, ce] = canvasPair(512, 512);
  cx.fillStyle = "#0e151d";
  cx.fillRect(0, 0, 512, 512);
  ce.fillStyle = "#000";
  ce.fillRect(0, 0, 512, 512);
  for (let rr = 0; rr < 4; rr++) {
    for (let c = 0; c < 8; c++) {
      const x = c * 64;
      const y = rr * 128;
      cx.fillStyle = "#222d3a"; // parapet între etaje
      cx.fillRect(x, y + 100, 64, 28);
      const g = cx.createLinearGradient(0, y, 0, y + 100);
      g.addColorStop(0, "#9cc0de");
      g.addColorStop(0.5, "#4c7596");
      g.addColorStop(1, "#1d3248");
      cx.fillStyle = g;
      cx.fillRect(x + 2, y + 2, 60, 98);
      cx.fillStyle = "#0d1218"; // montant vertical
      cx.fillRect(x, y, 3, 128);
      if (r() < 0.4) {
        const warm = r() < 0.7;
        ce.fillStyle = warm
          ? `rgb(255,${(200 + r() * 40) | 0},${(130 + r() * 50) | 0})`
          : `rgb(${(190 + r() * 30) | 0},${(220 + r() * 25) | 0},255)`;
        ce.fillRect(x + 4, y + 6, 56, 90);
        ce.fillStyle = "rgba(0,0,0,0.35)";
        ce.fillRect(x + 4, y + 60, 56, 36);
      }
    }
  }
  return finishTex(a, b);
}

// vitrine și firme luminoase (placa: 12 m x 3,9 m)
function makeShopTex(seed) {
  const r = mulberry32(seed);
  const [a, b, cx, ce] = canvasPair(512, 128);
  cx.fillStyle = "#1d1d22";
  cx.fillRect(0, 0, 512, 128);
  ce.fillStyle = "#000";
  ce.fillRect(0, 0, 512, 128);
  const signs = [
    [255, 70, 60],
    [255, 190, 70],
    [90, 200, 255],
    [250, 250, 250],
    [130, 255, 170],
    [255, 120, 200],
  ];
  for (let s = 0; s < 3; s++) {
    const x0 = s * 170 + 6;
    const sc = signs[(r() * signs.length) | 0];
    cx.fillStyle = "#2b2b32";
    cx.fillRect(x0 + 4, 8, 152, 22);
    ce.fillStyle = `rgb(${sc[0]},${sc[1]},${sc[2]})`;
    ce.fillRect(x0 + 4, 8, 152, 22);
    ce.fillStyle = "#000"; // "litere" pe firmă
    for (let k = 0; k < 7; k++)
      ce.fillRect(x0 + 14 + k * 19, 14, 10 + ((r() * 5) | 0), 10);
    cx.fillStyle = "#101216";
    cx.fillRect(x0 + 6, 38, 148, 82);
    const g = ce.createLinearGradient(0, 38, 0, 120);
    g.addColorStop(0, "rgb(255,215,150)");
    g.addColorStop(1, "rgb(230,150,80)");
    ce.fillStyle = g;
    ce.fillRect(x0 + 6, 38, 148, 82);
    ce.fillStyle = "rgba(0,0,0,0.5)"; // siluete de produse
    for (let k = 0; k < 5; k++) {
      ce.fillRect(
        x0 + 12 + r() * 120,
        60 + r() * 50,
        10 + r() * 20,
        20 + r() * 30,
      );
    }
    ce.fillStyle = "#000"; // ramă la mijloc
    ce.fillRect(x0 + 78, 38, 3, 82);
  }
  return finishTex(a, b);
}

// --- Materiale ---
const std = (color, rough = 0.8, metal = 0, env = 0.4) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    envMapIntensity: env,
  });
const facadeMat = (tex, color, env = 0.35, em = 0.9) =>
  new THREE.MeshStandardMaterial({
    map: tex.map,
    emissiveMap: tex.emi,
    emissive: 0xffffff,
    emissiveIntensity: em,
    color,
    roughness: 0.85,
    envMapIntensity: env,
  });

const brickTex = [11, 23, 37].map((s) => makeBrickFacade(s, false, "#d9d0c7"));
const stoneTex = [51, 67].map((s) => makeBrickFacade(s, true, "#e4dccb"));
const glassTex = [5, 17, 29].map((s) => makeGlassFacade(s));
const shopTex = [3, 8, 13, 21].map((s) => makeShopTex(s));

const brickMats = [
  0xb8785a, 0x9c6a52, 0x8d8378, 0xa89478, 0x6f7380, 0xc2a285,
].map((c, i) => facadeMat(brickTex[i % 3], c));
const stoneMats = [0xd9cfb8, 0xc9bba0, 0xb6b0a4, 0xd4c3a8].map((c, i) =>
  facadeMat(stoneTex[i % 2], c),
);
const glassMats = [0xbfd0df, 0xa6c0d4, 0xd2c2a8, 0x9db0c4].map(
  (c, i) =>
    new THREE.MeshStandardMaterial({
      map: glassTex[i % 3].map,
      emissiveMap: glassTex[i % 3].emi,
      emissive: 0xffffff,
      emissiveIntensity: 1.05,
      color: c,
      roughness: 0.2,
      metalness: 0.5,
      envMapIntensity: 1.4,
    }),
);
const shopMats = shopTex.map(
  (t) =>
    new THREE.MeshStandardMaterial({
      map: t.map,
      emissiveMap: t.emi,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      color: 0xffffff,
      roughness: 0.5,
    }),
);
const awnings = [0x8e1f24, 0x1f4d3a, 0x1c2f5a, 0x6b4b1f].map((c) =>
  std(c, 0.9),
);
const M = {
  stone: std(0xcfc6b4, 0.85),
  roof: std(0x2a2c32, 0.95),
  copper: std(0x4f9c86, 0.5, 0.3),
  metal: std(0x3a3d44, 0.6, 0.5),
  iron: std(0x16161a, 0.5, 0.6),
  concrete: std(0x7d7b80, 0.95),
  tankWood: std(0x5a4636, 0.9),
  warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9) }),
  accent: new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.7, 1.0),
  }),
};
const beaconMat = new THREE.SpriteMaterial({
  map: createGlowTexture(),
  color: 0xff2a1a,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

// --- Constructor de clădiri: toate piesele se îmbină pe material (puține draw-call-uri) ---
const batches = new Map();
const baseM = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

function placeAt(x, z, ry) {
  _p.set(x, 0, z);
  _q.setFromAxisAngle(Y_AXIS, ry);
  baseM.compose(_p, _q, _s);
}
function put(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  _p.set(x, y, z);
  _q.setFromEuler(_e.set(rx, ry, rz));
  _m.compose(_p, _q, _s);
  _m.premultiply(baseM);
  geo.applyMatrix4(_m);
  let list = batches.get(mat);
  if (!list) {
    list = [];
    batches.set(mat, list);
  }
  list.push(geo);
}
function flushBatches(parent) {
  for (const [mat, list] of batches) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (merged) parent.add(new THREE.Mesh(merged, mat));
    else console.warn("Nu s-au putut îmbina geometriile pentru un material");
  }
  batches.clear();
}

// cutie cu UV în metri, ca textura de fațadă să nu se întindă
function facadeBox(w, h, d, tw = 16, th = 14) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    if (face < 2) uv.setXY(i, (uv.getX(i) * d) / tw, (uv.getY(i) * h) / th);
    else if (face < 4)
      uv.setXY(i, (uv.getX(i) * w) / tw, (uv.getY(i) * d) / th);
    else uv.setXY(i, (uv.getX(i) * w) / tw, (uv.getY(i) * h) / th);
  }
  return g;
}

// În coordonatele locale ale unei clădiri: fața spre stradă = +z, baza la y = 0.

function cornice(w, d, y, z = 0) {
  put(new THREE.BoxGeometry(w + 0.8, 0.45, d + 0.8), M.stone, 0, y + 0.225, z);
  put(new THREE.BoxGeometry(w + 0.2, 0.15, d + 0.2), M.roof, 0, y + 0.52, z);
}

function roofJunk(w, d, y, z = 0) {
  const top = y + 0.6;
  const n = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const bw = 2 + rnd() * Math.min(6, w * 0.3);
    const bd = 2 + rnd() * Math.min(6, d * 0.3);
    const bh = 1.5 + rnd() * 2.5;
    const x = (rnd() - 0.5) * Math.max(0.1, w - bw - 2);
    const zz = z + (rnd() - 0.5) * Math.max(0.1, d - bd - 2);
    put(new THREE.BoxGeometry(bw, bh, bd), M.metal, x, top + bh / 2, zz);
  }
  if (rnd() < 0.3) {
    const x = (rnd() - 0.5) * Math.max(0.1, w - 4);
    const zz = z + (rnd() - 0.5) * Math.max(0.1, d - 4);
    put(new THREE.BoxGeometry(1.6, 1.2, 1.6), M.metal, x, top + 0.6, zz);
    put(
      new THREE.CylinderGeometry(1.3, 1.3, 2.6, 10),
      M.tankWood,
      x,
      top + 2.5,
      zz,
    );
    put(new THREE.ConeGeometry(1.4, 0.9, 10), M.roof, x, top + 4.25, zz);
  }
  if (rnd() < 0.4) {
    const len = 5 + rnd() * 8;
    put(
      new THREE.CylinderGeometry(0.04, 0.06, len, 5),
      M.iron,
      (rnd() - 0.5) * Math.max(0.1, w - 2),
      top + len / 2,
      z + (rnd() - 0.5) * Math.max(0.1, d - 2),
    );
  }
}

// acoperiș mansardă (cupru) cu lucarne
function mansard(w, d, y) {
  const hh = 4.5;
  const g = new THREE.CylinderGeometry(0.72, 1, hh, 4, 1, false);
  g.rotateY(Math.PI / 4);
  g.scale(w / Math.SQRT2, 1, d / Math.SQRT2);
  put(g, M.copper, 0, y + 0.6 + hh / 2, 0);
  const nD = Math.max(1, Math.floor(w / 5));
  for (let k = 0; k < nD; k++) {
    const x = ((k + 0.5) * w) / nD - w / 2;
    const zd = (d / 2) * 0.86;
    put(new THREE.BoxGeometry(1.8, 1.8, 1.4), M.copper, x, y + 2.2, zd);
    put(
      new THREE.BoxGeometry(1.0, 1.0, 0.1),
      rnd() < 0.6 ? M.warm : M.roof,
      x,
      y + 2.2,
      zd + 0.72,
    );
  }
}

// vitrine + copertină
function shop(w, d) {
  const m = shopMats[(rnd() * shopMats.length) | 0];
  put(facadeBox(w + 0.1, 3.9, d, 12, 3.9), m, 0, 1.95, 0.35);
  if (rnd() < 0.55) {
    put(
      new THREE.BoxGeometry(w * 0.9, 0.1, 1.5),
      awnings[(rnd() * awnings.length) | 0],
      0,
      3.45,
      d / 2 + 1.05,
      0.3,
    );
  }
}

// scara exterioară de fier, tipică Montréalului
function stairs(w, d) {
  const zf = d / 2;
  const run = 4.8;
  const rise = 3.6;
  const ang = Math.atan2(rise, run);
  const len = Math.hypot(run, rise);
  const dir = rnd() < 0.5 ? 1 : -1;
  const xb = -dir * (w / 2 - 0.7);
  const xt = xb + dir * run;
  const cx = (xb + xt) / 2;
  const z = zf + 0.6;
  put(
    new THREE.BoxGeometry(len, 0.16, 1.0),
    M.iron,
    cx,
    rise / 2,
    z,
    0,
    0,
    dir * ang,
  );
  put(
    new THREE.BoxGeometry(1.7, 0.14, 1.4),
    M.iron,
    xt + dir * 0.2,
    rise,
    zf + 0.7,
  );
  put(
    new THREE.BoxGeometry(len, 0.05, 0.05),
    M.iron,
    cx,
    rise / 2 + 0.95,
    z + 0.5,
    0,
    0,
    dir * ang,
  );
  put(
    new THREE.BoxGeometry(len, 0.05, 0.05),
    M.iron,
    cx,
    rise / 2 + 0.45,
    z + 0.5,
    0,
    0,
    dir * ang,
  );
  put(
    new THREE.BoxGeometry(1.7, 0.05, 0.05),
    M.iron,
    xt + dir * 0.2,
    rise + 0.95,
    zf + 1.4,
  );
  put(
    new THREE.BoxGeometry(1.1, 2.1, 0.1),
    rnd() < 0.6 ? M.warm : M.concrete,
    xt,
    rise + 1.1,
    zf + 0.06,
  );
}

// ferestre oriel (bay window)
function bay(w, d, mat) {
  const bx = (rnd() < 0.5 ? -1 : 1) * Math.max(0, w / 2 - 2.4);
  put(facadeBox(2.8, 7, 0.9), mat, bx, 7.0, d / 2 + 0.45);
  put(new THREE.BoxGeometry(3.3, 0.3, 1.3), M.stone, bx, 10.6, d / 2 + 0.55);
}

function balcony(x, y, zf) {
  put(new THREE.BoxGeometry(4, 0.2, 1.3), M.concrete, x, y, zf + 0.65);
  put(new THREE.BoxGeometry(4, 0.05, 0.05), M.iron, x, y + 1, zf + 1.3);
  put(new THREE.BoxGeometry(4, 0.05, 0.05), M.iron, x, y + 0.5, zf + 1.3);
  put(new THREE.BoxGeometry(0.05, 1, 0.05), M.iron, x - 2, y + 0.5, zf + 1.3);
  put(new THREE.BoxGeometry(0.05, 1, 0.05), M.iron, x + 2, y + 0.5, zf + 1.3);
}

// lumină roșie intermitentă pe clădirile înalte
function beacon(x, y, z) {
  const s = new THREE.Sprite(beaconMat);
  s.position.set(x, y, z).applyMatrix4(baseM);
  s.scale.set(6, 6, 1);
  cityStreet.add(s);
}

// --- Tipuri de clădiri ---
function bRow(w, d) {
  const floors = 3 + Math.floor(rnd() * 2);
  const h = floors * 3.5;
  const mat = brickMats[(rnd() * brickMats.length) | 0];
  put(facadeBox(w, h, d), mat, 0, h / 2, 0);
  if (rnd() < 0.4) shop(w, d);
  else stairs(w, d);
  if (rnd() < 0.3) bay(w, d, mat);
  cornice(w, d, h);
  if (rnd() < 0.3) mansard(w, d, h);
  else roofJunk(w, d, h);
}

function bMid(w, d) {
  const floors = 7 + Math.floor(rnd() * 8);
  const h = floors * 3.5;
  const mat =
    rnd() < 0.4
      ? stoneMats[(rnd() * stoneMats.length) | 0]
      : brickMats[(rnd() * brickMats.length) | 0];
  put(facadeBox(w, h, d), mat, 0, h / 2, 0);
  shop(w, d);
  put(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), M.stone, 0, 4.1, 0);
  if (rnd() < 0.6) {
    const nb = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nb; k++) {
      const f = 3 + Math.floor(rnd() * Math.max(1, floors - 5));
      balcony((rnd() - 0.5) * Math.max(1, w - 6), f * 3.5, d / 2);
    }
  }
  cornice(w, d, h);
  if (rnd() < 0.25) mansard(w, d, h);
  else roofJunk(w, d, h);
}

function bSetback(w, d, row) {
  const floors =
    row === 0 ? 16 + Math.floor(rnd() * 7) : 20 + Math.floor(rnd() * 17);
  const mat =
    rnd() < 0.5
      ? stoneMats[(rnd() * stoneMats.length) | 0]
      : brickMats[(rnd() * brickMats.length) | 0];
  const f1 = Math.round(floors * 0.4);
  const f2 = Math.round(floors * 0.35);
  const f3 = Math.max(2, floors - f1 - f2);
  const tiers = [
    { f: f1, sw: 1, sd: 1, off: 0 },
    { f: f2, sw: 0.8, sd: 0.86, off: 2 },
    { f: f3, sw: 0.56, sd: 0.7, off: 5 },
  ];
  let y = 0;
  let lastW = w;
  let lastD = d;
  let lastZ = 0;
  tiers.forEach((t, i) => {
    const tw = Math.max(8, Math.round((w * t.sw) / 4) * 4);
    const td = d * t.sd;
    const th = t.f * 3.5;
    const cz = d / 2 - t.off - td / 2;
    put(facadeBox(tw, th, td), mat, 0, y + th / 2, cz);
    y += th;
    if (i === 0) {
      shop(w, d);
      put(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), M.stone, 0, 4.1, 0);
    }
    cornice(tw, td, y, cz);
    lastW = tw;
    lastD = td;
    lastZ = cz;
  });
  put(
    new THREE.BoxGeometry(lastW + 0.4, 0.35, lastD + 0.4),
    M.accent,
    0,
    y - 0.7,
    lastZ,
  );
  roofJunk(lastW, lastD, y, lastZ);
  const len = 14 + rnd() * 8;
  put(
    new THREE.CylinderGeometry(0.1, 0.18, len, 6),
    M.iron,
    0,
    y + 0.6 + len / 2,
    lastZ,
  );
  if (y > 70) beacon(0, y + 0.6 + len, lastZ);
}

function bGlass(w, d, floors) {
  const fh = 3.8;
  const h = floors * fh;
  const ph = 7;
  const gm = glassMats[(rnd() * glassMats.length) | 0];
  const pm = stoneMats[(rnd() * stoneMats.length) | 0];
  // soclu de piatră cu vitrine
  put(facadeBox(w + 4, ph, d), pm, 0, ph / 2, 0);
  shop(w + 4, d);
  cornice(w + 4, d, ph);
  // turnul de sticlă, retras față de stradă
  const td = d - 4;
  const cz = -2;
  put(facadeBox(w, h, td, 16, 15.2), gm, 0, ph + h / 2, cz);
  const top = ph + h;
  const v = rnd();
  if (v < 0.4) {
    // coroană plată cu bandă luminoasă
    put(
      new THREE.BoxGeometry(w + 0.4, 1.0, td + 0.4),
      M.concrete,
      0,
      top + 0.5,
      cz,
    );
    put(
      new THREE.BoxGeometry(w + 0.5, 0.35, td + 0.5),
      M.accent,
      0,
      top - 0.6,
      cz,
    );
    put(new THREE.BoxGeometry(w * 0.5, 4, td * 0.5), M.metal, 0, top + 3, cz);
    put(new THREE.CylinderGeometry(0.08, 0.14, 12, 6), M.iron, 0, top + 11, cz);
    beacon(0, top + 17, cz);
  } else if (v < 0.75) {
    // vârf piramidal de sticlă
    const g = new THREE.CylinderGeometry(0.12, 1, 14, 4);
    g.rotateY(Math.PI / 4);
    g.scale(w / Math.SQRT2, 1, td / Math.SQRT2);
    put(g, gm, 0, top + 7, cz);
    put(
      new THREE.BoxGeometry(w + 0.5, 0.35, td + 0.5),
      M.accent,
      0,
      top - 0.3,
      cz,
    );
    put(new THREE.CylinderGeometry(0.08, 0.14, 10, 6), M.iron, 0, top + 19, cz);
    beacon(0, top + 24, cz);
  } else {
    // coroană în trepte
    const w2 = Math.max(8, Math.round((w * 0.7) / 4) * 4);
    const h2 = 3 * fh;
    put(
      new THREE.BoxGeometry(w + 0.5, 0.35, td + 0.5),
      M.accent,
      0,
      top - 0.2,
      cz,
    );
    put(facadeBox(w2, h2, td * 0.7, 16, 15.2), gm, 0, top + h2 / 2, cz);
    put(
      new THREE.BoxGeometry(w2 + 0.4, 0.35, td * 0.7 + 0.4),
      M.accent,
      0,
      top + h2 + 0.1,
      cz,
    );
    put(
      new THREE.CylinderGeometry(0.08, 0.14, 12, 6),
      M.iron,
      0,
      top + h2 + 6,
      cz,
    );
    beacon(0, top + h2 + 12, cz);
  }
}

// biserică gotică cu două turnuri și turle
function bChurch() {
  const w = 26;
  const d = 22;
  const naveH = 18;
  const sm0 = stoneMats[1];
  put(facadeBox(w, naveH, d), sm0, 0, naveH / 2, 0);
  // acoperiș în două ape (prismă triunghiulară)
  const r = (w + 1) / Math.sqrt(3);
  const roof = new THREE.CylinderGeometry(r, r, d, 3);
  roof.rotateX(-Math.PI / 2);
  roof.scale(1, 0.42, 1);
  put(roof, M.slate_ || M.roof, 0, naveH + r * 0.5 * 0.42, 0);
  for (const sx of [-1, 1]) {
    const x = sx * 9;
    const z = d / 2 - 4;
    put(facadeBox(8, 38, 8), sm0, x, 19, z);
    put(new THREE.BoxGeometry(9, 0.5, 9), M.stone, x, 30, z);
    put(new THREE.BoxGeometry(1.1, 5, 0.2), M.warm, x - 1.6, 34, d / 2 + 0.1);
    put(new THREE.BoxGeometry(1.1, 5, 0.2), M.warm, x + 1.6, 34, d / 2 + 0.1);
    const spire = new THREE.ConeGeometry(5.7, 20, 4);
    spire.rotateY(Math.PI / 4);
    put(spire, M.copper, x, 38 + 10, z);
  }
  const rose = new THREE.CylinderGeometry(2.4, 2.4, 0.3, 24);
  rose.rotateX(Math.PI / 2);
  put(rose, M.warm, 0, 14, d / 2 + 0.1);
  put(new THREE.BoxGeometry(2.2, 3.5, 0.15), M.warm, 0, 1.8, d / 2 + 0.05);
}

// ixs = străzile laterale care taie strada principală
const ixs = [-360, -240, -120, 120, 240, 360];
const overlapsGap = (x0, x1) => ixs.some((ix) => x1 > ix - 8 && x0 < ix + 8);

// populăm orașul: două rânduri de clădiri pe fiecare parte
{
  let church = false;
  for (const side of [1, -1]) {
    for (const row of [0, 1]) {
      const zStart = row === 0 ? 11 : 33;
      const depth = row === 0 ? 22 : 34;
      let x = -470;
      while (x < 470) {
        // biserica: o singură dată, în rândul din față, pe partea +z
        if (side === 1 && row === 0 && !church && x > 140) {
          if (overlapsGap(x, x + 26)) {
            x += 3;
            continue;
          }
          placeAt(x + 13, side * (zStart + depth / 2), Math.PI);
          bChurch();
          church = true;
          x += 26.5;
          continue;
        }
        const p = rnd();
        let type;
        if (row === 0)
          type =
            p < 0.55
              ? "row"
              : p < 0.82
                ? "mid"
                : p < 0.94
                  ? "setback"
                  : "glassLow";
        else type = p < 0.42 ? "glass" : p < 0.78 ? "setback" : "mid";

        let w;
        if (type === "row") w = 4 * (2 + Math.floor(rnd() * 3));
        else if (type === "mid") w = 4 * (4 + Math.floor(rnd() * 4));
        else if (type === "setback") w = 4 * (6 + Math.floor(rnd() * 3));
        else if (type === "glassLow") w = 4 * (5 + Math.floor(rnd() * 2));
        else w = 4 * (7 + Math.floor(rnd() * 4));

        if (overlapsGap(x, x + w)) {
          x += 3;
          continue;
        }
        placeAt(x + w / 2, side * (zStart + depth / 2), side > 0 ? Math.PI : 0);
        if (type === "row") bRow(w, depth);
        else if (type === "mid") bMid(w, depth);
        else if (type === "setback") bSetback(w, depth, row);
        else if (type === "glassLow")
          bGlass(w, depth, 6 + Math.floor(rnd() * 5));
        else bGlass(w, depth, 22 + Math.floor(rnd() * 27));
        x += w + 0.5;
      }
    }
  }
  flushBatches(cityStreet);
}

// asfalt, străzi laterale, trotuare, linie de mijloc
const asphalt = new THREE.MeshStandardMaterial({
  color: 0x2b2c32,
  roughness: 0.45,
  envMapIntensity: 0.9,
});
const road = new THREE.Mesh(new THREE.PlaneGeometry(960, 14), asphalt);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
cityStreet.add(road);
for (const ix of ixs) {
  const sr = new THREE.Mesh(new THREE.PlaneGeometry(14, 140), asphalt);
  sr.rotation.x = -Math.PI / 2;
  sr.position.set(ix, 0.021, 0);
  cityStreet.add(sr);
}
{
  const walkMat = new THREE.MeshStandardMaterial({
    color: 0x55555c,
    roughness: 0.9,
  });
  const bounds = [-480, ...ixs.flatMap((ix) => [ix - 8, ix + 8]), 480];
  for (let i = 0; i < bounds.length; i += 2) {
    const a = bounds[i],
      b = bounds[i + 1];
    for (const side of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.18, 4), walkMat);
      w.position.set((a + b) / 2, 0.09, side * 9);
      cityStreet.add(w);
    }
  }
  const dashes = [];
  for (let x = -470; x < 470; x += 8)
    if (!overlapsGap(x, x + 3)) dashes.push(x);
  const dashGeo = new THREE.PlaneGeometry(3, 0.18);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMesh = new THREE.InstancedMesh(
    dashGeo,
    new THREE.MeshBasicMaterial({ color: 0xe8c64a }),
    dashes.length,
  );
  const mtx = new THREE.Matrix4();
  dashes.forEach((x, i) => {
    mtx.makeTranslation(x, 0.04, 0);
    dashMesh.setMatrixAt(i, mtx);
  });
  cityStreet.add(dashMesh);
}

// arțari de toamnă pe trotuare
{
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 4, 6);
  trunkGeo.translate(0, 2, 0);
  const crownGeo = new THREE.IcosahedronGeometry(2.4, 1);
  crownGeo.translate(0, 5.8, 0);
  const spots = [];
  for (let x = -435; x <= 435; x += 30) {
    for (const side of [1, -1]) {
      if (!overlapsGap(x - 3, x + 3)) spots.push([x, side * 9.3]);
    }
  }
  const trunks = new THREE.InstancedMesh(
    trunkGeo,
    std(0x2a1d14, 0.95),
    spots.length,
  );
  const crowns = new THREE.InstancedMesh(
    crownGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      flatShading: true,
      envMapIntensity: 0.3,
    }),
    spots.length,
  );
  const fall = [0xd35a1c, 0xe08a1e, 0xa8361a, 0x7a8a2a].map(
    (c) => new THREE.Color(c),
  );
  const tm = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    const s = 0.85 + rnd() * 0.5;
    tm.makeScale(s, s, s).setPosition(x, 0, z);
    trunks.setMatrixAt(i, tm);
    crowns.setMatrixAt(i, tm);
    crowns.setColorAt(i, fall[(rnd() * fall.length) | 0]);
  });
  crowns.instanceColor.needsUpdate = true;
  cityStreet.add(trunks, crowns);
}

// lămpi stradale: stâlp, bec, halou, pată de lumină pe asfalt
{
  const glowTex = createGlowTexture();
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 7, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1b1b20,
    roughness: 0.6,
  });
  const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
  const headMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3, 2.2, 1.2),
  });
  const poolGeo = new THREE.PlaneGeometry(18, 18);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffb060,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffc880,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let x = -450; x <= 450; x += 30) {
    for (const side of [1, -1]) {
      const z = side * 7.4;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 3.5, z);
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 7.2, z);
      const halo = new THREE.Sprite(haloMat);
      halo.position.copy(head.position);
      halo.scale.set(6, 6, 1);
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(x, 0.05, side * 3);
      cityStreet.add(pole, head, halo, pool);
    }
  }
}

// mașini care circulă pe dreapta
const cars = [];
{
  const carColors = [
    0xb02a2a, 0x2a4a8a, 0xd8d8d8, 0x1c1c1c, 0x6a6a72, 0xc9a227,
  ];
  const headMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3, 3, 2.6),
  });
  const tailMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.5, 0.15, 0.1),
  });
  const haloMat = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xfff0d0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 18; i++) {
    const dir = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: carColors[Math.floor(rnd() * carColors.length)],
      roughness: 0.4,
      envMapIntensity: 0.9,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.9), bodyMat);
    body.position.y = 0.65;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.7), bodyMat);
    cab.position.set(-0.2, 1.3, 0);
    g.add(body, cab);
    for (const zz of [-0.7, 0.7]) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.18, 0.4),
        headMat,
      );
      hl.position.set(2.2, 0.75, zz);
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.15, 0.4),
        tailMat,
      );
      tl.position.set(-2.2, 0.75, zz);
      const hh = new THREE.Sprite(haloMat);
      hh.position.set(2.5, 0.75, zz);
      hh.scale.set(2.6, 2.6, 1);
      g.add(hl, tl, hh);
    }
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    g.position.set(-420 + rnd() * 840, 0, dir * 3.5);
    cityStreet.add(g);
    cars.push({ g, dir, speed: 7 + rnd() * 7 });
  }
}

// 8. Starea călătoriei
// zoomTarget = unde vrem să ajungem (0 = galaxia întreagă, 1 = Soare + Pământ)
let zoomTarget = 0;
let zoom = 0;

// coborârea spre Montréal: d merge de la 0 (spațiu) la 1 (pe stradă)
const descent = { d: 0, target: 0, active: false };
const D_SWAP = 0.6; // aici trecem din spațiu în oraș (acoperit de ceață / nori)
let descentState = null;
let wheelLock = 0;

// starea privirii pe stradă (coordonate locale ale străzii)
const street = {
  x: 70,
  z: 0,
  yaw: 0,
  pitch: 0.018,
  tYaw: 0,
  tPitch: 0.018,
  active: false,
};

const params = {
  sunSpin: 0.01,
  earthSpin: 0.01,
  orbitSpeed: 0.004,
  showAxis: true,
  showOrbit: true,
  showClouds: true,
  zoom: 0,
  scrollSpeed: 0.0007,
  invertScroll: false,
  descentSeconds: 36,
  goGalaxy: () => (zoomTarget = 0),
  goSun: () => (zoomTarget = 1),
  goMontreal: () => {
    if (!descent.active) {
      zoomTarget = 1;
      startDescent();
    } else descent.target = 1;
  },
  leaveMontreal: () => (descent.target = 0),
};

// interfață: texte, altitudine, ceață de tranziție
const styleEl = document.createElement("style");
styleEl.textContent = `
  @keyframes lblIn { from { opacity: 0; transform: translateY(10px); letter-spacing: .6em; } to { opacity: 1; transform: none; } }
  .lbl-t { font-size: 34px; letter-spacing: .35em; animation: lblIn 1.4s ease both; }
  .lbl-s { margin-top: 8px; font-size: 13px; letter-spacing: .25em; opacity: .8; animation: lblIn 1.8s ease both; }
`;
document.head.appendChild(styleEl);

const hud = document.createElement("div");
hud.style.cssText = `
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 3;
  color: #fff; font: 14px/1.4 system-ui, sans-serif; letter-spacing: 0.08em;
  text-align: center; text-shadow: 0 0 8px #000; pointer-events: none;
  opacity: 0.85;
`;
document.body.appendChild(hud);

const titleEl = document.createElement("div");
titleEl.style.cssText = `
  position: fixed; left: 50%; top: 9%; transform: translateX(-50%); z-index: 3;
  color: #fff; font-family: system-ui, sans-serif; text-align: center;
  text-shadow: 0 0 14px rgba(0,0,0,.8); pointer-events: none; white-space: nowrap;
`;
document.body.appendChild(titleEl);

const altEl = document.createElement("div");
altEl.style.cssText = `
  position: fixed; left: 24px; bottom: 28px; color: #fff; z-index: 3;
  font: 13px/1.4 ui-monospace, monospace; letter-spacing: .15em;
  text-shadow: 0 0 8px #000; pointer-events: none; opacity: .85;
`;
document.body.appendChild(altEl);

// tentă de culoare a stratului atmosferic (peste imagine)
const tintEl = document.createElement("div");
tintEl.style.cssText = `
  position: fixed; inset: 0; pointer-events: none; opacity: 0; z-index: 4;
  mix-blend-mode: screen;
`;
document.body.appendChild(tintEl);

// whiteout la trecerea prin nori
const overlay = document.createElement("div");
overlay.style.cssText = `
  position: fixed; inset: 0; pointer-events: none; opacity: 0; z-index: 5;
`;
document.body.appendChild(overlay);

if (!document.getElementById("attrib")) {
  const at = document.createElement("div");
  at.id = "attrib";
  at.style.cssText = `position:fixed;right:10px;bottom:6px;color:#fff;opacity:.45;font:10px system-ui,sans-serif;pointer-events:none;`;
  at.textContent = "Imagini satelit Montréal © Esri";
  document.body.appendChild(at);
}

// --- Straturile atmosferei ---
const LAYERS = [
  {
    short: "Exosfera",
    name: "EXOSFERA",
    range: "700 – 10 000 km",
    from: 10000,
    to: 700,
    color: "#8f86ff",
    info: "Marginea atmosferei: atomi rari de hidrogen și heliu care se pierd încet în spațiu. Aici orbitează mulți sateliți.",
  },
  {
    short: "Termosfera",
    name: "TERMOSFERA",
    range: "85 – 700 km",
    from: 700,
    to: 85,
    color: "#b86bff",
    info: "Aici apar aurorele și orbitează Stația Spațială (~400 km). Gazul are peste 1 000 °C, dar e atât de rar încât ai simți frig.",
  },
  {
    short: "Mezosfera",
    name: "MEZOSFERA",
    range: "50 – 85 km",
    from: 85,
    to: 50,
    color: "#5a78ff",
    info: "Cel mai rece strat, până la −90 °C. Meteoriții se aprind aici și lasă dâre luminoase pe cer.",
  },
  {
    short: "Stratosfera",
    name: "STRATOSFERA",
    range: "12 – 50 km",
    from: 50,
    to: 12,
    color: "#2f8cff",
    info: "Conține stratul de ozon, care ne protejează de razele UV. Aerul e uscat și calm, iar cerul e albastru-închis.",
  },
  {
    short: "Troposfera",
    name: "TROPOSFERA",
    range: "0 – 12 km",
    from: 12,
    to: 0,
    color: "#a9d6ff",
    info: "Aici sunt norii, vântul și vremea, plus aproximativ 75% din masa atmosferei. Temperatura scade cu ~6,5 °C la fiecare kilometru, de la ~15 °C la sol la aproape −56 °C sus.",
  },
];
const SPACE_CARD = {
  name: "SPAȚIUL COSMIC",
  range: "peste 10 000 km",
  color: "#c3ccff",
  info: "Vid aproape perfect. De aici începe coborârea spre Pământ.",
};

const layerPanel = document.createElement("div");
layerPanel.style.cssText = `
  position: fixed; left: 26px; top: 50%; transform: translateY(-50%);
  display: none; flex-direction: column; gap: 14px; z-index: 3;
  pointer-events: none; font-family: system-ui, sans-serif; color: #fff;
  text-shadow: 0 0 8px rgba(0,0,0,.8);
`;
const gauge = document.createElement("div");
gauge.style.cssText =
  "position:relative;height:36vh;min-height:200px;width:150px;";
const rowEls = [];
for (const L of LAYERS) {
  const row = document.createElement("div");
  row.style.cssText =
    "height:20%;display:flex;align-items:center;gap:8px;opacity:.45;";
  const bar = document.createElement("div");
  bar.style.cssText = `width:12px;height:calc(100% - 3px);border-radius:3px;background:${L.color};`;
  const lab = document.createElement("span");
  lab.style.cssText =
    "font-size:10px;letter-spacing:.18em;text-transform:uppercase;";
  lab.textContent = L.short;
  row.append(bar, lab);
  gauge.appendChild(row);
  rowEls.push(row);
}
const marker = document.createElement("div");
marker.style.cssText = `
  position:absolute; left:-5px; width:22px; height:2px; top:0;
  background:#fff; box-shadow:0 0 8px #fff; transform:translateY(-1px);
`;
gauge.appendChild(marker);
const layerCard = document.createElement("div");
layerCard.style.cssText = "min-width:240px;max-width:270px;";
layerPanel.append(gauge, layerCard);
document.body.appendChild(layerPanel);

function layerIndex(km) {
  if (km >= 10000) return -1;
  for (let i = 0; i < LAYERS.length; i++) if (km >= LAYERS[i].to) return i;
  return LAYERS.length - 1;
}
function gaugeFrac(km) {
  const i = layerIndex(km);
  if (i < 0) return 0;
  const L = LAYERS[i];
  let t;
  if (i < LAYERS.length - 1) {
    t = (Math.log(L.from) - Math.log(km)) / (Math.log(L.from) - Math.log(L.to));
  } else {
    t = (L.from - km) / L.from;
  }
  return (i + clamp(t, 0, 1)) / LAYERS.length;
}

// culorile stratului: [alt km, sus RGB, jos RGB, opacitate, atmosferă RGB 0..1]
const TINT = [
  [30000, 10, 6, 30, 6, 6, 20, 0.0, 0.45, 0.5, 1.0],
  [9000, 30, 16, 80, 14, 16, 60, 0.1, 0.45, 0.45, 1.0],
  [700, 80, 36, 150, 30, 28, 110, 0.16, 0.55, 0.4, 1.0],
  [250, 90, 44, 160, 20, 110, 120, 0.2, 0.45, 0.55, 1.0],
  [85, 26, 38, 150, 48, 78, 190, 0.22, 0.3, 0.5, 1.0],
  [50, 18, 64, 196, 86, 156, 236, 0.28, 0.22, 0.55, 1.0],
  [12, 56, 128, 232, 168, 212, 255, 0.34, 0.3, 0.65, 1.0],
  [5, 150, 200, 250, 236, 246, 255, 0.42, 0.55, 0.75, 1.0],
  [0.5, 200, 225, 250, 255, 236, 214, 0.3, 0.7, 0.78, 1.0],
];
const tintOut = new Array(11);
function tintAt(alt) {
  if (alt >= TINT[0][0]) return TINT[0];
  for (let i = 0; i < TINT.length - 1; i++) {
    const A = TINT[i];
    const S = TINT[i + 1];
    if (alt >= S[0]) {
      const t =
        (Math.log(A[0]) - Math.log(alt)) / (Math.log(A[0]) - Math.log(S[0]));
      for (let k = 0; k < A.length; k++) tintOut[k] = A[k] + (S[k] - A[k]) * t;
      return tintOut;
    }
  }
  return TINT[TINT.length - 1];
}

// efecte 2D: aurore (termosferă) și meteori (mezosferă)
const fxCanvas = document.createElement("canvas");
fxCanvas.style.cssText =
  "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;";
document.body.appendChild(fxCanvas);
const fxCtx = fxCanvas.getContext("2d");
function resizeFx() {
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}
resizeFx();
const meteors = [];
let fxDirty = false;
const bump = (x, a, b, c, d) => sm(x, a, b) * (1 - sm(x, c, d));

function updateFx(altKm, dt, time) {
  const meteorAmt = bump(altKm, 40, 55, 90, 130);
  const auroraAmt = bump(altKm, 70, 110, 450, 900);
  if (meteorAmt < 0.01 && auroraAmt < 0.01 && meteors.length === 0) {
    if (fxDirty) {
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      fxDirty = false;
    }
    return;
  }
  fxDirty = true;
  const W = fxCanvas.width;
  const H = fxCanvas.height;
  fxCtx.clearRect(0, 0, W, H);
  fxCtx.globalCompositeOperation = "lighter";

  if (auroraAmt > 0.01) {
    const bands = [
      [60, 255, 160],
      [190, 80, 255],
      [60, 255, 200],
    ];
    for (let k = 0; k < bands.length; k++) {
      const [r, g, b] = bands[k];
      const base = H * (0.2 + 0.09 * k);
      for (let x = 0; x < W; x += 8) {
        const wave =
          Math.sin(x * 0.004 + time * 0.5 + k * 2) * 40 +
          Math.sin(x * 0.011 - time * 0.8 + k) * 18;
        const y0 = base + wave;
        const hgt = 90 + 60 * Math.sin(x * 0.007 + time * 0.3 + k * 1.7);
        const grad = fxCtx.createLinearGradient(0, y0 - hgt, 0, y0);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},${0.11 * auroraAmt})`);
        fxCtx.fillStyle = grad;
        fxCtx.fillRect(x, y0 - hgt, 8, hgt);
      }
    }
  }

  if (meteorAmt > 0.01 && Math.random() < meteorAmt * dt * 2.5) {
    meteors.push({
      x: Math.random() * W * 1.2,
      y: Math.random() * H * 0.5,
      vx: -(500 + Math.random() * 500),
      vy: 280 + Math.random() * 300,
      life: 0,
      max: 0.5 + Math.random() * 0.5,
      w: 1.2 + Math.random() * 1.6,
    });
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.life += dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.life > m.max) {
      meteors.splice(i, 1);
      continue;
    }
    const k = Math.sin((m.life / m.max) * Math.PI);
    const tx = m.x - m.vx * 0.09;
    const ty = m.y - m.vy * 0.09;
    const g = fxCtx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, `rgba(255,240,210,${0.9 * k})`);
    g.addColorStop(0.4, `rgba(255,150,60,${0.5 * k})`);
    g.addColorStop(1, "rgba(255,80,20,0)");
    fxCtx.strokeStyle = g;
    fxCtx.lineWidth = m.w;
    fxCtx.lineCap = "round";
    fxCtx.beginPath();
    fxCtx.moveTo(m.x, m.y);
    fxCtx.lineTo(tx, ty);
    fxCtx.stroke();
  }
  fxCtx.globalCompositeOperation = "source-over";
}

let panelShown = false;
let lastLayer = -2;
function updateLayers(altKm, dt, time) {
  const a = Math.max(altKm, 0.0015);

  // culoarea stratului (tentă peste imagine + culoarea atmosferei Pământului)
  const t = tintAt(a);
  const lowFade = sm(a, 0.15, 2.5); // jos, pe stradă, tenta dispare
  tintEl.style.background = `linear-gradient(to bottom, rgb(${t[1] | 0},${t[2] | 0},${t[3] | 0}), rgb(${t[4] | 0},${t[5] | 0},${t[6] | 0}))`;
  tintEl.style.opacity = (t[7] * lowFade).toFixed(3);
  atmoUniforms.uCol.value.set(t[8], t[9], t[10]);

  // indicatorul de straturi
  if (!panelShown) {
    layerPanel.style.display = "flex";
    panelShown = true;
  }
  marker.style.top = (gaugeFrac(a) * 100).toFixed(2) + "%";
  const idx = layerIndex(a);
  if (idx !== lastLayer) {
    lastLayer = idx;
    const L = idx < 0 ? SPACE_CARD : LAYERS[idx];
    layerCard.innerHTML = `
      <div class="lbl-t" style="font-size:20px;letter-spacing:.3em;color:${L.color}">${L.name}</div>
      <div class="lbl-s">${L.range}</div>
      <div class="lbl-s" style="font-size:12px;letter-spacing:.02em;line-height:1.55;opacity:.8">${L.info}</div>`;
    rowEls.forEach((el, i) => (el.style.opacity = i === idx ? "1" : "0.45"));
  }

  updateFx(a, dt, time);
}
function hideDescentUI() {
  layerPanel.style.display = "none";
  panelShown = false;
  lastLayer = -2;
  tintEl.style.opacity = "0";
  atmoUniforms.uCol.value.set(0.3, 0.6, 1.0);
}

let lastHudHtml = "";
function setHud(html) {
  if (html !== lastHudHtml) {
    lastHudHtml = html;
    hud.innerHTML = html;
  }
}

function updateHud(s) {
  let stage;
  if (s < 0.25) stage = "Galaxia";
  else if (s < 0.6) stage = "Brațul spiral";
  else if (s < 0.9) stage = "Sistemul Solar";
  else stage = "Soarele și Pământul";
  let hint = "";
  if (s < 0.02)
    hint = "<br><small>Dă scroll pe touchpad ca să intri în galaxie</small>";
  else if (s > 0.9)
    hint = "<br><small>Click pe Pământ ca să cobori în Montréal</small>";
  setHud(stage.toUpperCase() + hint);
}

const stages = [
  [0.02, "AMERICA DE NORD", "Continent"],
  [0.2, "CANADA", "Țară · America de Nord"],
  [0.36, "QUÉBEC", "Provincie · Canada"],
  [0.52, "MONTRÉAL", "45,50° N · 73,57° V"],
  [0.86, STREET_NAME.toUpperCase(), "Montréal, Québec, Canada"],
];
let lastStage = -2;

function fmtAlt(km) {
  if (km >= 100) return Math.round(km).toLocaleString("ro-RO") + " km";
  if (km >= 1) return km.toFixed(1).replace(".", ",") + " km";
  return Math.max(2, Math.round(km * 1000)).toLocaleString("ro-RO") + " m";
}

function updateDescentHud(d, altKm) {
  let idx = -1;
  for (let i = 0; i < stages.length; i++) if (d >= stages[i][0]) idx = i;
  if (idx !== lastStage) {
    lastStage = idx;
    titleEl.innerHTML =
      idx < 0
        ? ""
        : `<div class="lbl-t">${stages[idx][1]}</div><div class="lbl-s">${stages[idx][2]}</div>`;
  }
  altEl.textContent = "ALT " + fmtAlt(altKm);
  if (street.active) {
    setHud(
      "<small>TRAGE CU MOUSE-UL / DEGETUL CA SĂ TE UIȚI ÎN JUR · W A S D = MERGI · SHIFT = ALEARGĂ · ESC = ÎNAPOI ÎN SPAȚIU</small>",
    );
  } else {
    setHud("<small>SCROLL SUS sau ESC = ÎNAPOI ÎN SPAȚIU</small>");
  }
}

function updateOverlay(d) {
  const o = sm(d, 0.55, 0.595) * (1 - sm(d, 0.61, 0.68));
  const mix = sm(d, 0.58, 0.64);
  const c1 = [207, 230, 255];
  const c2 = [205, 224, 248];
  const c = c1.map((v, i) => Math.round(v + (c2[i] - v) * mix));
  overlay.style.opacity = o.toFixed(3);
  overlay.style.background = `radial-gradient(circle at 50% 55%, #fff 0%, rgb(${c[0]},${c[1]},${c[2]}) 45%, rgb(${c[0] - 70},${c[1] - 50},${c[2] - 20}) 100%)`;
}

// 9. Scroll, click, tastatură
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function hitEarth(e) {
  if (descent.active || zoom < 0.5) return false;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(earthHit, false).length > 0;
}

let leaveAcc = 0;
let leaveT = 0;
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (performance.now() < wheelLock) return;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33;

    if (descent.active) {
      if (e.ctrlKey) dy = -dy;
      if (street.active) {
        // pe stradă, scrollul te scoate doar dacă e lung și intenționat
        const now = performance.now();
        const up = params.invertScroll ? dy : -dy;
        leaveAcc =
          leaveAcc * Math.exp(-(now - leaveT) / 500) + (up > 0 ? up : 0);
        leaveT = now;
        if (leaveAcc > 900) {
          descent.target = 0;
          leaveAcc = 0;
        }
        return;
      }
      if (Math.abs(dy) < 4) return;
      const forward = (params.invertScroll ? -dy : dy) > 0;
      descent.target = forward ? 1 : 0;
      return;
    }

    let delta;
    if (e.ctrlKey) delta = -dy * 0.01;
    else delta = dy * params.scrollSpeed;
    if (params.invertScroll) delta = -delta;
    zoomTarget = clamp(zoomTarget + delta, 0, 1);
  },
  { passive: false },
);

let downX = 0,
  downY = 0,
  lastX = 0,
  lastY = 0,
  dragging = false;
renderer.domElement.addEventListener("pointerdown", (e) => {
  downX = lastX = e.clientX;
  downY = lastY = e.clientY;
  dragging = true;
  if (street.active) {
    try {
      renderer.domElement.setPointerCapture(e.pointerId);
    } catch (err) {
      /* nu e grav */
    }
  }
});
renderer.domElement.addEventListener("pointerup", (e) => {
  dragging = false;
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved < 5 && hitEarth(e)) {
    wheelLock = performance.now() + 700;
    startDescent();
  }
});
renderer.domElement.addEventListener("pointercancel", () => (dragging = false));
renderer.domElement.addEventListener("pointermove", (e) => {
  if (street.active && dragging) {
    // privire "Street View": tragi lumea, nu camera
    street.tYaw -= (e.clientX - lastX) * 0.0045;
    street.tPitch = clamp(
      street.tPitch + (e.clientY - lastY) * 0.0045,
      -1.35,
      1.35,
    );
  }
  lastX = e.clientX;
  lastY = e.clientY;
  renderer.domElement.style.cursor = street.active
    ? dragging
      ? "grabbing"
      : "grab"
    : hitEarth(e)
      ? "pointer"
      : "";
});

const keys = {};
window.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (e.key === "Escape" && descent.active) descent.target = 0;
  keys[e.code] = true;
  if (street.active && e.code.startsWith("Arrow")) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
window.addEventListener("blur", () => {
  for (const k in keys) keys[k] = false;
});

// 10. Coborârea spre Montréal
const earthW = new THREE.Vector3();
const solarWorld = new THREE.Vector3();
const galaxyWorld = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const offset = new THREE.Vector3();

function startDescent() {
  if (descent.active) return;
  scene.updateMatrixWorld(true);
  earthPivot.getWorldPosition(earthW);
  solarSystem.getWorldPosition(solarWorld);

  const st = {};
  st.camPos = camera.position.clone();
  st.target = controls.target.clone();
  st.earthPos = earthW.clone();
  st.startDir = camera.position.clone().sub(earthW).normalize();
  st.startDist = camera.position.distanceTo(earthW);
  st.startAlt = Math.max(
    30000,
    ((st.startDist - EARTH_RADIUS) / EARTH_RADIUS) * R_KM,
  );
  st.rot0 = THREE.MathUtils.euclideanModulo(earth.rotation.y, Math.PI * 2);
  st.cloudOff = clouds.rotation.y - earth.rotation.y;

  // rotim Pământul ca Montréalul să fie pe partea luminată de Soare
  const sunDir = solarWorld.clone().sub(earthW).normalize();
  const desired = sunDir
    .clone()
    .multiplyScalar(0.8)
    .add(st.startDir.clone().multiplyScalar(0.6))
    .normalize();
  const tiltQ = new THREE.Quaternion();
  earthTilt.getWorldQuaternion(tiltQ);
  let best = 0,
    bestDot = -2;
  for (let k = 0; k < 360; k++) {
    const a = (k / 360) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, a);
    const n = montrealLocal.clone().applyQuaternion(q).applyQuaternion(tiltQ);
    const dp = n.dot(desired);
    if (dp > bestDot) {
      bestDot = dp;
      best = a;
    }
  }
  st.rot1 =
    st.rot0 + THREE.MathUtils.euclideanModulo(best - st.rot0, Math.PI * 2);
  st.north = Y_AXIS.clone().applyQuaternion(tiltQ).normalize();

  descentState = st;
  descent.d = 0;
  descent.target = 1;
  descent.active = true;
  controls.enabled = false;
  renderer.domElement.style.cursor = "";
}

function endDescent() {
  const st = descentState;
  descent.active = false;
  descent.d = 0;
  descent.target = 0;
  street.active = false;
  controls.enabled = true;
  renderPass.scene = scene;
  camera.position.copy(st.camPos);
  controls.target.copy(st.target);
  camera.up.set(0, 1, 0);
  camera.lookAt(st.target);
  overlay.style.opacity = 0;
  titleEl.innerHTML = "";
  altEl.textContent = "";
  lastStage = -2;
  atmoUniforms.uStr.value = 1;
  hideDescentUI();
  wheelLock = performance.now() + 800;
}

// interpolare logaritmică între valori-cheie (d, valoare)
function keyed(d, keyList) {
  for (let i = 0; i < keyList.length - 1; i++) {
    const [d0, v0] = keyList[i];
    const [d1, v1] = keyList[i + 1];
    if (d <= d1) {
      const t = clamp((d - d0) / (d1 - d0), 0, 1);
      return Math.exp(lerp(Math.log(v0), Math.log(v1), t));
    }
  }
  return keyList[keyList.length - 1][1];
}

const tmpQ = new THREE.Quaternion();
const lookBase = new THREE.Vector3();
const lookPt = new THREE.Vector3();
const upV = new THREE.Vector3();

// camera în spațiu: coboară prin straturi, ținând orizontul în cadru
function updateSpaceCamera(d) {
  const st = descentState;

  // altitudinea (km) la fiecare moment: aici sunt "timpii" straturilor
  const altKm = keyed(d, [
    [0, st.startAlt],
    [0.18, 20000],
    [0.28, 9000], // exosfera
    [0.36, 700], // termosfera
    [0.43, 85], // mezosfera
    [0.49, 50], // stratosfera
    [0.55, 12], // troposfera
    [D_SWAP, 5],
  ]);
  const dist = EARTH_RADIUS * (1 + altKm / R_KM);

  const rotE = sm(d, 0, 0.28);
  earth.rotation.y = lerp(st.rot0, st.rot1, rotE);
  clouds.rotation.y = earth.rotation.y + st.cloudOff;
  earth.updateWorldMatrix(true, false);
  const nW = montrealLocal.clone().transformDirection(earth.matrixWorld);

  // direcția camerei: din direcția inițială spre normala Montréalului
  const qFull = new THREE.Quaternion().setFromUnitVectors(st.startDir, nW);
  tmpQ.identity().slerp(qFull, rotE);
  let dir = st.startDir.clone().applyQuaternion(tmpQ);

  // înclinare spre sud: păstrează curbura și orizontul în cadru. Limita e
  // unghiul real al orizontului la altitudinea respectivă.
  const T = st.north
    .clone()
    .sub(nW.clone().multiplyScalar(st.north.dot(nW)))
    .normalize();
  const horizon = Math.acos(1 / (1 + altKm / R_KM));
  const beta =
    Math.min(THREE.MathUtils.degToRad(26), horizon * 0.85) *
    sm(d, 0.2, 0.4) *
    (1 - sm(d, 0.5, D_SWAP));
  dir = dir
    .clone()
    .multiplyScalar(Math.cos(beta))
    .add(T.clone().multiplyScalar(-Math.sin(beta)))
    .normalize();

  camera.position.copy(st.earthPos).addScaledVector(dir, dist);
  lookBase.lerpVectors(st.target, st.earthPos, sm(d, 0, 0.12));
  lookPt.copy(lookBase).addScaledVector(nW, EARTH_RADIUS * sm(d, 0.3, 0.52));
  upV.lerpVectors(Y_AXIS, st.north, sm(d, 0, 0.12)).normalize();
  camera.up.copy(upV);
  camera.lookAt(lookPt);

  camera.near = clamp((dist - EARTH_RADIUS) * 0.25, 0.0003, 1);
  camera.updateProjectionMatrix();

  pin.material.opacity = 1 - sm(d, 0.2, 0.4);
  pin.scale.setScalar(0.9 + 0.25 * Math.sin(performance.now() * 0.005));
  clouds.material.opacity = 0.55 * (1 - sm(d, 0.5, 0.6) * 0.6);

  return altKm;
}

const cityCamPos = new THREE.Vector3();
const cityLook = new THREE.Vector3();
const baseDir = new THREE.Vector3();
const sDir = new THREE.Vector3();
const sPos = new THREE.Vector3();

const inIx = (x) => ixs.some((ix) => Math.abs(x - ix) < 6.5);
function walk(dx, dz) {
  let nx = street.x + dx;
  if (Math.abs(street.z) > 9.5 && !inIx(nx)) nx = street.x; // în străzile laterale nu ieși prin clădiri
  street.x = clamp(nx, -460, 460);
  const zMax = inIx(street.x) ? 66 : 9.5;
  street.z = clamp(street.z + dz, -zMax, zMax);
}

// camera în oraș: de la 5 km, prin nori, aterizează pe stradă; apoi privire liberă
function updateCityCamera(d, dt, time) {
  const u = clamp((d - D_SWAP) / (1 - D_SWAP), 0, 1);
  const e = u * u * (3 - 2 * u);
  const alt = 1.8 + 4998 * Math.pow(1 - u, 3); // încet la început (nori), lin la sol
  const back = 1000 * Math.pow(1 - u, 2.2);

  cityCamPos.set(lerp(0, 70, e), alt, back);
  cityLook.set(lerp(0, -80, e), lerp(0, 4.5, e * e), 0);

  // privirea liberă / mersul pe stradă
  if (d < 0.95) {
    street.x = 70;
    street.z = 0;
    street.yaw = street.tYaw = 0;
    street.pitch = street.tPitch = 0.018;
  }
  if (street.active) {
    const run = keys.ShiftLeft || keys.ShiftRight ? 3 : 1;
    const sp = 6 * run * dt;
    const f =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
      (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    street.tYaw += turn * 1.6 * dt;
    if (f || s) {
      const cY = Math.cos(street.yaw);
      const sY = Math.sin(street.yaw);
      walk((-cY * f + sY * s) * sp, (-sY * f - cY * s) * sp);
    }
  }
  const k = 1 - Math.exp(-dt * 10);
  street.yaw += (street.tYaw - street.yaw) * k;
  street.pitch += (street.tPitch - street.pitch) * k;
  const cP = Math.cos(street.pitch);
  sDir.set(
    -cP * Math.cos(street.yaw),
    Math.sin(street.pitch),
    -cP * Math.sin(street.yaw),
  );

  const w = sm(d, 0.9, 0.985);
  if (w > 0) {
    baseDir.copy(cityLook).sub(cityCamPos).normalize();
    sPos.set(street.x, 1.8, street.z);
    cityCamPos.lerp(sPos, w);
    baseDir.lerp(sDir, w).normalize();
    cityLook.copy(cityCamPos).addScaledVector(baseDir, 100);
  }
  cityCamPos.applyAxisAngle(Y_AXIS, GRID);
  cityLook.applyAxisAngle(Y_AXIS, GRID);

  camera.position.copy(cityCamPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(cityLook);
  camera.near = clamp(alt * 0.02, 0.1, 5);
  camera.updateProjectionMatrix();

  // atmosfera orașului: ceață, hartă, clădiri care cresc
  cityScene.fog.density = lerp(0.003, 0.00006, sm(alt, 30, 600));
  const hi = sm(alt, 250, 5000);
  skyMat.uniforms.uHigh.value = hi;
  cityScene.fog.color.setRGB(
    lerp(0.8, 0.5, hi),
    lerp(0.4, 0.58, hi),
    lerp(0.24, 0.82, hi),
  );
  const tileOp = sm(alt, 40, 350);
  for (const m of tileMats) {
    m.opacity = tileOp;
    m.visible = tileOp > 0.003;
  }
  const grow = 1 - sm(alt, 150, 900);
  cityStreet.visible = grow > 0.002;
  cityStreet.scale.y = Math.max(0.001, grow);
  sky.position.copy(camera.position);

  // norii: albi sus, roz-portocalii la apus jos; dispar lin când ești în ei
  cloudColor.setRGB(1, lerp(0.8, 1, hi), lerp(0.66, 1, hi));
  for (const c of cloudSprites) {
    const dd = camera.position.distanceTo(c.position);
    c.material.opacity = c.userData.base * sm(dd, 150, 800);
    c.material.color.copy(cloudColor);
  }

  beaconMat.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 3));

  for (const c of cars) {
    c.g.position.x += c.dir * c.speed * dt;
    if (c.g.position.x > 440) c.g.position.x = -440;
    if (c.g.position.x < -440) c.g.position.x = 440;
  }

  return alt / 1000;
}

// 11. Panoul de control
const gui = new GUI();

const trip = gui.addFolder("Călătorie");
trip
  .add(params, "zoom", 0, 1, 0.001)
  .name("Poziție zoom")
  .listen()
  .onChange((v) => {
    if (descent.active) return;
    zoomTarget = v;
    zoom = v;
  });
trip.add(params, "goGalaxy").name("→ Galaxie");
trip.add(params, "goSun").name("→ Soare + Pământ");
trip.add(params, "scrollSpeed", 0.0002, 0.003, 0.0001).name("Viteză scroll");
trip.add(params, "invertScroll").name("Inversează scroll");

const mtl = gui.addFolder("Montréal");
mtl.add(params, "goMontreal").name("↓ Coboară în Montréal");
mtl.add(params, "leaveMontreal").name("↑ Înapoi în spațiu");
mtl.add(params, "descentSeconds", 10, 90, 1).name("Durată coborâre (s)");

gui.add(params, "sunSpin", 0, 0.2, 0.001).name("Rotație Soare");
gui.add(params, "earthSpin", 0, 0.2, 0.001).name("Rotație Pământ");
gui.add(params, "orbitSpeed", 0, 0.05, 0.001).name("Viteză orbită");
gui
  .add(params, "showAxis")
  .name("Arată axa Soarelui")
  .onChange((v) => {
    sunAxis.visible = v;
  });
gui
  .add(params, "showOrbit")
  .name("Arată orbita")
  .onChange((v) => {
    orbitLine.visible = v;
  });
gui
  .add(params, "showClouds")
  .name("Nori")
  .onChange((v) => {
    clouds.visible = v;
  });

const lights = gui.addFolder("Lumini");
lights.add(sunLight, "intensity", 0, 20000).name("Intensitate Soare");
lights.addColor(sunLight, "color").name("Culoare Soare");
lights.add(ambientLight, "intensity", 0, 3).name("Lumină ambientală");
lights.addColor(ambientLight, "color").name("Culoare ambientală");

const fx = gui.addFolder("Efecte");
fx.add(bloom, "strength", 0, 3, 0.01).name("Bloom (strălucire)");
fx.add(bloom, "radius", 0, 1.5, 0.01).name("Bloom rază");
fx.add(bloom, "threshold", 0, 1.5, 0.01).name("Bloom prag");
fx.add(sunMaterial.uniforms.uBright, "value", 0.5, 4, 0.01).name(
  "Luminozitate Soare",
);
fx.add(atmoUniforms.uStr, "value", 0, 3, 0.01).name("Atmosferă Pământ");

// 12. Bucla de animație
let angle = 0;
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const time = now * 0.001;

  sunMaterial.uniforms.uTime.value = time;
  coronaMaterial.uniforms.uTime.value = time;
  sun.rotation.y += params.sunSpin;

  // progresul coborârii
  if (descent.active) {
    const step = dt / params.descentSeconds;
    if (descent.d < descent.target)
      descent.d = Math.min(descent.target, descent.d + step);
    else if (descent.d > descent.target)
      descent.d = Math.max(descent.target, descent.d - step);
    if (descent.d <= 0 && descent.target === 0) endDescent();
  }
  street.active = descent.active && descent.d >= 0.985 && descent.target === 1;

  // Pământul se rotește și orbitează doar când nu coborâm
  if (!descent.active) {
    earth.rotation.y += params.earthSpin;
    clouds.rotation.y += params.earthSpin * 1.15;
    angle += params.orbitSpeed;
    pin.material.opacity = 1;
    pin.scale.setScalar(0.9 + 0.25 * Math.sin(time * 5));
    clouds.material.opacity = 0.55;
  }
  earthPivot.position.set(
    Math.cos(angle) * ORBIT_RADIUS,
    0,
    Math.sin(angle) * ORBIT_RADIUS,
  );

  // direcția Soarelui văzută de Pământ (pentru atmosferă)
  scene.updateMatrixWorld(true);
  earthPivot.getWorldPosition(earthW);
  solarSystem.getWorldPosition(solarWorld);
  atmoUniforms.uSun.value.copy(solarWorld).sub(earthW).normalize();

  if (descent.active) {
    const d = descent.d;
    let altKm;
    if (d < D_SWAP) altKm = updateSpaceCamera(d);
    else altKm = updateCityCamera(d, dt, time);
    renderPass.scene = d >= D_SWAP ? cityScene : scene;
    updateOverlay(d);
    updateDescentHud(d, altKm);
    updateLayers(altKm, dt, time);
  } else {
    // --- zoom cosmic (explorare) ---
    zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt * 4));
    params.zoom = zoom;

    const dist = Math.exp(lerp(Math.log(DIST_FAR), Math.log(DIST_NEAR), zoom));

    galaxy.updateMatrixWorld(true);
    galaxy.getWorldPosition(galaxyWorld);
    const blend = THREE.MathUtils.smoothstep(zoom, 0.15, 0.9);
    camTarget.lerpVectors(galaxyWorld, solarWorld, blend);

    offset.copy(camera.position).sub(controls.target).setLength(dist);
    controls.target.copy(camTarget);
    camera.position.copy(camTarget).add(offset);

    camera.near = Math.max(0.1, dist * 0.01);
    camera.updateProjectionMatrix();

    galaxy.userData.core.material.opacity =
      0.8 * (1 - THREE.MathUtils.smoothstep(zoom, 0.45, 0.85));

    updateHud(zoom);
    updateFx(Infinity, dt, time); // șterge efectele rămase
    controls.update();
  }

  composer.render();
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  resizeFx();
});
