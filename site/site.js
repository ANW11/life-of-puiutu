// Life of Puiutu coming-soon page: small animations only.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .18 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // the secret lights up when you reach it
  const secret = document.querySelector('.secret');
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting && secret.classList.add('lit')),
    { threshold: .35 }).observe(secret);
  secret.addEventListener('pointermove', e => {
    const r = secret.getBoundingClientRect();
    secret.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    secret.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });

  // parallax: hero art, world strips, secret art
  const hero = document.querySelector('.hero-art');
  const strips = [...document.querySelectorAll('.strip')];
  const sArt = document.querySelector('.secret-art');
  const onScroll = () => {
    const y = scrollY;
    if (y < innerHeight * 1.2) hero.style.transform = `translateY(${y * .3}px) scale(${1 + y / 6000})`;
    strips.forEach(s => {
      const r = s.parentElement.getBoundingClientRect();
      const sp = +s.dataset.speed, base = sp < 0 ? 0 : -(s.scrollWidth - innerWidth);
      s.style.transform = `translateX(${base + (innerHeight - r.top) * sp * 3}px)`;
    });
    const sr = secret.getBoundingClientRect();
    sArt.style.transform = `translateY(${sr.top * -.12}px)`;
  };
  if (!reduce) { addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  // floating fireflies / dust in square pixels
  const c = document.getElementById('motes'), g = c.getContext('2d');
  let W, H, motes = [];
  const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < 38; i++) motes.push({ x: Math.random(), y: Math.random(), s: Math.random() < .3 ? 4 : 2,
    v: .00004 + Math.random() * .00012, p: Math.random() * 6.28 });
  const tick = t => {
    g.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.y -= m.v * 16; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
      const a = .35 + .35 * Math.sin(t / 700 + m.p);
      g.fillStyle = `rgba(255,214,120,${a})`;
      g.fillRect(Math.round((m.x + Math.sin(t / 3000 + m.p) * .01) * W), Math.round(m.y * H), m.s, m.s);
    }
    requestAnimationFrame(tick);
  };
  if (!reduce) requestAnimationFrame(tick);
})();
