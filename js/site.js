/* ============================================================
   ELYAN. Shared site behaviour (every page)
   Header scroll state + scroll-reveal animations.
   ============================================================ */
(function(){
  'use strict';

  document.addEventListener('DOMContentLoaded', function(){

    /* ---------- header scroll state ---------- */
    var header = document.getElementById('siteHeader');
    if(header){
      function onScroll(){ header.classList.toggle('scrolled', window.scrollY > 8); }
      window.addEventListener('scroll', onScroll, { passive:true });
      onScroll();
    }

    /* ---------- reveal on scroll ---------- */
    var revealEls = document.querySelectorAll('.reveal');
    if(revealEls.length){
      if('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(entry.isIntersecting){ entry.target.classList.add('in-view'); io.unobserve(entry.target); }
          });
        }, { threshold:.15 });
        revealEls.forEach(function(el){ io.observe(el); });
      } else {
        revealEls.forEach(function(el){ el.classList.add('in-view'); });
      }
    }

  });
})();
