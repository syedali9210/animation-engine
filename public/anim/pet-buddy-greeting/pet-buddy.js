/* ============================================================================
   <pet-buddy-greeting> — self-contained web component.

   The pixel pet buddy just idles by the sign: it tracks the cursor with its
   eyes across the whole page, reaches an arm toward it when it strays off to
   one side (with a little sparkle pop), blinks every few seconds, and cheers
   with both arms up on click. Design + physics from the original
   "claude pet buddy" reference's idle state.

   Usage:
     <script src="pet-buddy.js"></script>
     <pet-buddy-greeting text="Hi there!"></pet-buddy-greeting>

     <!-- or with your own markup as the sign content -->
     <pet-buddy-greeting size="150">
       <strong>Hello there 👋</strong>
     </pet-buddy-greeting>

   Attributes:
     text      — sign text (fallback when no slotted content). Default "Hi!"
     size      — pet width in px. Default 120.
     autoplay  — "false" to keep idling even while scrolled off-screen.
                 Default: only runs while the component is in view.

   Theming (CSS custom properties on the host or any ancestor):
     --pet-buddy-body, --pet-buddy-hi, --pet-buddy-sh, --pet-buddy-sh2,
     --pet-buddy-sign-bg, --pet-buddy-sign-color, --pet-buddy-sign-border
   ============================================================================ */
(() => {
  'use strict';
  if (customElements.get('pet-buddy-greeting')) return;

  const TEMPLATE = /* html */`
  <style>
    :host{ display:block; width:100%; }
    *{ box-sizing:border-box; }
    .stage{
      --pet-body: var(--pet-buddy-body, #db744f);
      --pet-hi:   var(--pet-buddy-hi,   #ec9a78);
      --pet-sh:   var(--pet-buddy-sh,   #b95a3c);
      --pet-sh2:  var(--pet-buddy-sh2,  #8f4530);
      --pet-eye:  #141414;
      --pet-glint:#ffffff;
      position:relative; width:100%;
      height:calc(var(--pet-w) * 1.35);
      overflow:hidden;
    }
    .sign{
      position:absolute; top:4%; left:50%;
      transform:translateX(-22%) rotate(-3deg);
      background:var(--pet-buddy-sign-bg, #2a2a2e);
      color:var(--pet-buddy-sign-color, #ececec);
      border:1px solid var(--pet-buddy-sign-border, rgba(255,255,255,.16));
      border-radius:10px; padding:8px 12px;
      font-size:calc(var(--pet-w) * 0.11); font-weight:700; line-height:1.35;
      box-shadow:0 10px 24px rgba(0,0,0,.4);
      white-space:nowrap;
    }
    .pet-wrap{ position:absolute; left:50%; bottom:2%; transform:translateX(-50%); }
    svg.pet{
      width:var(--pet-w); height:auto; display:block; cursor:pointer;
      filter:drop-shadow(0 8px 14px rgba(0,0,0,.45));
    }

    /* ---- rig pivots (from the original) ---- */
    .pet-root{ transform-box:fill-box; transform-origin:50% 100%; }
    .raise{ transform-box:fill-box; transform-origin:50% 100%; opacity:0; }
    .eyeball{ transform-box:fill-box; transform-origin:50% 50%; animation:blink 4.8s ease-in-out infinite; }
    @keyframes blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.06)}}

    /* sparkle emote — pops when the buddy notices the cursor */
    .spark{ opacity:0; transform-box:fill-box; transform-origin:50% 100%; }
    @keyframes sparkPop{
      0%  { opacity:0; transform: translateY(5px)  scale(.3); }
      40% { opacity:1; transform: translateY(-3px) scale(1);  }
      100%{ opacity:0; transform: translateY(-12px) scale(.7); }
    }
    .stage.emote .spark{ animation: sparkPop .6s steps(4); }

    /* click-to-cheer hop */
    @keyframes hop{
      0%{transform:translateY(0) scaleY(1)}
      18%{transform:translateY(3px) scaleY(.9)}
      45%{transform:translateY(-22px) scaleY(1.08)}
      70%{transform:translateY(0) scaleY(.93)}
      85%{transform:translateY(-5px) scaleY(1.02)}
      100%{transform:translateY(0) scaleY(1)}
    }
    .stage.happy .pet-root{ animation:hop .7s steps(3); }

    @media (prefers-reduced-motion: reduce){
      .stage *{ animation:none !important; }
    }
  </style>

  <div class="stage">
    <div class="sign"><slot><span class="fallback-text">Hi!</span></slot></div>
    <div class="pet-wrap">
      <svg class="pet" viewBox="-8 -46 278.5 204" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-label="Pixel pet buddy">
        <defs>
          <filter class="f-outline" x="-25%" y="-25%" width="150%" height="150%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="d"/>
            <feFlood flood-color="#8f4530"/>
            <feComposite in2="d" operator="in" result="o"/>
            <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- flat silhouette for the 3D slab extrude (id is instance-scoped) -->
          <g class="sil-front">
            <rect x="56.25" y="0" width="150" height="112.5"/>
            <rect x="0" y="37.5" width="56.25" height="37.5"/>
            <rect x="206.25" y="37.5" width="56.25" height="37.5"/>
            <rect x="56.25" y="112.5" width="18.75" height="37.5"/>
            <rect x="93.75" y="112.5" width="18.75" height="37.5"/>
            <rect x="150"   y="112.5" width="18.75" height="37.5"/>
            <rect x="187.5" y="112.5" width="18.75" height="37.5"/>
          </g>
        </defs>
        <g class="pet-root">
          <!-- 3D slab: dark offset silhouettes along the trailing iso axis -->
          <g fill="var(--pet-sh2)">
            <use class="use-sil-f" transform="translate(-18,10)" opacity=".5"/>
            <use class="use-sil-f" transform="translate(-9,5)" opacity=".85"/>
          </g>

          <g fill="var(--pet-body)">
            <rect x="56.25" y="0" width="150" height="112.5"/>
            <g>
              <rect x="56.25"  y="0"       width="150"    height="9.375" fill="var(--pet-hi)"/>
              <rect x="56.25"  y="9.375"   width="9.375"  height="93.75" fill="var(--pet-hi)"/>
              <rect x="196.875" y="0"      width="9.375"  height="103.125" fill="var(--pet-sh)"/>
              <rect x="56.25"  y="103.125" width="150"    height="9.375" fill="var(--pet-sh)"/>
              <rect x="93.75"  y="84.375"  width="7.5" height="7.5" fill="var(--pet-sh)" opacity=".45"/>
              <rect x="140.625" y="90"     width="7.5" height="7.5" fill="var(--pet-sh)" opacity=".45"/>
              <rect x="121.875" y="72"     width="7.5" height="7.5" fill="var(--pet-sh)" opacity=".35"/>
            </g>

            <g class="armL">
              <rect x="28.125" y="37.5" width="28.125" height="37.5"/>
              <rect class="forearm" x="0" y="37.5" width="28.125" height="37.5"/>
              <rect x="28.125" y="37.5" width="28.125" height="6" fill="var(--pet-hi)"/>
            </g>
            <g class="armR">
              <rect x="206.25"  y="37.5" width="28.125" height="37.5"/>
              <rect class="forearm" x="234.375" y="37.5" width="28.125" height="37.5"/>
              <rect x="206.25"  y="37.5" width="28.125" height="6" fill="var(--pet-hi)"/>
            </g>

            <rect class="raise raiseL" x="28.125" y="-28" width="28.125" height="65.5"/>
            <rect class="raise raiseR" x="206.25" y="-28" width="28.125" height="65.5"/>

            <g fill="var(--pet-sh)">
              <g class="leg">
                <rect x="56.25" y="112.5" width="18.75" height="18.75"/>
                <rect x="56.25" y="125.25" width="18.75" height="24.75" fill="var(--pet-sh2)"/>
                <rect x="59.625" y="120.75" width="12" height="9"/>
              </g>
              <g class="leg">
                <rect x="93.75" y="112.5" width="18.75" height="18.75"/>
                <rect x="93.75" y="125.25" width="18.75" height="24.75" fill="var(--pet-sh2)"/>
                <rect x="97.125" y="120.75" width="12" height="9"/>
              </g>
              <g class="leg">
                <rect x="150" y="112.5" width="18.75" height="18.75"/>
                <rect x="150" y="125.25" width="18.75" height="24.75" fill="var(--pet-sh2)"/>
                <rect x="153.375" y="120.75" width="12" height="9"/>
              </g>
              <g class="leg">
                <rect x="187.5" y="112.5" width="18.75" height="18.75"/>
                <rect x="187.5" y="125.25" width="18.75" height="24.75" fill="var(--pet-sh2)"/>
                <rect x="190.875" y="120.75" width="12" height="9"/>
              </g>
            </g>
          </g>

          <g class="eyes">
            <g class="eyeball" fill="var(--pet-eye)">
              <rect x="75" y="18.75" width="18.75" height="18.75"/>
              <rect x="168.75" y="18.75" width="18.75" height="18.75"/>
              <rect x="78" y="21.75" width="5.5" height="5.5" fill="var(--pet-glint)"/>
              <rect x="171.75" y="21.75" width="5.5" height="5.5" fill="var(--pet-glint)"/>
            </g>
          </g>

          <g class="spark" fill="#ffffff">
            <rect x="112" y="-14" width="6" height="6"/>
            <rect x="146" y="-14" width="6" height="6"/>
            <rect x="130" y="-20" width="6" height="6"/>
          </g>
        </g>
      </svg>
    </div>
  </div>`;

  /* tiny spring integrator — the physics core from the original */
  class Spring{
    constructor(x=0,k=190,c=20){ this.x=x; this.v=0; this.t=x; this.k=k; this.c=c; }
    step(dt){
      const n = Math.max(1, Math.ceil(dt/0.008)), h = dt/n;
      for(let i=0;i<n;i++){
        const a = -this.k*(this.x-this.t) - this.c*this.v;
        this.v += a*h; this.x += this.v*h;
      }
    }
  }

  const TICK = 1/12, PIX = 3, EYE_STP = 3.5;
  const q = (v,s) => Math.round(v/s)*s;
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  class PetBuddyGreeting extends HTMLElement{
    static get observedAttributes(){ return ['text','size','fps']; }

    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML = TEMPLATE;

      const $ = sel => this.shadowRoot.querySelector(sel);
      this._stage = $('.stage');
      this._root  = $('.pet-root');
      this._svg   = $('svg.pet');
      this._eyes  = $('.eyes');
      this._fallback = $('.fallback-text');
      this._forearms = [$('.armL .forearm'), $('.armR .forearm')];
      this._raises   = [$('.raiseL'), $('.raiseR')];

      // shadow-scope the outline filter + silhouette def (unique per instance)
      const uid = Math.random().toString(36).slice(2,8);
      const filt = $('.f-outline');
      filt.setAttribute('id', 'outline-' + uid);
      this._root.setAttribute('filter', `url(#outline-${uid})`);
      $('.sil-front').setAttribute('id', 'silf-' + uid);
      this.shadowRoot.querySelectorAll('.use-sil-f').forEach(u => u.setAttribute('href', '#silf-' + uid));

      this._raise = [new Spring(0,210,15), new Spring(0,210,15)];   // [L,R] arm raise

      this._pointer = { x: innerWidth/2, y: innerHeight/2 };
      this._hasPointer = false;
      this._reach = 'front';
      this._cheerUntil = 0;
      this._emoteTimer = null;
      this._happyTimer = null;
      this._idleEmoteInterval = null;
      this._acc = 0; this._last = 0; this._raf = null;
      this._active = false;
      this._reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

      this._onPointerMove = e => { this._pointer.x = e.clientX; this._pointer.y = e.clientY; this._hasPointer = true; };
      this._onPointerLeave = () => { this._hasPointer = false; };
      this._onClick = () => this._cheer();
    }

    /* ------------- lifecycle ------------- */
    connectedCallback(){
      this._applyAttrs();
      addEventListener('pointermove', this._onPointerMove);
      addEventListener('pointerleave', this._onPointerLeave);
      this._svg.addEventListener('click', this._onClick);

      if(this.getAttribute('autoplay') === 'false' || !('IntersectionObserver' in window)){
        this._start();
      } else {
        this._io = new IntersectionObserver(entries => {
          const visible = entries.some(e => e.isIntersecting);
          if(visible) this._start(); else this._stop();
        }, { threshold: 0.2 });
        this._io.observe(this);
      }
    }
    disconnectedCallback(){
      this._stop();
      if(this._io) this._io.disconnect();
      clearTimeout(this._emoteTimer);
      clearTimeout(this._happyTimer);
      removeEventListener('pointermove', this._onPointerMove);
      removeEventListener('pointerleave', this._onPointerLeave);
      this._svg.removeEventListener('click', this._onClick);
    }
    attributeChangedCallback(){ if(this.isConnected) this._applyAttrs(); }

    _applyAttrs(){
      const size = parseFloat(this.getAttribute('size')) || 120;
      this._petW = size;
      this._stage.style.setProperty('--pet-w', size + 'px');
      this._fallback.textContent = this.getAttribute('text') || 'Hi!';
      this._tickLen = 1 / (parseFloat(this.getAttribute('fps')) || 12); // arcade-style frame rate
    }

    /* ------------- idle loop control ------------- */
    _start(){
      if(this._active) return;
      this._active = true;
      this._last = performance.now();
      this._raf = requestAnimationFrame((t) => this._tick(t));
      this._idleEmoteInterval = setInterval(() => {
        if(this._hasPointer && this._reach === 'front' && !this._reduce) this._emote();
      }, 2200);
    }
    _stop(){
      if(!this._active) return;
      this._active = false;
      cancelAnimationFrame(this._raf);
      clearInterval(this._idleEmoteInterval);
    }

    /* ------------- reactions ------------- */
    _setReach(next){
      if(next === this._reach) return;
      this._reach = next;
      if(next !== 'front' && !this._reduce) this._emote();
    }
    _emote(){
      this._stage.classList.remove('emote'); void this._stage.offsetWidth;
      this._stage.classList.add('emote');
      clearTimeout(this._emoteTimer);
      this._emoteTimer = setTimeout(() => this._stage.classList.remove('emote'), 600);
    }
    _cheer(){
      this._cheerUntil = performance.now() + 650;
      this._stage.classList.remove('happy'); void this._stage.offsetWidth;
      this._stage.classList.add('happy');
      clearTimeout(this._happyTimer);
      this._happyTimer = setTimeout(() => this._stage.classList.remove('happy'), 750);
    }

    /* ------------- main loop ------------- */
    _tick(now){
      if(!this._active) return;
      let dt = (now - (this._last || now))/1000; this._last = now;
      dt = clamp(dt || 0.016, 0.001, 0.05);

      const happyNow = performance.now() < this._cheerUntil;

      /* eye tracking — cursor position relative to the pet, across the whole page */
      const r = this._svg.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height*0.42;
      let dx = 0, dy = 0;
      if(this._hasPointer){
        dx = clamp((this._pointer.x - cx)/(innerWidth*0.35), -1, 1);
        dy = clamp((this._pointer.y - cy)/(innerHeight*0.5), -1, 1);
      }
      this._setReach(this._hasPointer ? (dx < -0.28 ? 'left' : dx > 0.28 ? 'right' : 'front') : 'front');

      /* spring targets: reach toward the cursor, or both arms up on a cheer */
      this._raise[0].t = (this._reach === 'left'  || happyNow) ? 1 : 0;
      this._raise[1].t = (this._reach === 'right' || happyNow) ? 1 : 0;
      this._raise.forEach(s => s.step(dt));

      /* render on an arcade-style 12fps tick (reduced motion renders every frame) */
      this._acc += dt;
      if(this._acc >= (this._tickLen || TICK) || this._reduce){
        this._acc = 0;
        this._eyes.style.transform = `translate(${q(dx*7, EYE_STP)}px, ${q(dy*6, EYE_STP)}px)`;
        this._raise.forEach((s,i) => {
          const up = s.x > 0.5;
          this._forearms[i].style.opacity = up ? 0 : 1;
          this._raises[i].style.opacity   = up ? 1 : 0;
          this._raises[i].style.transform = `translateY(${q((1 - s.x)*16, PIX)}px)`;
        });
      }

      this._raf = requestAnimationFrame((t) => this._tick(t));
    }
  }

  customElements.define('pet-buddy-greeting', PetBuddyGreeting);
})();
