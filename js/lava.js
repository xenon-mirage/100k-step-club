(function () {
  'use strict';
  var canvas, gl, program, posBuffer;
  var startTime = Date.now();
  var scrollProgress = 0;
  var raf;
  var isMobile = window.innerWidth < 768;
  var frameCount = 0;

  var vertSrc = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  var fragSrc = [
    'precision mediump float;',
    'uniform float u_time;',
    'uniform float u_scroll;',
    'uniform vec2 u_res;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float t = u_time * 0.15;',
    '  vec2 q = vec2(fbm(uv * 2.0 + t * 0.3), fbm(uv * 2.0 + vec2(1.7, 9.2) + t * 0.2));',
    '  vec2 r = vec2(fbm(uv * 2.5 + q * 4.0 + vec2(1.0, 3.0) + t * 0.1), fbm(uv * 2.5 + q * 4.0 + vec2(8.3, 2.8) + t * 0.15));',
    '  float f = fbm(uv * 1.5 + r * 2.0);',
    '  float blobs = 0.0;',
    '  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);',
    '  vec2 b1 = vec2(0.3 + sin(t * 0.7) * 0.2, 0.4 + cos(t * 0.5) * 0.2 - u_scroll * 0.3);',
    '  vec2 b2 = vec2(0.7 + cos(t * 0.6) * 0.2, 0.6 + sin(t * 0.8) * 0.2 - u_scroll * 0.2);',
    '  vec2 b3 = vec2(0.5 + sin(t * 0.4 + 2.0) * 0.3, 0.3 + cos(t * 0.3) * 0.3 - u_scroll * 0.4);',
    '  vec2 b4 = vec2(0.2 + cos(t * 0.5 + 1.0) * 0.15, 0.7 + sin(t * 0.6 + 3.0) * 0.15 - u_scroll * 0.15);',
    '  vec2 b5 = vec2(0.8 + sin(t * 0.3 + 4.0) * 0.15, 0.2 + cos(t * 0.7 + 2.0) * 0.2 - u_scroll * 0.35);',
    '  blobs += 0.08 / (length((uv - b1) * aspect) + 0.01);',
    '  blobs += 0.06 / (length((uv - b2) * aspect) + 0.01);',
    '  blobs += 0.07 / (length((uv - b3) * aspect) + 0.01);',
    '  blobs += 0.04 / (length((uv - b4) * aspect) + 0.01);',
    '  blobs += 0.05 / (length((uv - b5) * aspect) + 0.01);',
    '  float intensity = f * 0.6 + blobs * 0.06;',
    '  vec3 c1 = vec3(0.02, 0.02, 0.03);',
    '  vec3 c2 = vec3(0.35, 0.12, 0.02);',
    '  vec3 c3 = vec3(1.0, 0.42, 0.0);',
    '  vec3 c4 = vec3(0.98, 0.75, 0.14);',
    '  vec3 col = c1;',
    '  col = mix(col, c2, smoothstep(0.2, 0.5, intensity));',
    '  col = mix(col, c3, smoothstep(0.45, 0.7, intensity));',
    '  col = mix(col, c4, smoothstep(0.7, 0.95, intensity));',
    '  float vignette = 1.0 - length((uv - 0.5) * 1.4);',
    '  vignette = smoothstep(0.0, 0.7, vignette);',
    '  col *= vignette * 0.85 + 0.15;',
    '  col *= mix(0.7, 0.3, u_scroll);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  try {
    canvas = document.createElement('canvas');
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
      var dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      isMobile = window.innerWidth < 768;
    }
    resize();
    window.addEventListener('resize', resize);

    function onScroll() {
      scrollProgress = Math.min((window.scrollY || window.pageYOffset) / (Math.max(1, document.body.scrollHeight - window.innerHeight)), 1);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function render() {
      raf = requestAnimationFrame(render);
      if (isMobile) { frameCount++; if (frameCount % 2 !== 0) return; }

      // Fade out lava as user scrolls down — stars take over
      var fadeStart = 0.35;
      var fadeEnd = 0.7;
      var opacity = scrollProgress <= fadeStart ? 1 : scrollProgress >= fadeEnd ? 0 : 1 - (scrollProgress - fadeStart) / (fadeEnd - fadeStart);
      canvas.style.opacity = opacity;

      // Skip rendering when fully transparent
      if (opacity <= 0) return;

      gl.uniform1f(uTime, (Date.now() - startTime) / 1000);
      gl.uniform1f(uScroll, scrollProgress);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    render();
  } catch (e) {
    console.log('Lava: WebGL not available');
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    var fb = document.createElement('div');
    fb.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 30% 50%,rgba(255,107,0,.15) 0%,transparent 60%),radial-gradient(ellipse at 70% 40%,rgba(232,93,4,.12) 0%,transparent 50%),#050507';
    document.body.prepend(fb);
  }
})();
