// La Ducati en 3D. A partir de una sola foto: el recorte sin fondo y un mapa de
// profundidad (sacados con modelos de segmentación y de profundidad). Aquí se
// monta una malla que sigue esa profundidad y se gira con el ratón, arrastrando,
// inclinando el móvil y un poco con el scroll. Una luz de estudio resbala por el
// depósito al girar, que es lo que da la sensación de volumen.
// Con giros pequeños (±28°) una sola foto aguanta; más allá se notaría el truco.

const VERT = `attribute vec3 aPos;attribute vec2 aUv;attribute vec3 aNormal;
uniform mat4 uProy;uniform mat4 uVista;uniform mat4 uModelo;
varying vec2 vUv;varying vec3 vNormal;varying vec3 vPos;
void main(){
  vec4 p=uModelo*vec4(aPos,1.);
  vPos=p.xyz;vUv=aUv;vNormal=mat3(uModelo)*aNormal;
  gl_Position=uProy*uVista*p;
}`;

const FRAG = `precision highp float;
varying vec2 vUv;varying vec3 vNormal;varying vec3 vPos;
uniform sampler2D uColor;uniform vec3 uCamara;uniform float uBrillo;
void main(){
  vec4 t=texture2D(uColor,vUv);
  if(t.a<.04)discard;
  vec3 c=t.rgb/max(t.a,.001);
  vec3 n=normalize(vNormal);
  vec3 v=normalize(uCamara-vPos);
  // Luz de estudio: un tubo largo arriba y algo delante, como en la cabina.
  vec3 l=normalize(vec3(-.25,.9,.55));
  float dif=max(dot(n,l),0.);
  vec3 r=reflect(-v,n);
  float tubo=pow(max(dot(r,l),0.),26.)+.5*pow(max(dot(r,normalize(vec3(.6,.7,.4))),0.),40.);
  float lum=dot(c,vec3(.299,.587,.114));
  float metal=smoothstep(.28,.75,lum);
  c*=.86+.22*dif;
  c+=vec3(.92,.94,1.)*tubo*(.12+.55*metal)*uBrillo;
  // Borde azulado por detrás, la luz de la casa.
  float borde=pow(1.-max(dot(n,v),0.),3.);
  c+=vec3(.25,.27,.9)*borde*.18;
  gl_FragColor=vec4(c*t.a,t.a);
}`;

type M4 = Float32Array;
const perspectiva = (fov: number, asp: number, cerca: number, lejos: number): M4 => {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (cerca - lejos);
  return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (lejos + cerca) * nf, -1, 0, 0, 2 * lejos * cerca * nf, 0]);
};
const traslacion = (x: number, y: number, z: number): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
function rotacion(yaw: number, pitch: number): M4 {
  const [cy, sy, cx, sx] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  // Ry * Rx, en columnas.
  return new Float32Array([cy, 0, -sy, 0, sy * sx, cx, cy * sx, 0, sy * cx, -sx, cy * cx, 0, 0, 0, 0, 1]);
}

function cargar(src: string) {
  return new Promise<HTMLImageElement>((ok, mal) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => ok(im);
    im.onerror = mal;
    im.src = src;
  });
}

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string) {
  const s = gl.createShader(tipo)!;
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

/** Monta la moto en el lienzo. Devuelve false si no hay WebGL (se queda la foto). */
export async function iniciarMoto(escena: HTMLElement, lienzo: HTMLCanvasElement, rutas: { color: string; profundidad: string }) {
  const gl = lienzo.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return false;
  const vs = compilar(gl, gl.VERTEX_SHADER, VERT);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

  let color: HTMLImageElement;
  let prof: HTMLImageElement;
  try {
    [color, prof] = await Promise.all([cargar(rutas.color), cargar(rutas.profundidad)]);
  } catch {
    return false;
  }

  // Profundidad leída en el navegador y horneada en la malla (así no hace falta
  // leer texturas en el vertex shader, que algunos móviles no permiten).
  const c2 = document.createElement('canvas');
  c2.width = prof.naturalWidth;
  c2.height = prof.naturalHeight;
  const x2 = c2.getContext('2d', { willReadFrequently: true })!;
  x2.drawImage(prof, 0, 0);
  const datos = x2.getImageData(0, 0, c2.width, c2.height).data;
  const muestra = (u: number, v: number) => {
    const x = Math.min(c2.width - 1, Math.max(0, Math.round(u * (c2.width - 1))));
    const y = Math.min(c2.height - 1, Math.max(0, Math.round(v * (c2.height - 1))));
    return datos[(y * c2.width + x) * 4] / 255;
  };

  const asp = color.naturalWidth / color.naturalHeight;
  const NX = 200;
  const NY = Math.round(NX / asp);
  const RELIEVE = 0.95;
  const pos = new Float32Array((NX + 1) * (NY + 1) * 3);
  const uv = new Float32Array((NX + 1) * (NY + 1) * 2);
  const nor = new Float32Array((NX + 1) * (NY + 1) * 3);
  const z = (i: number, j: number) => (muestra(i / NX, j / NY) - 0.55) * RELIEVE;
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i;
      const u = i / NX;
      const v = j / NY;
      pos.set([(u * 2 - 1) * asp, 1 - v * 2, z(i, j)], k * 3);
      uv.set([u, v], k * 2);
      const dx = (z(Math.min(NX, i + 1), j) - z(Math.max(0, i - 1), j)) / ((4 * asp) / NX);
      const dy = (z(i, Math.max(0, j - 1)) - z(i, Math.min(NY, j + 1))) / (4 / NY);
      const l = Math.hypot(dx, dy, 1);
      nor.set([-dx / l, -dy / l, 1 / l], k * 3);
    }
  }
  const idx = new Uint16Array(NX * NY * 6);
  let p = 0;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i;
      const b = a + 1;
      const c = a + NX + 1;
      const d = c + 1;
      idx.set([a, c, b, b, c, d], p);
      p += 6;
    }
  }
  const atributo = (nombre: string, datos: Float32Array, n: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, nombre);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  };
  gl.useProgram(prog);
  atributo('aPos', pos, 3);
  atributo('aUv', uv, 2);
  atributo('aNormal', nor, 3);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, color);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = {
    proy: gl.getUniformLocation(prog, 'uProy'),
    vista: gl.getUniformLocation(prog, 'uVista'),
    modelo: gl.getUniformLocation(prog, 'uModelo'),
    camara: gl.getUniformLocation(prog, 'uCamara'),
    brillo: gl.getUniformLocation(prog, 'uBrillo'),
  };
  gl.uniform1i(gl.getUniformLocation(prog, 'uColor'), 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOV = (26 * Math.PI) / 180;
  const LIMITE = 0.5;

  function medir() {
    const caja = lienzo.getBoundingClientRect();
    const s = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.max(1, Math.round(caja.width * s));
    lienzo.height = Math.max(1, Math.round(caja.height * s));
    gl!.viewport(0, 0, lienzo.width, lienzo.height);
  }

  // Estado del giro: lo que pide cada fuente y lo que se ve (suavizado).
  const giro = { arrastre: 0, raton: 0, inclinacion: 0, alto: 0, scroll: 0, yaw: -0.55, pitch: 0 };
  let arrastrando: { x: number; base: number } | null = null;
  escena.addEventListener('pointerdown', (e) => {
    arrastrando = { x: e.clientX, base: giro.arrastre };
    escena.classList.add('girando');
  });
  window.addEventListener('pointermove', (e) => {
    if (arrastrando) {
      giro.arrastre = Math.max(-LIMITE, Math.min(LIMITE, arrastrando.base + ((e.clientX - arrastrando.x) / escena.clientWidth) * 1.6));
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const caja = escena.getBoundingClientRect();
    if (e.clientY < caja.top || e.clientY > caja.bottom) return;
    giro.raton = ((e.clientX - caja.left) / caja.width - 0.5) * 0.7;
    giro.alto = ((e.clientY - caja.top) / caja.height - 0.5) * 0.12;
  });
  const soltar = () => {
    arrastrando = null;
    escena.classList.remove('girando');
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  // Inclinar el móvil (Android lo da sin pedir permiso; en iPhone se gira arrastrando).
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    giro.inclinacion = Math.max(-1, Math.min(1, e.gamma / 35)) * 0.4;
  });

  let visible = false;
  let entrada = -1;
  let marco = 0;
  const inicio = performance.now();
  function pintar(ahora: number) {
    marco = 0;
    if (!visible || document.hidden) return;
    const t = (ahora - inicio) / 1000;
    const caja = escena.getBoundingClientRect();
    giro.scroll = ((caja.top + caja.height / 2) / window.innerHeight - 0.5) * -0.5;
    if (entrada < 0) entrada = t;
    const intro = reducir ? 1 : Math.min(1, (t - entrada) / 1.8);
    const facil = 1 - Math.pow(1 - intro, 3);
    const vaiven = reducir ? 0 : Math.sin(t * 0.45) * 0.12;
    let objetivo = giro.arrastre + giro.raton + giro.inclinacion + giro.scroll + vaiven - 0.12;
    objetivo = Math.max(-LIMITE, Math.min(LIMITE, objetivo));
    const yaw = -0.55 * (1 - facil) + objetivo * facil;
    giro.yaw += (yaw - giro.yaw) * (intro < 1 ? 0.25 : 0.08);
    giro.pitch += (0.06 + giro.alto - giro.pitch) * 0.08;

    const w = lienzo.width;
    const h = lienzo.height;
    const ancho = w / h;
    // Encuadre: la moto ocupa ~82 % del alto (o del ancho en pantallas estrechas),
    // desplazada a la derecha si hay sitio para el texto a la izquierda.
    const conTexto = ancho > 1.3;
    const ocupa = Math.min(conTexto ? 0.72 : 0.8, ((conTexto ? 0.6 : 0.92) * ancho) / asp);
    const dist = 1 / Math.tan(FOV / 2) / ocupa;
    // Con texto a la izquierda, la moto se pega a la derecha dejando un 4 % de margen.
    const fraccion = (asp * ocupa) / ancho;
    const centro = conTexto ? 1 - 0.04 - fraccion / 2 : 0.5;
    const lado = ((centro * 2 - 1) * ancho) / ocupa;
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.uniformMatrix4fv(u.proy, false, perspectiva(FOV, ancho, 0.1, 50));
    gl!.uniformMatrix4fv(u.vista, false, traslacion(lado, 0.02, -dist));
    gl!.uniformMatrix4fv(u.modelo, false, rotacion(giro.yaw, giro.pitch));
    gl!.uniform3f(u.camara, -lado, -0.02, dist);
    gl!.uniform1f(u.brillo, 1);
    gl!.drawElements(gl!.TRIANGLES, idx.length, gl!.UNSIGNED_SHORT, 0);
    escena.style.setProperty('--giro', giro.yaw.toFixed(3));
    escena.style.setProperty('--sx', `${(centro * 100).toFixed(1)}%`);
    escena.style.setProperty('--sb', `${((0.5 - ocupa / 2) * 100 + 1).toFixed(1)}%`);
    escena.style.setProperty('--sw', `${(fraccion * 88).toFixed(1)}%`);
    marco = requestAnimationFrame(pintar);
  }
  const arrancar = () => {
    if (!marco && visible && !document.hidden) marco = requestAnimationFrame(pintar);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    arrancar();
  }).observe(escena);
  document.addEventListener('visibilitychange', arrancar);
  new ResizeObserver(() => {
    medir();
    arrancar();
  }).observe(lienzo);
  medir();
  escena.classList.add('en-3d');
  arrancar();
  return true;
}
