// Portada de Taller.Es: chapa negra recién pintada bajo los tubos de luz de la
// cabina. Sin pulir tiene «piel de naranja», la textura que ondula los reflejos;
// por donde pasa el ratón o el dedo queda pulida y los tubos se reflejan rectos,
// como un espejo. Un solo shader de WebGL 1; la zona pulida se pinta en un canvas
// 2D pequeño que sube como textura. Si no hay WebGL, devuelve false y la portada
// se queda con la foto de la cabina.

const VERT = `attribute vec2 a;varying vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTiempo;
uniform vec2 uLuz;
uniform sampler2D uMascara;

float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float ruido(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float piel(vec2 p){return ruido(p)*.62+ruido(p*2.13+5.2)*.28+ruido(p*4.37-3.7)*.1;}

float tubo(vec2 r,float y0,float ancho,float borde,float desfase){
  float d=abs(r.y-y0);
  float banda=1.-smoothstep(ancho-borde,ancho+borde,d);
  float s=fract(r.x*.62+desfase);
  float corte=borde*2.5+.004;
  float tramo=smoothstep(0.,corte,s)*(1.-smoothstep(.86-corte,.86,s));
  float halo=exp(-d*d/(ancho*ancho*40.))*.12;
  return banda*tramo+halo*(.85+.15*tramo);
}

void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=vec2((vUv.x-.5)*asp,vUv.y-.5);
  float pul=smoothstep(.06,.92,texture2D(uMascara,vUv).r);

  // Piel de naranja: un grano fino (textura) y una ondulación más ancha, que es
  // la que tuerce los reflejos.
  vec2 q=p*40.;
  float h=piel(q);
  vec2 g=vec2(piel(q+vec2(.25,0.))-h,piel(q+vec2(0.,.25))-h)*4.;
  vec2 q2=p*9.;
  float h2=ruido(q2);
  vec2 g2=vec2(ruido(q2+vec2(.2,0.))-h2,ruido(q2+vec2(0.,.2))-h2)*5.;
  vec2 n=(g*.0026+g2*.006)*(1.-pul);

  float nervio=-.035+.06*p.x;
  float arriba=smoothstep(-.0025,.0025,p.y-nervio);
  vec2 r=vec2(p.x,p.y+.15*p.x*p.x+.045*p.x+arriba*.03);
  r+=n+uLuz*vec2(.035,.02);
  r.x+=uTiempo*.01;

  vec3 c=mix(vec3(.005,.006,.009),vec3(.028,.031,.045),smoothstep(-.7,.55,r.y));
  c+=vec3(.045,.05,.068)*exp(-pow((r.y-.2)*2.3,2.));
  c+=vec3(.2,.17,.72)*.42*exp(-pow((r.y+.56)*3.,2.));
  float borde=mix(.0078,.0011,pul);
  float t=tubo(r,.41,.0115,borde,0.)+tubo(r,.305,.0095,borde,.33)*.9+tubo(r,.215,.0075,borde,.61)*.72+tubo(r,.14,.0055,borde,.17)*.5;
  c+=vec3(.95,.965,1.)*t;

  c*=mix(1.,.76+.48*h,(1.-pul)*.8);
  c+=vec3(.55,.6,.8)*(1.-smoothstep(0.,.0022,abs(p.y-nervio)))*mix(.1,.28,pul);
  c*=mix(1.03,.95,pul);
  c*=.4+.6*smoothstep(1.35,.15,length(p*vec2(.78,1.15)));
  c+=(hash(gl_FragCoord.xy+fract(uTiempo*7.)*91.)-.5)*.012;
  gl_FragColor=vec4(c,1.);
}`;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string) {
  const s = gl.createShader(tipo)!;
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

type Opciones = {
  /** Se llama con el porcentaje de chapa pulida (0–100) cuando cambia. */
  alPulir?: (porcentaje: number) => void;
};

export function iniciarPulido(seccion: HTMLElement, lienzo: HTMLCanvasElement, opciones: Opciones = {}): boolean {
  const gl = lienzo.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
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

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const atributo = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(atributo);
  gl.vertexAttribPointer(atributo, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const u = {
    res: gl.getUniformLocation(prog, 'uRes'),
    tiempo: gl.getUniformLocation(prog, 'uTiempo'),
    luz: gl.getUniformLocation(prog, 'uLuz'),
    mascara: gl.getUniformLocation(prog, 'uMascara'),
  };
  gl.uniform1i(u.mascara, 0);

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // La zona pulida: blanco donde se ha pulido. 384 px de ancho bastan, el shader
  // la suaviza al estirarla.
  const mascara = document.createElement('canvas');
  const m = mascara.getContext('2d', { willReadFrequently: true })!;
  let ancho = 1;
  let alto = 1;
  let sucia = true;
  let cambios = false;

  function medir() {
    const caja = seccion.getBoundingClientRect();
    ancho = Math.max(1, caja.width);
    alto = Math.max(1, caja.height);
    let escala = Math.min(window.devicePixelRatio || 1, 2);
    const maxPixeles = 1.8e6;
    if (ancho * alto * escala * escala > maxPixeles) escala = Math.sqrt(maxPixeles / (ancho * alto));
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(alto * escala);
    gl!.viewport(0, 0, lienzo.width, lienzo.height);
    const mw = 384;
    const mh = Math.max(1, Math.round((mw * alto) / ancho));
    if (mascara.width !== mw || mascara.height !== mh) {
      const copia = document.createElement('canvas');
      copia.width = mascara.width;
      copia.height = mascara.height;
      if (mascara.width > 1) copia.getContext('2d')!.drawImage(mascara, 0, 0);
      mascara.width = mw;
      mascara.height = mh;
      m.fillStyle = '#000';
      m.fillRect(0, 0, mw, mh);
      if (copia.width > 1) m.drawImage(copia, 0, 0, mw, mh);
      sucia = true;
    }
  }

  /** Un toque de la pulidora en (x, y), en píxeles de la portada. */
  function toque(x: number, y: number, radio: number, fuerza = 0.5) {
    const k = mascara.width / ancho;
    const [mx, my, mr] = [x * k, y * k, radio * k];
    const g = m.createRadialGradient(mx, my, 0, mx, my, mr);
    g.addColorStop(0, `rgba(255,255,255,${fuerza})`);
    g.addColorStop(0.55, `rgba(255,255,255,${fuerza * 0.6})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    m.globalCompositeOperation = 'lighter';
    m.fillStyle = g;
    m.beginPath();
    m.arc(mx, my, mr, 0, Math.PI * 2);
    m.fill();
    sucia = true;
    cambios = true;
  }

  /** Pasada continua entre dos puntos, sin huecos aunque el ratón vaya rápido. */
  function pasada(x0: number, y0: number, x1: number, y1: number, radio: number, fuerza?: number) {
    const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (radio * 0.3)));
    for (let i = 1; i <= pasos; i++) toque(x0 + ((x1 - x0) * i) / pasos, y0 + ((y1 - y0) * i) / pasos, radio, fuerza);
  }

  const radioPulidora = () => Math.max(46, Math.min(ancho, alto) * 0.085);

  // Primera pasada sola, para que se vea el antes y el después sin tocar nada.
  // En horizontal pule la derecha (el texto va a la izquierda); en vertical, la franja de arriba.
  const horizontal = () => ancho / alto > 1.05;
  function puntoAuto(t: number) {
    const [x0, x1, y0, y1] = horizontal() ? [0.56, 0.97, 0.06, 0.62] : [0.06, 0.94, 0.07, 0.4];
    const vueltas = 3;
    const v = t * vueltas;
    const fila = Math.min(vueltas - 1, Math.floor(v));
    const f = v - fila;
    const x = fila % 2 ? 1 - f : f;
    const y = (fila + 0.5 + Math.sin(f * Math.PI) * 0.18) / vueltas;
    return [(x0 + (x1 - x0) * x) * ancho, (y0 + (y1 - y0) * y) * alto] as const;
  }
  let auto = reducir ? 1 : 0;
  let anteriorAuto: readonly [number, number] | null = null;
  if (reducir) {
    medir();
    for (let t = 0; t <= 1; t += 0.004) {
      const [x, y] = puntoAuto(t);
      toque(x, y, radioPulidora() * 1.1, 0.6);
    }
  }

  // Ratón o dedo. En móvil, deslizar de lado pule y deslizar en vertical hace scroll.
  let ultimo: { x: number; y: number } | null = null;
  const luz = { x: 0, y: 0, ax: 0, ay: 0 };
  function mover(e: PointerEvent) {
    const caja = seccion.getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    luz.x = (x / ancho) * 2 - 1;
    luz.y = 1 - (y / alto) * 2;
    if (ultimo) pasada(ultimo.x, ultimo.y, x, y, radioPulidora(), e.pointerType === 'mouse' ? 0.32 : 0.5);
    ultimo = { x, y };
  }
  seccion.addEventListener('pointermove', mover);
  seccion.addEventListener('pointerdown', mover);
  seccion.addEventListener('pointerleave', () => (ultimo = null));
  seccion.addEventListener('pointercancel', () => (ultimo = null));
  seccion.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && (ultimo = null));

  // Cuánta chapa está pulida, para el contador de la portada.
  let ultimoPorcentaje = -1;
  function contar() {
    if (!cambios || !opciones.alPulir) return;
    cambios = false;
    const datos = m.getImageData(0, 0, mascara.width, mascara.height).data;
    let pulidos = 0;
    for (let i = 0; i < datos.length; i += 16) if (datos[i] > 150) pulidos++;
    const porcentaje = Math.min(100, Math.round((pulidos / (datos.length / 16)) * 100));
    if (porcentaje !== ultimoPorcentaje) opciones.alPulir((ultimoPorcentaje = porcentaje));
  }
  const intervalo = window.setInterval(contar, 350);

  let visible = true;
  let marco = 0;
  const inicio = performance.now();
  function pintar(ahora: number) {
    marco = 0;
    if (!visible || document.hidden) return;
    const t = (ahora - inicio) / 1000;
    if (auto < 1 && t > 0.7) {
      auto = Math.min(1, (t - 0.7) / 2.6);
      const facil = auto < 0.5 ? 2 * auto * auto : 1 - Math.pow(-2 * auto + 2, 2) / 2;
      const punto = puntoAuto(facil);
      if (anteriorAuto) pasada(anteriorAuto[0], anteriorAuto[1], punto[0], punto[1], radioPulidora() * 1.15, 0.55);
      anteriorAuto = punto;
    }
    luz.ax += (luz.x - luz.ax) * 0.05;
    luz.ay += (luz.y - luz.ay) * 0.05;
    if (sucia) {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, mascara);
      sucia = false;
    }
    gl!.uniform2f(u.res, lienzo.width, lienzo.height);
    gl!.uniform1f(u.tiempo, reducir ? 0 : t);
    gl!.uniform2f(u.luz, reducir ? 0 : luz.ax, reducir ? 0 : luz.ay);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    marco = requestAnimationFrame(pintar);
  }
  const arrancar = () => {
    if (!marco && visible && !document.hidden) marco = requestAnimationFrame(pintar);
  };

  new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting;
    arrancar();
  }).observe(seccion);
  document.addEventListener('visibilitychange', arrancar);
  new ResizeObserver(() => {
    medir();
    arrancar();
  }).observe(seccion);
  lienzo.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(marco);
    window.clearInterval(intervalo);
    seccion.classList.add('sin-webgl');
  });

  medir();
  arrancar();
  return true;
}
