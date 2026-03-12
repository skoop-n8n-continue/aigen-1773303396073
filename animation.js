/* ============================================================
   QUALITY ROOTS — "THE BIG STAMP" DEAL PROMO
   Animation Engine — GSAP 3
   ============================================================ */

gsap.registerPlugin(SplitText, CustomEase, DrawSVGPlugin, MotionPathPlugin);

/* -------- Custom Eases -------- */

// Rubber stamp slamming down: very fast in, elastic settle
CustomEase.create("stampSlam",
  "M0,0 C0.14,0 0.22,1.68 0.32,1.68 0.42,1.68 0.54,0.94 0.7,0.94 0.86,0.94 0.94,1 1,1");

// Card drop: gravity pull in, soft bounce settle
CustomEase.create("cardDrop",
  "M0,0 C0.22,0 0.34,1.06 0.48,1.06 0.62,1.06 0.78,0.99 1,1");

// Decisive snap for labels
CustomEase.create("labelSnap",
  "M0,0 C0.3,0 0.5,1.2 0.7,1.2 0.85,1.2 0.92,0.98 1,1");

/* ============================================================
   CONFIGURATION
   ============================================================ */
const PRODUCTS_PER_CYCLE = 1;     // Solo spotlight — most dramatic
const CYCLE_DURATION    = 14;     // Total seconds per product cycle
const ENTRANCE_DUR      = 2.8;    // Content reveal phase
const LIVE_START        = 9.5;    // When living moment begins winding down
const EXIT_START        = 11.0;   // When exit begins

/* ============================================================
   STATE
   ============================================================ */
let PRODUCTS   = [];
let splitCache = null;   // SplitText instance — reuse / revert between cycles
let liveTimeline = null; // Idle/living-moment timeline — killed before exit

/* ============================================================
   UTILITY
   ============================================================ */
function formatPrice(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return n % 1 === 0 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

function buildThcLabel(product) {
  if (product.lab_thca_value && product.lab_thca_value > 0) {
    return `THCA ${product.lab_thca_value.toFixed(1)}${product.lab_thca_unit}`;
  }
  if (product.lab_thc_value && product.lab_thc_value > 0) {
    return `THC ${product.lab_thc_value % 1 === 0
      ? product.lab_thc_value
      : product.lab_thc_value.toFixed(1)}${product.lab_thc_unit}`;
  }
  return '';
}

function calcDiscount(original, discounted) {
  const o = parseFloat(original);
  const d = parseFloat(discounted);
  if (!o || !d) return 50;
  return Math.round(((o - d) / o) * 100);
}

/* ============================================================
   LOAD PRODUCTS
   ============================================================ */
async function loadProducts() {
  try {
    const res = await fetch('./products.json', { cache: 'no-store' });
    const data = await res.json();
    PRODUCTS = data.products || [];
    if (PRODUCTS.length === 0) throw new Error('Empty product list');
  } catch (e) {
    console.error('products.json load failed:', e);
    // Fallback: show placeholder
    PRODUCTS = [{
      brand: 'Quality Roots',
      name: 'Featured Product',
      price: '40',
      discounted_price: 20,
      image_url: '',
      category: 'Cannabis',
      strain_type: 'Hybrid',
      lab_thc_value: 20,
      lab_thc_unit: '%',
      lab_thca_value: 0
    }];
  }
  animateCycle(0);
}

/* ============================================================
   BATCH SELECTION
   ============================================================ */
function getBatch(batchIndex) {
  const start = (batchIndex * PRODUCTS_PER_CYCLE) % Math.max(PRODUCTS.length, 1);
  return Array.from({ length: PRODUCTS_PER_CYCLE }, (_, i) =>
    PRODUCTS[(start + i) % PRODUCTS.length]
  );
}

/* ============================================================
   POPULATE DOM WITH PRODUCT DATA
   ============================================================ */
function populateProduct(product) {
  // Clean up previous SplitText
  if (splitCache) { splitCache.revert(); splitCache = null; }

  // Reset clip path on image box
  gsap.set('#image-clip-box', { clipPath: 'inset(100% 0% 0% 0%)' });

  // Image
  const img = document.getElementById('product-img');
  img.src = product.image_url || '';
  img.alt = product.name || '';

  // Category badge
  document.getElementById('category-text').textContent =
    (product.category || 'CANNABIS').toUpperCase();

  // Brand
  document.getElementById('brand-name').textContent =
    (product.brand || '').toUpperCase();

  // Product name
  document.getElementById('product-name').textContent = product.name || '';

  // Strain pill
  const strain = product.strain_type || '';
  const strainEl = document.getElementById('strain-pill');
  strainEl.textContent = strain.toUpperCase();
  strainEl.style.display = strain ? '' : 'none';

  // THC chip
  const thcLabel = buildThcLabel(product);
  const thcEl = document.getElementById('thc-chip');
  thcEl.textContent = thcLabel;
  thcEl.style.display = thcLabel ? '' : 'none';

  // Prices
  document.getElementById('was-price').textContent = formatPrice(product.price);
  document.getElementById('now-price').textContent = formatPrice(product.discounted_price);

  // Reset all animated elements to invisible
  gsap.set([
    '#category-badge', '#qr-diamond-badge',
    '#brand-row', '#strain-pill', '#thc-chip',
    '#was-row', '#now-row', '#deal-stamp',
    '#panel-divider'
  ], { opacity: 0 });

  gsap.set('#stamp-card', { y: -340, rotation: -9, opacity: 1 });
  gsap.set('#strike-bar', { scaleX: 0 });

  // Split text — do this AFTER setting content
  splitCache = new SplitText('#product-name', { type: 'words,chars' });
  gsap.set(splitCache.chars, { y: 24, opacity: 0 });
}

/* ============================================================
   LIVING MOMENT — idle animations that run while card is on screen
   ============================================================ */
function startLivingMoment() {
  liveTimeline = gsap.timeline();

  // Card gently floats up/down
  liveTimeline.to('#stamp-card', {
    y: -8, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0);

  // Stamp slowly wobbles
  liveTimeline.to('#deal-stamp', {
    rotation: '-=4', duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0.3);

  // Stamp gentle scale pulse
  liveTimeline.to('#deal-stamp', {
    scale: 1.04, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0);

  // Gold particles float in
  const particles = gsap.utils.toArray('.particle');
  particles.forEach((p, i) => {
    liveTimeline.to(p, {
      opacity: gsap.utils.random(0.2, 0.7),
      y: gsap.utils.random(-30, 30),
      x: gsap.utils.random(-20, 20),
      scale: gsap.utils.random(0.5, 1.6),
      duration: gsap.utils.random(2, 4),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: i * 0.3
    }, 0);
  });

  // Botanical leaves drift slightly
  liveTimeline.to('#fg-left .botanical', {
    y: -12, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0.5);
  liveTimeline.to('#fg-right .botanical', {
    y: 10, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 1);

  // Corner ornaments gently pulse opacity
  liveTimeline.to('.corner-deco', {
    opacity: 0.8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.4
  }, 0);
}

/* ============================================================
   MAIN ANIMATION CYCLE
   ============================================================ */
function animateCycle(batchIndex) {
  const batch   = getBatch(batchIndex);
  const product = batch[0];

  // Kill previous living moment
  if (liveTimeline) { liveTimeline.kill(); liveTimeline = null; }

  // Preload the next product image
  const nextProduct = getBatch(batchIndex + 1)[0];
  if (nextProduct && nextProduct.image_url) {
    const preload = new Image();
    preload.src = nextProduct.image_url;
  }

  // Populate DOM
  populateProduct(product);

  /* ============================================================
     THE MASTER TIMELINE
     ============================================================ */
  const tl = gsap.timeline({
    onComplete: () => animateCycle(batchIndex + 1)
  });

  /* ----------------------------------------------------------
     PHASE 1 · CARD ENTRANCE  (t = 0 → 0.9s)
     Card drops from above, rotating into place with a bounce
     ---------------------------------------------------------- */
  tl.addLabel('entrance', 0);

  tl.to('#stamp-card', {
    y: 0,
    rotation: 0,
    duration: 0.85,
    ease: 'cardDrop',
  }, 'entrance');

  /* ----------------------------------------------------------
     PHASE 2 · TOP BAR ELEMENTS  (t = 0.5 → 1.2s)
     ---------------------------------------------------------- */
  tl.addLabel('topbar', 0.5);

  // Category badge — arrow slides in from left
  tl.fromTo('#category-badge',
    { x: -240, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.58, ease: 'labelSnap' },
    'topbar'
  );

  // QR badge — scale/rotate in from zero
  tl.fromTo('#qr-diamond-badge',
    { scale: 0, rotation: -50, opacity: 0 },
    { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: 'back.out(2)' },
    'topbar+=0.12'
  );

  /* ----------------------------------------------------------
     PHASE 3 · PRODUCT IMAGE REVEALS  (t = 0.7 → 1.6s)
     Clip-path wipe from bottom to top (elegant curtain reveal)
     ---------------------------------------------------------- */
  tl.addLabel('imageReveal', 0.7);

  tl.to('#image-clip-box', {
    clipPath: 'inset(0% 0% 0% 0%)',
    duration: 0.9,
    ease: 'power3.out',
  }, 'imageReveal');

  /* ----------------------------------------------------------
     PHASE 4 · PANEL DIVIDER  (t = 1.0)
     ---------------------------------------------------------- */
  tl.to('#panel-divider', {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out',
  }, 1.0);

  /* ----------------------------------------------------------
     PHASE 5 · BRAND NAME  (t = 1.1 → 1.5s)
     ---------------------------------------------------------- */
  tl.fromTo('#brand-row',
    { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
    1.1
  );

  /* ----------------------------------------------------------
     PHASE 6 · PRODUCT NAME — SplitText char stagger  (t = 1.3 → 2.4s)
     ---------------------------------------------------------- */
  tl.addLabel('nameReveal', 1.3);

  if (splitCache && splitCache.chars && splitCache.chars.length > 0) {
    tl.to(splitCache.chars, {
      y: 0,
      opacity: 1,
      duration: 0.45,
      ease: 'back.out(1.6)',
      stagger: {
        amount: 0.55,
        from: 'start'
      }
    }, 'nameReveal');
  }

  /* ----------------------------------------------------------
     PHASE 7 · META CHIPS  (t = 2.0 → 2.5s)
     ---------------------------------------------------------- */
  tl.addLabel('metaReveal', 2.0);

  const visibleChips = [];
  if (document.getElementById('strain-pill').style.display !== 'none') {
    visibleChips.push('#strain-pill');
  }
  if (document.getElementById('thc-chip').style.display !== 'none') {
    visibleChips.push('#thc-chip');
  }

  if (visibleChips.length > 0) {
    tl.fromTo(visibleChips,
      { scale: 0, y: 8, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.38, ease: 'back.out(2)', stagger: 0.12 },
      'metaReveal'
    );
  }

  /* ----------------------------------------------------------
     PHASE 8 · WAS PRICE  (t = 2.5 → 3.0s)
     ---------------------------------------------------------- */
  tl.addLabel('wasPriceIn', 2.5);

  tl.fromTo('#was-row',
    { opacity: 0 },
    { opacity: 1, duration: 0.4, ease: 'power2.out' },
    'wasPriceIn'
  );
  tl.fromTo('#was-price',
    { y: -20, scale: 1.3 },
    { y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.8)' },
    'wasPriceIn'
  );

  /* ----------------------------------------------------------
     PHASE 9 · STRIKETHROUGH — draws across the price  (t = 3.0 → 3.5s)
     ---------------------------------------------------------- */
  tl.to('#strike-bar', {
    scaleX: 1,
    duration: 0.45,
    ease: 'power3.inOut',
  }, 3.0);

  /* ----------------------------------------------------------
     PHASE 10 · DEAL PRICE SLAM  (t = 3.5 → 4.3s)
     Deal price crashes up from below with huge scale bounce
     ---------------------------------------------------------- */
  tl.addLabel('dealPriceIn', 3.5);

  tl.to('#now-row', {
    opacity: 1,
    duration: 0.4,
    ease: 'power3.out',
  }, 'dealPriceIn');

  // Big price slams in from below
  tl.from('#now-price', {
    y: 60,
    scale: 0.4,
    duration: 0.5,
    ease: 'back.out(2.2)',
  }, 'dealPriceIn');

  /* ----------------------------------------------------------
     PHASE 11 · 50% OFF STAMP SLAM  (t = 4.5 → 5.4s)
     The signature moment — rubber stamp crashes down
     ---------------------------------------------------------- */
  tl.addLabel('stampIn', 4.5);

  // Set initial state for the stamp slam
  tl.set('#deal-stamp', { opacity: 1, scale: 3, rotation: -38, y: -80 }, 'stampIn');

  // Rapid drop
  tl.to('#deal-stamp', {
    y: 12, scale: 1.12, rotation: -14,
    duration: 0.22,
    ease: 'power4.in',
  }, 'stampIn');

  // Settle/squash on impact
  tl.to('#deal-stamp', {
    y: 0, scale: 1, rotation: -12,
    duration: 0.55,
    ease: 'elastic.out(1.2, 0.45)',
  }, 'stampIn+=0.22');

  // Ink splat: brief flash glow on stamp
  tl.to('#stamp-outer-ring', {
    boxShadow: '0 0 0 8px #801A14, 0 0 60px 20px rgba(178,40,32,0.8), 0 12px 40px rgba(178,40,32,0.6)',
    duration: 0.15,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out',
  }, 'stampIn+=0.18');

  /* ----------------------------------------------------------
     PHASE 12 · LIVING MOMENT  (t = 5.5 → 11.0s)
     Subtle idling motion — card floats, particles drift
     ---------------------------------------------------------- */
  tl.call(() => { startLivingMoment(); }, [], 5.5);

  /* ----------------------------------------------------------
     PHASE 13 · EXIT  (t = 11.0 → 13.0s)
     Card rotates and flies off, each element cascades out
     ---------------------------------------------------------- */
  tl.addLabel('exit', EXIT_START);

  // Kill living moment
  tl.call(() => {
    if (liveTimeline) { liveTimeline.kill(); liveTimeline = null; }
    // Return particles to invisible
    gsap.to('.particle', { opacity: 0, duration: 0.3 });
  }, [], 'exit');

  // Stamp flies off first (top-right arc)
  tl.to('#deal-stamp', {
    x: 280, y: -220, scale: 0.5, rotation: 30, opacity: 0,
    duration: 0.7,
    ease: 'power3.in',
  }, 'exit');

  // Card slams out — drops with rotation
  tl.to('#stamp-card', {
    y: 500, rotation: 8, opacity: 0,
    duration: 0.9,
    ease: 'power3.in',
  }, 'exit+=0.15');

  // Botanical leaves drift off
  tl.to(['#fg-left .botanical', '#fg-right .botanical'], {
    opacity: 0.2,
    duration: 0.6,
    ease: 'power2.in',
  }, 'exit+=0.2');

  /* ----------------------------------------------------------
     PHASE 14 · INTER-CYCLE PAUSE + RESET  (t = 12.2 → 14.0s)
     ---------------------------------------------------------- */
  tl.addLabel('reset', 12.4);

  // Fade botanicals back in
  tl.to(['#fg-left .botanical', '#fg-right .botanical'], {
    opacity: 0.42,
    duration: 0.6,
    ease: 'power2.out',
  }, 'reset');

  // Reset stamp card position off-screen (ready for next entrance)
  tl.set('#stamp-card', { y: -340, rotation: -9, opacity: 1 }, 'reset');
  tl.set('#deal-stamp', { x: 0, scale: 1, rotation: -12 }, 'reset');

  // Total cycle padding — timeline ends at ~14s, then onComplete fires
}

/* ============================================================
   FOOTER MARQUEE — slow continuous scroll
   ============================================================ */
function initMarquee() {
  const inner = document.getElementById('footer-inner');
  if (!inner) return;
  const totalWidth = inner.scrollWidth;
  gsap.to(inner, {
    x: -(totalWidth / 2),
    duration: 28,
    ease: 'none',
    repeat: -1,
  });
}

/* ============================================================
   AMBIENT CORNER ORNAMENTS — initial reveal
   ============================================================ */
function initAmbient() {
  gsap.set('.corner-deco', { opacity: 0, scale: 0.6 });
  gsap.to('.corner-deco', {
    opacity: 0.55, scale: 1,
    duration: 1.2, ease: 'power2.out', stagger: 0.15, delay: 0.3
  });

  gsap.set(['.ambient-rule', '#footer-strip'], { opacity: 0 });
  gsap.to(['.ambient-rule', '#footer-strip'], {
    opacity: 1, duration: 1, ease: 'power2.out', delay: 0.6
  });
}

/* ============================================================
   ENTRY POINT
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  initAmbient();
  initMarquee();
  loadProducts();
});
