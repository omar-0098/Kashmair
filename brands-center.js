/* بيلوّن اللوجو اللي في نص شريط البراندات أثناء الحركة.
   حطه في آخر index.html بعد js/swiper.js */
(function () {
  var box = document.querySelector('.swipernostop');
  if (!box || !('IntersectionObserver' in window)) return;

  var visible = false, raf = null, current = null;

  function tick() {
    if (!visible) { raf = null; return; }
    var r = box.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var best = null, min = Infinity;

    box.querySelectorAll('.swiper-slide').forEach(function (s) {
      var b = s.getBoundingClientRect();
      var d = Math.abs(b.left + b.width / 2 - cx);
      if (d < min) { min = d; best = s; }
    });

    if (best !== current) {
      box.querySelectorAll('.is-center').forEach(function (el) {
        el.classList.remove('is-center');
      });
      if (best) best.classList.add('is-center');
      current = best;
    }
    raf = requestAnimationFrame(tick);
  }

  // يشتغل بس لما القسم ظاهر على الشاشة (توفير للأداء)
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(tick);
  }).observe(box);
})();
