// La Ducati, de estudio. Con una sola foto no existe la otra cara de la moto, así
// que no se deforma ni se gira de verdad (eso estiraba los píxeles). Lo que se
// mueve es la luz: con el mapa de profundidad se sacan las normales de cada punto
// y un foco de estudio recorre el depósito, las llantas y el guardabarros al mover
// el ratón, arrastrar, inclinar el móvil o hacer scroll. La moto solo se inclina
// unos grados de una pieza, sin estirarse, y siempre se ve nítida.

const VERT = `attribute vec2 aPos;attribute vec2 aUv;
uniform mat4 uProy;uniform mat4 uVista;uniform mat4 uModelo;uniform float uAsp;
varying vec2 vUv;
void main(){
  vUv=aUv;
  gl_Position=uProy*uVista*uModelo*vec4(aPos.x*uAsp,aPos.y,0.,1.);
}`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uColor;uniform sampler2D uProf;
uniform vec2 uPaso;uniform vec3 uLuz;uniform float uFuerza;
void main(){
  vec4 t=texture2D(uColor,vUv);
  if(t.a<.02)discard;
  vec3 c=t.rgb/max(t.a,.001);
  // Normal a partir de la profundidad (blanco = cerca).
  float dx=texture2D(uProf,vUv+vec2(uPaso.x,0.)).r-texture2D(uProf,vUv-vec2(uPaso.x,0.)).r;
  float dy=texture2D(uProf,vUv-vec2(0.,uPaso.y)).r-texture2D(uProf,vUv+vec2(0.,uPaso.y)).r;
  vec3 n=normalize(vec3(-dx*uFuerza,-dy*uFuerza,1.));
  vec3 l=normalize(uLuz);
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  float lum=dot(c,vec3(.299,.587,.114));
  float metal=smoothstep(.25,.72,lum);
  float dif=max(dot(n,l),0.);
  float foco=pow(max(dot(r,l),0.),28.);
  float halo=pow(max(dot(r,l),0.),6.);
  c*=.7+.46*dif;
  c+=vec3(.93,.95,1.)*(foco*(.26+.95*metal)+halo*.1*metal);
  // Luz azulada de la casa en los bordes que miran hacia fuera.
  c+=vec3(.25,.28,.95)*pow(1.-n.z,1.5)*.25*(1.-dif);
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

function textura(gl: WebGLRenderingContext, unidad: number, imagen: HTMLImageElement, formato: number, premultiplicar: boolean) {
  gl.activeTexture(gl.TEXTURE0 + unidad);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplicar);
  gl.texImage2D(gl.TEXTURE_2D, 0, formato, formato, gl.UNSIGNED_BYTE, imagen);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
  gl.useProgram(prog);

  let color: HTMLImageElement;
  let prof: HTMLImageElement;
  try {
    [color, prof] = await Promise.all([cargar(rutas.color), cargar(rutas.profundidad)]);
  } catch {
    return false;
  }
  const asp = color.naturalWidth / color.naturalHeight;

  // Un rectángulo plano con la foto: nada se estira.
  const atributo = (nombre: string, datos: number[]) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datos), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, nombre);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };
  atributo('aPos', [-1, -1, 1, -1, -1, 1, 1, 1]);
  atributo('aUv', [0, 1, 1, 1, 0, 0, 1, 0]);
  textura(gl, 0, color, gl.RGBA, true);
  textura(gl, 1, prof, gl.LUMINANCE, false);

  const u = {
    proy: gl.getUniformLocation(prog, 'uProy'),
    vista: gl.getUniformLocation(prog, 'uVista'),
    modelo: gl.getUniformLocation(prog, 'uModelo'),
    luz: gl.getUniformLocation(prog, 'uLuz'),
  };
  gl.uniform1i(gl.getUniformLocation(prog, 'uColor'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'uProf'), 1);
  gl.uniform1f(gl.getUniformLocation(prog, 'uAsp'), asp);
  gl.uniform2f(gl.getUniformLocation(prog, 'uPaso'), 2 / prof.naturalWidth, 2 / prof.naturalHeight);
  gl.uniform1f(gl.getUniformLocation(prog, 'uFuerza'), 12);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOV = (26 * Math.PI) / 180;

  function medir() {
    const caja = lienzo.getBoundingClientRect();
    const s = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.max(1, Math.round(caja.width * s));
    lienzo.height = Math.max(1, Math.round(caja.height * s));
    gl!.viewport(0, 0, lienzo.width, lienzo.height);
  }

  // Dónde está la luz (-1 a 1 en horizontal): ratón, arrastre, giro del móvil o scroll.
  const mando = { arrastre: 0, raton: 0, inclinacion: 0, alto: 0, x: -1.4, y: 0 };
  let arrastrando: { x: number; base: number } | null = null;
  let tocado = false;
  escena.addEventListener('pointerdown', (e) => {
    arrastrando = { x: e.clientX, base: mando.arrastre };
    tocado = true;
    escena.classList.add('girando');
  });
  window.addEventListener('pointermove', (e) => {
    if (arrastrando) {
      mando.arrastre = Math.max(-1.2, Math.min(1.2, arrastrando.base + ((e.clientX - arrastrando.x) / escena.clientWidth) * 3));
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const caja = escena.getBoundingClientRect();
    if (e.clientY < caja.top || e.clientY > caja.bottom) return;
    tocado = true;
    mando.raton = ((e.clientX - caja.left) / caja.width - 0.5) * 2.2;
    mando.alto = ((e.clientY - caja.top) / caja.height - 0.5) * 2;
  });
  const soltar = () => {
    arrastrando = null;
    escena.classList.remove('girando');
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    mando.inclinacion = Math.max(-1, Math.min(1, e.gamma / 25));
  });

  let visible = false;
  let entrada = -1;
  let marco = 0;
  const inicio = performance.now();
  function pintar(ahora: number) {
    marco = 0;
    if (!visible || document.hidden) return;
    const t = (ahora - inicio) / 1000;
    if (entrada < 0) entrada = t;
    const caja = escena.getBoundingClientRect();
    const scroll = ((caja.top + caja.height / 2) / window.innerHeight - 0.5) * -1.6;
    // Al entrar, el foco barre la moto de izquierda a derecha; luego, si nadie la
    // toca, va y viene despacio.
    const intro = reducir ? 1 : Math.min(1, (t - entrada) / 2.2);
    const facil = 1 - Math.pow(1 - intro, 3);
    const vaiven = reducir || tocado ? 0 : Math.sin((t - entrada) * 0.5) * 0.55;
    let objetivo = mando.arrastre + mando.raton + mando.inclinacion + scroll + vaiven;
    objetivo = Math.max(-1.3, Math.min(1.3, objetivo));
    const destino = -1.4 * (1 - facil) + objetivo * facil;
    mando.x += (destino - mando.x) * (intro < 1 ? 0.3 : 0.07);
    mando.y += (mando.alto - mando.y) * 0.07;

    const w = lienzo.width;
    const h = lienzo.height;
    const ancho = w / h;
    const conTexto = ancho > 1.3;
    const ocupa = Math.min(conTexto ? 0.74 : 0.82, ((conTexto ? 0.6 : 0.92) * ancho) / asp);
    const dist = 1 / Math.tan(FOV / 2) / ocupa;
    const fraccion = (asp * ocupa) / ancho;
    const centro = conTexto ? 1 - 0.04 - fraccion / 2 : 0.5;
    const lado = ((centro * 2 - 1) * ancho) / ocupa;
    // Inclinación de una pieza, pequeña: acompaña a la luz sin deformar nada.
    const yaw = mando.x * 0.06;
    const pitch = 0.03 + mando.y * 0.02;

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniformMatrix4fv(u.proy, false, perspectiva(FOV, ancho, 0.1, 50));
    gl!.uniformMatrix4fv(u.vista, false, traslacion(lado, 0.02, -dist));
    gl!.uniformMatrix4fv(u.modelo, false, rotacion(yaw, pitch));
    gl!.uniform3f(u.luz, mando.x * 1.1, 0.75 - mando.y * 0.35, 0.65);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    escena.style.setProperty('--giro', yaw.toFixed(3));
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
