(function () {
  'use strict';

  var canvas, gl, program, posBuffer;
  var startTime = Date.now();
  var skyProgress = 0;
  var sjOffsetTop = 0;
  var raf;
  var isMobile = window.innerWidth < 768;
  var frameCount = 0;

  // Expose skyProgress globally for sky-elements.js and main.js
  window.__skyProgress = 0;

  var vertSrc = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  var fragSrc = [
    'precision mediump float;',
    'uniform float u_time;',
    'uniform float u_scroll;',
    'uniform vec2 u_res;',

    // Noise functions
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',

    // FBM — 5 octaves (balance of quality and perf)
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',

    'float smoothstep2(float a, float b, float x) {',
    '  float t = clamp((x - a) / (b - a), 0.0, 1.0);',
    '  return t * t * (3.0 - 2.0 * t);',
    '}',

    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float t = u_time * 0.15;',
    '  float s = u_scroll;',

    // Sun position: rises from bottom-center, arcs up, then sets
    '  float sunX = 0.5 + sin(s * 3.14159) * 0.15;',
    '  float sunY = s < 0.35 ? mix(0.08, 0.7, s / 0.35)',
    '             : s < 0.55 ? mix(0.7, 0.35, (s - 0.35) / 0.2)',
    '             : mix(0.35, -0.1, (s - 0.55) / 0.25);',
    '  vec2 sunPos = vec2(sunX, sunY);',

    // Distance from sun for glow effects
    '  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);',
    '  float sunDist = length((uv - sunPos) * aspect);',

    // === SKY GRADIENT ===
    // Vertical position factor
    '  float y = uv.y;',

    // Phase colours — each phase defined by top, mid, horizon
    // Pre-dawn / First Light (s = 0.0)
    '  vec3 dawn_top = vec3(0.01, 0.01, 0.015);',      // true black
    '  vec3 dawn_mid = vec3(0.04, 0.03, 0.01);',      // barely-there ember
    '  vec3 dawn_hor = vec3(0.95, 0.75, 0.20);',      // sunrise yellow

    // Blue sky (s = 0.25)
    '  vec3 blue_top = vec3(0.16, 0.52, 0.82);',      // cerulean
    '  vec3 blue_mid = vec3(0.42, 0.72, 0.92);',      // powder blue
    '  vec3 blue_hor = vec3(0.72, 0.88, 0.96);',      // pale blue

    // Sunset (s = 0.50)
    '  vec3 set_top = vec3(0.22, 0.10, 0.30);',       // deep purple
    '  vec3 set_mid = vec3(0.83, 0.35, 0.18);',       // sienna
    '  vec3 set_hor = vec3(0.96, 0.62, 0.18);',       // amber

    // Twilight (s = 0.70)
    '  vec3 twi_top = vec3(0.06, 0.04, 0.14);',       // near black
    '  vec3 twi_mid = vec3(0.11, 0.065, 0.20);',      // dark indigo
    '  vec3 twi_hor = vec3(0.20, 0.10, 0.28);',       // muted purple

    // Night (s = 0.85+)
    '  vec3 ngt = vec3(0.02, 0.02, 0.027);',          // #050507

    // Blend between phases based on scroll
    '  float p1 = smoothstep2(0.0, 0.20, s);',  // dawn → blue
    '  float p2 = smoothstep2(0.20, 0.45, s);', // blue → sunset
    '  float p3 = smoothstep2(0.45, 0.65, s);', // sunset → twilight
    '  float p4 = smoothstep2(0.65, 0.85, s);', // twilight → night

    '  vec3 sky_top = dawn_top;',
    '  sky_top = mix(sky_top, blue_top, p1);',
    '  sky_top = mix(sky_top, set_top, p2);',
    '  sky_top = mix(sky_top, twi_top, p3);',
    '  sky_top = mix(sky_top, ngt, p4);',

    '  vec3 sky_mid = dawn_mid;',
    '  sky_mid = mix(sky_mid, blue_mid, p1);',
    '  sky_mid = mix(sky_mid, set_mid, p2);',
    '  sky_mid = mix(sky_mid, twi_mid, p3);',
    '  sky_mid = mix(sky_mid, ngt, p4);',

    '  vec3 sky_hor = dawn_hor;',
    '  sky_hor = mix(sky_hor, blue_hor, p1);',
    '  sky_hor = mix(sky_hor, set_hor, p2);',
    '  sky_hor = mix(sky_hor, twi_hor, p3);',
    '  sky_hor = mix(sky_hor, ngt, p4);',

    // Compose vertical gradient: top → mid → horizon
    '  vec3 sky = mix(sky_hor, sky_mid, smoothstep2(0.0, 0.45, y));',
    '  sky = mix(sky, sky_top, smoothstep2(0.45, 1.0, y));',

    // === ATMOSPHERIC NOISE ===
    // Adds subtle texture to prevent flat gradients
    '  float atm = fbm(uv * 3.0 + t * 0.3) * 0.08;',
    '  float dawnFade = smoothstep2(0.0, 0.15, s);',  // suppress noise during dawn
    '  sky += atm * (1.0 - p4) * mix(0.15, 1.0, dawnFade);',

    // === SUN GLOW ===
    '  float sunVis = 1.0 - smoothstep2(0.55, 0.75, s);', // sun invisible after twilight
    '  float glow1 = 0.20 / (sunDist + 0.18);',   // wide soft glow
    '  float glow2 = 0.04 / (sunDist + 0.03);',   // tight bright core

    // Sun colour shifts from warm gold → orange → red as it sets
    '  vec3 sunCol = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.4, 0.15), smoothstep2(0.2, 0.55, s));',
    '  float glowMask = (1.0 - smoothstep2(0.0, 0.5, y)) * mix(0.4, 1.0, dawnFade);',
    '  sky += sunCol * (glow1 + glow2) * sunVis * 0.35 * glowMask;',

    // === GOD RAYS ===
    // Radial rays from sun position using angular noise
    '  vec2 toSun = (uv - sunPos) * aspect;',
    '  float angle = atan(toSun.y, toSun.x);',
    '  float rayNoise = fbm(vec2(angle * 4.0, sunDist * 2.0 + t * 0.4));',
    '  float rays = rayNoise * 0.5;',
    '  rays *= smoothstep2(0.0, 0.05, sunDist);',  // no rays at sun center
    '  rays *= 1.0 - smoothstep2(0.3, 1.2, sunDist);',  // fade with distance
    '  rays *= sunVis;',

    // Ray colour — warm, desaturates with distance from sun
    '  vec3 rayCol = mix(sunCol, vec3(1.0, 0.95, 0.85), 0.5);',
    '  sky += rayCol * rays * 0.18 * glowMask;',

    // === TWILIGHT STARS ===
    // Simple shader stars that emerge during twilight
    '  float starField = 0.0;',
    '  float starVis = smoothstep2(0.5, 0.75, s);',
    '  if (starVis > 0.01) {',
    '    vec2 starUV = uv * 80.0;',
    '    vec2 cell = floor(starUV);',
    '    float starRand = hash(cell);',
    '    if (starRand > 0.96) {',
    '      vec2 starCenter = cell + 0.5;',
    '      float d = length(starUV - starCenter);',
    '      float twinkle = sin(u_time * (2.0 + starRand * 4.0) + starRand * 50.0) * 0.3 + 0.7;',
    '      starField += (1.0 - smoothstep2(0.0, 0.18, d)) * twinkle * (starRand - 0.96) * 25.0;',
    '    }',
    '    sky += vec3(0.93, 0.92, 0.89) * starField * starVis * 0.6;',
    '  }',

    // === DITHERING ===
    // Prevent banding on gradients
    '  sky += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;',

    '  gl_FragColor = vec4(sky, 1.0);',
    '}'
  ].join('\n');


  // === CSS VARIABLE ADAPTATION ===
  function updateCSSVars(progress) {
    var s = progress;

    // Smoothstep helper
    function ss(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // Transition zone: 0.38 (fully light) → 0.55 (fully dark)
    var t = ss(0.38, 0.55, s);
    var r = document.documentElement.style;

    // Text colours
    var textR = Math.round(lerp(26, 238, t));
    var textG = Math.round(lerp(26, 234, t));
    var textB = Math.round(lerp(26, 227, t));
    r.setProperty('--text', 'rgb(' + textR + ',' + textG + ',' + textB + ')');

    var midR = Math.round(lerp(74, 163, t));
    var midG = Math.round(lerp(74, 158, t));
    var midB = Math.round(lerp(74, 148, t));
    r.setProperty('--text-mid', 'rgb(' + midR + ',' + midG + ',' + midB + ')');

    var dimR = Math.round(lerp(90, 92, t));
    var dimG = Math.round(lerp(85, 88, t));
    var dimB = Math.round(lerp(78, 82, t));
    r.setProperty('--text-dim', 'rgb(' + dimR + ',' + dimG + ',' + dimB + ')');

    // Surface alpha (card backgrounds) — very opaque in light mode for readability
    var surfA = lerp(0.88, 0.65, t);
    var surfR2 = Math.round(lerp(245, 5, t));
    var surfG2 = Math.round(lerp(243, 5, t));
    var surfB2 = Math.round(lerp(240, 7, t));
    r.setProperty('--surface-alpha', 'rgba(' + surfR2 + ',' + surfG2 + ',' + surfB2 + ',' + surfA + ')');

    // Nav background
    var navR = Math.round(lerp(245, 5, t));
    var navG = Math.round(lerp(240, 5, t));
    var navB = Math.round(lerp(235, 7, t));
    r.setProperty('--nav-bg', 'rgba(' + navR + ',' + navG + ',' + navB + ',0.92)');
    r.setProperty('--nav-bg-clear', 'rgba(' + navR + ',' + navG + ',' + navB + ',0)');

    // Border
    var borderA = lerp(0.10, 0.06, t);
    var borderC = Math.round(lerp(0, 255, t));
    r.setProperty('--border', 'rgba(' + borderC + ',' + borderC + ',' + borderC + ',' + borderA + ')');

    // Input background
    var inpA = lerp(0.05, 0.02, t);
    var inpC = Math.round(lerp(0, 255, t));
    r.setProperty('--input-bg', 'rgba(' + inpC + ',' + inpC + ',' + inpC + ',' + inpA + ')');

    // Background colour (body)
    var bgR = Math.round(lerp(220, 5, t));
    var bgG = Math.round(lerp(215, 5, t));
    var bgB = Math.round(lerp(210, 7, t));
    r.setProperty('--bg', 'rgb(' + bgR + ',' + bgG + ',' + bgB + ')');

    // Nav CTA
    var ctaBgA = lerp(0.08, 0.06, t);
    var ctaBorderA = lerp(0.12, 0.08, t);
    var ctaC = Math.round(lerp(0, 255, t));
    r.setProperty('--nav-cta-bg', 'rgba(' + ctaC + ',' + ctaC + ',' + ctaC + ',' + ctaBgA + ')');
    r.setProperty('--nav-cta-border', 'rgba(' + ctaC + ',' + ctaC + ',' + ctaC + ',' + ctaBorderA + ')');

    // Text shadow during transition zone for contrast safety
    var transZone = Math.max(0, 1 - Math.abs(s - 0.46) / 0.12);
    if (transZone > 0.01) {
      r.setProperty('--text-shadow', '0 1px 8px rgba(0,0,0,' + (transZone * 0.3) + ')');
    } else {
      r.setProperty('--text-shadow', 'none');
    }

    // Star field canvas opacity
    var starCanvas = document.getElementById('stars');
    if (starCanvas) {
      starCanvas.style.opacity = ss(0.50, 0.80, s);
    }
  }


  // === WEBGL SETUP ===
  try {
    canvas = document.createElement('canvas');
    canvas.id = 'skyCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none';
    document.body.prepend(canvas);

    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('No WebGL');

    function compileShader(src, type) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }

    program = gl.createProgram();
    gl.attachShader(program, compileShader(vertSrc, gl.VERTEX_SHADER));
    gl.attachShader(program, compileShader(fragSrc, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(program, 'u_time');
    var uScroll = gl.getUniformLocation(program, 'u_scroll');
    var uRes = gl.getUniformLocation(program, 'u_res');

    function resize() {
      var dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      isMobile = window.innerWidth < 768;
    }
    resize();
    window.addEventListener('resize', resize);

    function calcSkyProgress() {
      // Recalculate sjOffsetTop each time in case of layout shifts
      var sj = document.getElementById('sj');
      if (sj) sjOffsetTop = sj.offsetTop;
      if (sjOffsetTop <= 0) sjOffsetTop = document.body.scrollHeight * 0.65;

      var raw = (window.scrollY || window.pageYOffset) / sjOffsetTop;
      skyProgress = Math.max(0, Math.min(1, raw));
      window.__skyProgress = skyProgress;
    }

    window.addEventListener('scroll', calcSkyProgress, { passive: true });
    calcSkyProgress();

    // Throttle CSS updates to avoid thrashing
    var lastCSSUpdate = 0;

    function render() {
      raf = requestAnimationFrame(render);
      if (isMobile) { frameCount++; if (frameCount % 2 !== 0) return; }

      calcSkyProgress();

      // Fade canvas out as we approach night
      var fadeStart = 0.80;
      var fadeEnd = 0.95;
      var opacity = skyProgress <= fadeStart ? 1 : skyProgress >= fadeEnd ? 0 : 1 - (skyProgress - fadeStart) / (fadeEnd - fadeStart);
      canvas.style.opacity = opacity;

      // Update CSS vars at ~20fps max
      var now = Date.now();
      if (now - lastCSSUpdate > 50) {
        updateCSSVars(skyProgress);
        lastCSSUpdate = now;
      }

      if (opacity <= 0) return;

      gl.uniform1f(uTime, (now - startTime) / 1000);
      gl.uniform1f(uScroll, skyProgress);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    render();

  } catch (e) {
    console.log('Sky: WebGL not available, using fallback');
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    var fb = document.createElement('div');
    fb.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;' +
      'background:linear-gradient(to top,' +
      '#f2bf33 0%,' +
      '#261405 40%,' +
      '#050507 100%)';
    document.body.prepend(fb);

    // Still update CSS vars on scroll even without WebGL
    function fbScroll() {
      var sj = document.getElementById('sj');
      var off = sj ? sj.offsetTop : document.body.scrollHeight * 0.65;
      skyProgress = Math.max(0, Math.min(1, window.scrollY / off));
      window.__skyProgress = skyProgress;
      updateCSSVars(skyProgress);
    }
    window.addEventListener('scroll', fbScroll, { passive: true });
    fbScroll();
  }
})();
