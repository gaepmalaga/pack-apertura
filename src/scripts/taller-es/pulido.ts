// Portada de Taller.Es: chapa negra recién pintada bajo los tubos de luz de la
// cabina. Al entrar tiene «piel de naranja» (la textura que ondula los reflejos)
// y una pasada de luz la pule entera en un par de segundos: los tubos quedan
// rectos, como un espejo. Después los reflejos se mueven solos, con el scroll, el
// ratón o al inclinar el móvil, como cuando caminas junto a un coche recién pintado.
// Un solo shader de WebGL 1. Sin WebGL devuelve false y se ve la foto de la cabina.

const VERT = `attribute vec2 a;varying vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTiempo;
uniform vec2 uLuz;
uniform float uBarrido;
uniform float uDesplaza;

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

  // La pasada de pulido: un frente en diagonal que cruza de izquierda a derecha.
  float s=p.x+p.y*.35;
  float frente=mix(-asp*.5-.5,asp*.5+.5,uBarrido);
  float pul=1.-smoothstep(frente-.14,frente+.02,s);

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
  r+=n+uLuz*vec2(.05,.03);
  r.x+=uTiempo*.014;
  r.y+=uDesplaza;

  vec3 c=mix(vec3(.005,.006,.009),vec3(.028,.031,.045),smoothstep(-.7,.55,r.y));
  c+=vec3(.045,.05,.068)*exp(-pow((r.y-.2)*2.3,2.));
  c+=vec3(.2,.17,.72)*.42*exp(-pow((r.y+.56)*3.,2.));
  float borde=mix(.0078,.0011,pul);
  float t=tubo(r,.41,.0115,borde,0.)+tubo(r,.305,.0095,borde,.33)*.9+tubo(r,.215,.0075,borde,.61)*.72+tubo(r,.14,.0055,borde,.17)*.5;
  c+=vec3(.95,.965,1.)*t;

  c*=mix(1.,.76+.48*h,(1.-pul)*.8);
  c+=vec3(.55,.6,.8)*(1.-smoothstep(0.,.0022,abs(p.y-nervio)))*mix(.1,.28,pul);
  // Brillo del frente de la pasada, que se apaga al terminar.
  float luzFrente=exp(-pow((s-frente+.04)*16.,2.))*(1.-smoothstep(.85,1.,uBarrido));
  c+=vec3(.62,.64,1.)*luzFrente*.32;
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

export function iniciarPulido(seccion: HTMLElement, lienzo: HTMLCanvasElement): boolean {
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

  const u = {
    res: gl.getUniformLocation(prog, 'uRes'),
    tiempo: gl.getUniformLocation(prog, 'uTiempo'),
    luz: gl.getUniformLocation(prog, 'uLuz'),
    barrido: gl.getUniformLocation(prog, 'uBarrido'),
    desplaza: gl.getUniformLocation(prog, 'uDesplaza'),
  };
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function medir() {
    const caja = seccion.getBoundingClientRect();
    const ancho = Math.max(1, caja.width);
    const alto = Math.max(1, caja.height);
    let escala = Math.min(window.devicePixelRatio || 1, 2);
    const maxPixeles = 1.8e6;
    if (ancho * alto * escala * escala > maxPixeles) escala = Math.sqrt(maxPixeles / (ancho * alto));
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(alto * escala);
    gl!.viewport(0, 0, lienzo.width, lienzo.height);
  }

  // Hacia dónde se inclinan los reflejos: ratón en escritorio, giro en el móvil.
  const luz = { x: 0, y: 0, ax: 0, ay: 0 };
  seccion.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const caja = seccion.getBoundingClientRect();
    luz.x = ((e.clientX - caja.left) / caja.width) * 2 - 1;
    luz.y = 1 - ((e.clientY - caja.top) / caja.height) * 2;
  });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    luz.x = Math.max(-1, Math.min(1, e.gamma / 30));
    luz.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  });

  let visible = true;
  let marco = 0;
  const inicio = performance.now();
  function pintar(ahora: number) {
    marco = 0;
    if (!visible || document.hidden) return;
    const t = (ahora - inicio) / 1000;
    // Pasada de pulido: empieza enseguida y dura dos segundos.
    const b = reducir ? 1 : Math.min(1, Math.max(0, (t - 0.35) / 2));
    const barrido = b < 0.5 ? 4 * b * b * b : 1 - Math.pow(-2 * b + 2, 3) / 2;
    luz.ax += (luz.x - luz.ax) * 0.04;
    luz.ay += (luz.y - luz.ay) * 0.04;
    const desplaza = Math.min(1.5, window.scrollY / Math.max(1, window.innerHeight)) * 0.22;
    gl!.uniform2f(u.res, lienzo.width, lienzo.height);
    gl!.uniform1f(u.tiempo, reducir ? 0 : t);
    gl!.uniform2f(u.luz, reducir ? 0 : luz.ax, reducir ? 0 : luz.ay);
    gl!.uniform1f(u.barrido, barrido);
    gl!.uniform1f(u.desplaza, reducir ? 0 : desplaza);
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
    seccion.classList.add('sin-webgl');
  });

  medir();
  arrancar();
  return true;
}
