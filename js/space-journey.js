/* ========== WALK TO THE SUN — SPACE JOURNEY VISUALIZER ========== */
/* Three.js-powered vertical scroll experience                       */

(function () {
  'use strict';

  var sec = document.getElementById('sj');
  if (!sec) return;

  /* ── Feature detection ── */
  var canvas = document.createElement('canvas');
  var glTest = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!glTest || typeof THREE === 'undefined') {
    sec.classList.add('sj-fallback');
    return;
  }

  /* ── DOM refs ── */
  var sjCanvas   = document.getElementById('sjCanvas');
  var sjPhase    = document.getElementById('sjPhase');
  var sjCounter  = document.getElementById('sjCo');
  var sjNum      = document.getElementById('sjNum');
  var sjFinale   = document.getElementById('sjFinale');
  var msList     = sec.querySelectorAll('.sj-ms');

  /* ── Constants ── */
  var isMobile = window.innerWidth < 768;
  var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var frameSkip = isMobile ? 2 : 1;
  var frameCount = 0;

  /* ── Helpers ── */
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lr(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function smoothstep(a, b, t) { var x = cl((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 100e6 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(Math.floor(n));
  }

  function fmtFull(n) {
    return Math.floor(n).toLocaleString('en-US');
  }

  /* ── Three.js scene setup ── */
  var renderer = new THREE.WebGLRenderer({
    canvas: sjCanvas,
    antialias: !isMobile,
    alpha: true
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(sjCanvas.parentElement.clientWidth, sjCanvas.parentElement.clientHeight);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();

  var fov = 45;
  var aspect = sjCanvas.parentElement.clientWidth / sjCanvas.parentElement.clientHeight;
  var camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  /* ── Lighting ── */
  var sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(5, 2, 5);
  scene.add(sunLight);

  var ambientLight = new THREE.AmbientLight(0x222244, 0.3);
  scene.add(ambientLight);

  /* ── Texture loading ── */
  var textureLoader = new THREE.TextureLoader();
  var texturesLoaded = false;

  var earthDayTex = textureLoader.load(
    'textures/earth-day-' + (isMobile ? '1k' : '2k') + '.jpg',
    function () { checkTexturesLoaded(); }
  );
  if (earthDayTex.colorSpace !== undefined) earthDayTex.colorSpace = THREE.SRGBColorSpace;
  else earthDayTex.encoding = THREE.sRGBEncoding;

  var cloudTex = textureLoader.load(
    'textures/earth-clouds-' + (isMobile ? '1k' : '2k') + '.jpg',
    function () { checkTexturesLoaded(); }
  );

  var moonTex = textureLoader.load(
    'textures/moon-' + (isMobile ? '1k' : '2k') + '.jpg',
    function () { checkTexturesLoaded(); }
  );
  if (moonTex.colorSpace !== undefined) moonTex.colorSpace = THREE.SRGBColorSpace;
  else moonTex.encoding = THREE.sRGBEncoding;

  var loadedCount = 0;
  function checkTexturesLoaded() {
    loadedCount++;
    if (loadedCount >= 3) {
      texturesLoaded = true;
      sec.classList.add('sj-loaded');
    }
  }

  /* ── Earth ── */
  var earthSegments = isMobile ? 48 : 64;
  var earthGeo = new THREE.SphereGeometry(1, earthSegments, earthSegments);
  var earthMat = new THREE.MeshPhongMaterial({
    map: earthDayTex,
    shininess: 8,
    specular: new THREE.Color(0x333333)
  });
  var earth = new THREE.Mesh(earthGeo, earthMat);
  earth.rotation.x = 23.5 * Math.PI / 180;
  earth.rotation.y = -1.5; // Show Americas initially
  scene.add(earth);

  /* Cloud layer */
  var cloudMat = new THREE.MeshPhongMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.008, earthSegments, earthSegments),
    cloudMat
  );
  earth.add(clouds);

  /* Atmosphere glow — custom shader */
  var atmosVert = [
    'varying vec3 vNormal;',
    'varying vec3 vPosition;',
    'void main() {',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var atmosFrag = [
    'varying vec3 vNormal;',
    'varying vec3 vPosition;',
    'void main() {',
    '  float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);',
    '  gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 1.2;',
    '}'
  ].join('\n');

  var atmosMat = new THREE.ShaderMaterial({
    vertexShader: atmosVert,
    fragmentShader: atmosFrag,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 32, 32),
    atmosMat
  );
  earth.add(atmosphere);

  /* ── Starfield ── */
  var starCount = isMobile ? 1200 : 3000;
  var starPositions = new Float32Array(starCount * 3);
  var starSizes = new Float32Array(starCount);
  for (var i = 0; i < starCount; i++) {
    // Distribute in a sphere shell around the scene
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var r = 400 + Math.random() * 600;
    starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
    starSizes[i] = 0.5 + Math.random() * 2.0;
  }

  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

  var starVertShader = [
    'attribute float size;',
    'varying float vSize;',
    'void main() {',
    '  vSize = size;',
    '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = size * (200.0 / -mvPos.z);',
    '  gl_Position = projectionMatrix * mvPos;',
    '}'
  ].join('\n');

  var starFragShader = [
    'varying float vSize;',
    'void main() {',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  if (d > 0.5) discard;',
    '  float alpha = smoothstep(0.5, 0.1, d);',
    '  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.85);',
    '}'
  ].join('\n');

  var starMat = new THREE.ShaderMaterial({
    vertexShader: starVertShader,
    fragmentShader: starFragShader,
    transparent: true,
    depthWrite: false
  });
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ── Procedural planet shader helper ── */
  var planetVert = [
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'varying vec3 vPosition;',
    'void main() {',
    '  vUv = uv;',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  /* ── Moon — real texture ── */
  var moonGeo = new THREE.SphereGeometry(0.18, 48, 48);
  var moonMat = new THREE.MeshPhongMaterial({
    map: moonTex,
    shininess: 2,
    specular: new THREE.Color(0x111111)
  });
  var moon = new THREE.Mesh(moonGeo, moonMat);
  moon.visible = false;
  scene.add(moon);

  /* ── Venus — thick swirling atmosphere ── */
  var venusFrag = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'uniform float u_time;',
    '',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),',
    '             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  float t = u_time * 0.08;',
    '  vec2 uv = vUv * 5.0;',
    '  // Swirling cloud bands',
    '  vec2 q = vec2(fbm(uv + t * 0.3), fbm(uv + vec2(5.2, 1.3) + t * 0.2));',
    '  vec2 r = vec2(fbm(uv + q * 4.0 + vec2(1.7, 9.2) + t * 0.15),',
    '               fbm(uv + q * 4.0 + vec2(8.3, 2.8) + t * 0.1));',
    '  float f = fbm(uv + r * 2.0);',
    '  // Venus colours — golden-orange atmosphere with white highlights',
    '  vec3 deep = vec3(0.72, 0.45, 0.12);',
    '  vec3 mid = vec3(0.92, 0.75, 0.35);',
    '  vec3 bright = vec3(1.0, 0.95, 0.7);',
    '  vec3 col = mix(deep, mid, f);',
    '  col = mix(col, bright, smoothstep(0.55, 0.85, f) * 0.6);',
    '  // Banding',
    '  float bands = sin(vUv.y * 30.0 + q.x * 4.0) * 0.08;',
    '  col += bands;',
    '  // Lighting',
    '  float diffuse = max(dot(vNormal, normalize(vec3(5.0, 2.0, 5.0))), 0.0);',
    '  col *= 0.2 + diffuse * 0.8;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var venusGeo = new THREE.SphereGeometry(0.28, 48, 48);
  var venusMat = new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: venusFrag,
    transparent: true,
    uniforms: { u_time: { value: 0 } }
  });
  var venus = new THREE.Mesh(venusGeo, venusMat);
  venus.visible = false;
  scene.add(venus);

  /* ── Mars — rusty terrain with ice caps ── */
  var marsFrag = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    '',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),',
    '             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv * 7.0;',
    '  float terrain = fbm(uv);',
    '  float detail = fbm(uv * 3.0 + 5.0) * 0.3;',
    '  // Mars colours — rust red to dark brown',
    '  vec3 darkRust = vec3(0.45, 0.18, 0.08);',
    '  vec3 rust = vec3(0.75, 0.35, 0.15);',
    '  vec3 sand = vec3(0.85, 0.55, 0.3);',
    '  vec3 col = mix(darkRust, rust, terrain);',
    '  col = mix(col, sand, smoothstep(0.5, 0.8, terrain + detail) * 0.5);',
    '  // Valles Marineris-like dark canyon',
    '  float canyon = smoothstep(0.48, 0.50, vUv.y) * (1.0 - smoothstep(0.50, 0.52, vUv.y));',
    '  canyon *= fbm(uv * 0.5) * 0.3;',
    '  col -= canyon;',
    '  // Ice caps at poles',
    '  float northPole = smoothstep(0.12, 0.02, vUv.y);',
    '  float southPole = smoothstep(0.88, 0.98, vUv.y);',
    '  vec3 ice = vec3(0.92, 0.92, 0.95);',
    '  col = mix(col, ice, (northPole + southPole) * 0.8);',
    '  // Lighting',
    '  float diffuse = max(dot(vNormal, normalize(vec3(5.0, 2.0, 5.0))), 0.0);',
    '  col *= 0.12 + diffuse * 0.88;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var marsGeo = new THREE.SphereGeometry(0.22, 48, 48);
  var marsMat = new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: marsFrag,
    transparent: true
  });
  var mars = new THREE.Mesh(marsGeo, marsMat);
  mars.visible = false;
  scene.add(mars);

  /* ── Sun ── */
  var sunVertShader = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var sunFragShader = [
    'precision mediump float;',
    'uniform float u_time;',
    'uniform float u_intensity;',
    'varying vec2 vUv;',
    '',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv - 0.5;',
    '  float d = length(uv);',
    '  float t = u_time * 0.3;',
    '',
    '  // Domain-warped FBM — same lava technique as the page background',
    '  vec2 p1 = uv * 4.0;',
    '  vec2 q = vec2(fbm(p1 + t * 0.4), fbm(p1 + vec2(1.7, 9.2) + t * 0.35));',
    '  vec2 r = vec2(fbm(p1 * 1.3 + q * 5.0 + vec2(1.0, 3.0) + t * 0.2),',
    '               fbm(p1 * 1.3 + q * 5.0 + vec2(8.3, 2.8) + t * 0.25));',
    '  float f = fbm(p1 + r * 4.0);',
    '',
    '  // Second turbulence layer for extra roil',
    '  float f2 = fbm(uv * 7.0 + r * 2.0 + vec2(t * -0.3, t * 0.5));',
    '  float f3 = fbm(uv * 10.0 + q * 3.0 + t * 0.6);',
    '',
    '  // Lava surface colour — always visible, never washes to white',
    '  vec3 hotWhite = vec3(1.0, 0.95, 0.8);',
    '  vec3 hotYellow = vec3(1.0, 0.8, 0.2);',
    '  vec3 orange = vec3(1.0, 0.45, 0.0);',
    '  vec3 deepOrange = vec3(0.9, 0.25, 0.0);',
    '  vec3 darkRed = vec3(0.5, 0.08, 0.0);',
    '',
    '  // Build colour from turbulence — hot veins in dark surface',
    '  vec3 col = mix(darkRed, deepOrange, f);',
    '  col = mix(col, orange, smoothstep(0.35, 0.65, f) * 0.8);',
    '  col = mix(col, hotYellow, smoothstep(0.55, 0.8, f) * 0.6);',
    '  col = mix(col, hotWhite, smoothstep(0.75, 0.95, f) * 0.3);',
    '',
    '  // Add second turbulence as bright veins',
    '  col += orange * f2 * 0.4;',
    '  col += hotYellow * smoothstep(0.6, 0.9, f3) * 0.3;',
    '',
    '  // Bright spots — convection cells',
    '  float cells = fbm(uv * 12.0 + q * 2.0 + t * 0.4);',
    '  col += hotWhite * smoothstep(0.7, 0.95, cells) * 0.4;',
    '',
    '  // Pulsing',
    '  col *= 1.0 + sin(t * 2.0) * 0.1 + sin(t * 5.0) * 0.05;',
    '',
    '  // Edge fade — disc shape with soft corona',
    '  float disc = smoothstep(0.50, 0.35, d);',
    '  float corona = 0.06 / (d + 0.01);',
    '  corona = min(corona, 3.0);',
    '  float glow = disc + corona * 0.08;',
    '',
    '  float alpha = min(glow, 1.0) * u_intensity;',
    '  gl_FragColor = vec4(col * u_intensity, alpha);',
    '}'
  ].join('\n');

  var sunMat = new THREE.ShaderMaterial({
    vertexShader: sunVertShader,
    fragmentShader: sunFragShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      u_time: { value: 0 },
      u_intensity: { value: 0 }
    }
  });
  var sunPlane = new THREE.PlaneGeometry(20, 20);
  var sunMesh = new THREE.Mesh(sunPlane, sunMat);
  sunMesh.position.set(0, 0, -500);
  sunMesh.visible = false;
  scene.add(sunMesh);

  /* ── Scroll state ── */
  var scrollP = 0;
  var prevP = -1;
  var time = 0;

  /* ── Camera path ── */
  // Camera Z positions at key scroll points
  // Earth close-up → pull back → deep space → rush to sun
  function getCameraZ(p) {
    if (p < 0.08) return lr(3, 3, p / 0.08);
    if (p < 0.15) return lr(3, 12, ease((p - 0.08) / 0.07));
    if (p < 0.25) return lr(12, 28, ease((p - 0.15) / 0.10));
    if (p < 0.45) return lr(28, 80, ease((p - 0.25) / 0.20));
    if (p < 0.60) return lr(80, 160, ease((p - 0.45) / 0.15));
    if (p < 0.75) return lr(160, 300, ease((p - 0.60) / 0.15));
    if (p < 0.90) return lr(300, 460, ease((p - 0.75) / 0.15));
    return lr(460, 500, ease((p - 0.90) / 0.10));
  }

  /* ── Milestone phases ── */
  var phases = [
    { end: 0.08, label: 'The Neighbourhood' },
    { end: 0.15, label: 'Going Global' },
    { end: 0.25, label: 'Leaving Earth' },
    { end: 0.45, label: 'The Inner Void' },
    { end: 0.60, label: 'The Inner Planets' },
    { end: 0.75, label: 'Into the Fire' },
    { end: 0.90, label: 'Final Approach' }
  ];

  function getPhase(p) {
    if (p < 0.005 || p >= 0.90) return '';
    for (var i = 0; i < phases.length; i++) {
      if (p < phases[i].end) return phases[i].label;
    }
    return '';
  }

  /* ── Step counter (non-linear) ── */
  function getSteps(p) {
    // Power curve: early scroll covers small numbers, accelerates into billions
    return Math.floor(187e9 * Math.pow(cl(p / 0.88, 0, 1), 2.8));
  }

  /* ── Main update ── */
  function update() {
    frameCount++;
    if (frameCount % frameSkip !== 0) {
      requestAnimationFrame(update);
      return;
    }

    // Scroll progress
    var rect = sec.getBoundingClientRect();
    var scrollable = sec.offsetHeight - window.innerHeight;
    scrollP = cl(-rect.top / scrollable, 0, 1);

    // Time (for animations)
    if (!reducedMotion) time += 0.016;

    var p = scrollP;

    /* ── Camera ── */
    var camZ = getCameraZ(p);
    camera.position.z = camZ;
    camera.lookAt(0, 0, -500); // Always look toward the sun

    /* ── Shared: Sun-swallow phase ── */
    var sunZ = -500;
    var swallow = smoothstep(0.82, 0.92, p);

    /* ── Earth ── */
    // Earth stays at origin, camera moves away
    if (!reducedMotion) {
      earth.rotation.y += 0.0008;
      clouds.rotation.y += 0.0003;
    }

    // Earth fades slightly as it shrinks, then gets swallowed by Sun
    var earthFade = p < 0.60 ? 1 : 1 - smoothstep(0.60, 0.75, p);
    // Sun-swallow: Earth rushes toward Sun
    if (swallow > 0) {
      earth.position.z = lr(0, sunZ * 0.3, Math.pow(swallow, 2));
      earth.scale.setScalar(lr(1, 0.05, swallow));
      earthFade *= (1 - smoothstep(0.85, 0.92, p));
    }
    earthMat.opacity = earthFade;
    earthMat.transparent = earthFade < 1;
    earth.visible = earthFade > 0.01;

    /* ── Stars ── */
    // Stars fade in as we leave Earth, wash out near Sun
    var starOpacity = smoothstep(0.05, 0.20, p) * (1 - smoothstep(0.70, 0.92, p));
    starMat.opacity = starOpacity;
    if (!reducedMotion) {
      stars.rotation.y += 0.00005;
      stars.rotation.x += 0.00002;
    }

    /* ── Planets: ONE continuous t from 0→1 drives everything ── */
    /* Each planet: enters massive from offscreen, continuously shrinks AND    */
    /* drifts toward centre, then gets pulled into the sun. No stopping.       */

    /* Moon: enters right at p=0.20, consumed at p=0.92 */
    var moonT = cl((p - 0.20) / (0.92 - 0.20), 0, 1);
    moon.visible = moonT > 0 && moonT < 1;
    if (moon.visible) {
      var moonScale = lr(35, 0.08, Math.pow(moonT, 0.6));
      var moonX = lr(20, 0, Math.pow(moonT, 0.7));
      var moonY = lr(8, 0, Math.pow(moonT, 0.7));
      var moonZ = lr(camZ - 40, sunZ * 0.3, Math.pow(moonT, 1.5));
      if (!reducedMotion) {
        moonX += Math.sin(time * 0.4) * 0.1 * (1 - moonT);
        moonY += Math.cos(time * 0.3) * 0.08 * (1 - moonT);
      }
      moon.scale.setScalar(moonScale);
      moon.position.set(moonX, moonY, moonZ);
    }

    /* Venus: enters lower-left at p=0.42, consumed at p=0.92 */
    var venusT = cl((p - 0.42) / (0.92 - 0.42), 0, 1);
    venus.visible = venusT > 0 && venusT < 1;
    if (venus.visible) {
      var venusScale = lr(40, 0.08, Math.pow(venusT, 0.55));
      var venusX = lr(-22, 0, Math.pow(venusT, 0.7));
      var venusY = lr(-12, 0, Math.pow(venusT, 0.7));
      var venusZ = lr(camZ - 45, sunZ * 0.3, Math.pow(venusT, 1.5));
      if (!reducedMotion) {
        venusX += Math.sin(time * 0.25 + 2) * 0.1 * (1 - venusT);
        venusY += Math.cos(time * 0.35 + 1) * 0.08 * (1 - venusT);
      }
      venus.scale.setScalar(venusScale);
      venus.position.set(venusX, venusY, venusZ);
      venusMat.uniforms.u_time.value = time;
    }

    /* Mars: enters upper-right at p=0.52, consumed at p=0.92 */
    var marsT = cl((p - 0.52) / (0.92 - 0.52), 0, 1);
    mars.visible = marsT > 0 && marsT < 1;
    if (mars.visible) {
      var marsScale = lr(32, 0.08, Math.pow(marsT, 0.58));
      var marsX = lr(20, 0, Math.pow(marsT, 0.7));
      var marsY = lr(10, 0, Math.pow(marsT, 0.7));
      var marsZ = lr(camZ - 40, sunZ * 0.3, Math.pow(marsT, 1.5));
      if (!reducedMotion) {
        marsX += Math.sin(time * 0.3 + 4) * 0.1 * (1 - marsT);
        marsY += Math.cos(time * 0.2 + 3) * 0.08 * (1 - marsT);
      }
      mars.scale.setScalar(marsScale);
      mars.position.set(marsX, marsY, marsZ);
    }

    /* ── Sun ── */
    var sunAppear = smoothstep(0.35, 0.50, p);
    sunMesh.visible = sunAppear > 0;
    if (sunMesh.visible) {
      sunMat.uniforms.u_time.value = time;
      // Aggressive exponential growth — fills the screen dramatically
      var sunGrow = smoothstep(0.35, 0.95, p);
      var sunScale = lr(0.8, 200, Math.pow(sunGrow, 2.5));
      sunMesh.scale.set(sunScale, sunScale, 1);
      sunMat.uniforms.u_intensity.value = lr(0, 2.2, sunAppear);
      sunMesh.lookAt(camera.position);
    }

    /* ── Ambient colour shift toward sun ── */
    var warmth = smoothstep(0.60, 0.90, p);
    ambientLight.color.setRGB(
      lr(0.13, 0.5, warmth),
      lr(0.13, 0.25, warmth),
      lr(0.27, 0.05, warmth)
    );
    ambientLight.intensity = lr(0.3, 0.8, warmth);

    /* ── Render ── */
    renderer.render(scene, camera);

    /* ── DOM overlays ── */
    // Phase label
    var phaseText = getPhase(p);
    if (sjPhase.textContent !== phaseText) sjPhase.textContent = phaseText;
    sjPhase.classList.toggle('on', phaseText !== '');

    // Step counter — hide before finale, switch to dark mode when sun dominates
    var counterFade = 1 - smoothstep(0.86, 0.90, p);
    var showCounter = p > 0.005 && counterFade > 0;
    sjCounter.classList.toggle('on', showCounter);
    sjCounter.style.opacity = showCounter ? counterFade : 0;
    sjCounter.classList.toggle('sun-mode', p > 0.65);
    if (showCounter) {
      var steps = getSteps(p);
      sjNum.textContent = fmt(steps) + ' steps';
    }

    // Milestones — wider fade windows, peak at trigger
    for (var i = 0; i < msList.length; i++) {
      var ms = msList[i];
      var trigger = parseFloat(ms.dataset.trigger);
      var fadeW = parseFloat(ms.dataset.fade) || 0.04;
      // Asymmetric: fade in quickly, linger longer
      var fadeIn = smoothstep(trigger - fadeW * 0.5, trigger - fadeW * 0.1, p);
      var fadeOut = 1 - smoothstep(trigger + fadeW * 0.3, trigger + fadeW * 1.2, p);
      var msOpacity = fadeIn * fadeOut;
      ms.style.opacity = msOpacity;
      ms.style.transform = 'translate(-50%, -50%)';
    }

    // Finale — scroll-driven zoom that swallows the screen
    // Phase 1 (0.86-0.91): fade in at readable size
    // Phase 2 (0.91-0.99): exponential zoom — text fills and darkens the screen
    var finaleAppear = smoothstep(0.86, 0.89, p);
    var finaleZoom = smoothstep(0.91, 0.99, p);
    var finaleScale = lr(0.8, 150, Math.pow(finaleZoom, 3));
    sjFinale.style.opacity = finaleAppear;
    sjFinale.style.transform = 'translate(-50%, -50%) scale(' + finaleScale + ')';

    // Prev check (for potential optimizations later)
    prevP = p;

    requestAnimationFrame(update);
  }

  /* ── Resize handler ── */
  function onResize() {
    var parent = sjCanvas.parentElement;
    var w = parent.clientWidth;
    var h = parent.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', onResize);

  /* ── Hide existing stars canvas during space journey ── */
  var existingStars = document.getElementById('stars');
  if (existingStars) {
    var starsObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        existingStars.style.opacity = entry.isIntersecting ? '0' : '1';
        existingStars.style.transition = 'opacity 0.8s ease';
      });
    }, { threshold: 0.05 });
    starsObs.observe(sec);
  }

  /* ── Start ── */
  requestAnimationFrame(update);
})();
