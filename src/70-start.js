/* =========================================================
   7) بدء التشغيل
   ========================================================= */
// كل النوافذ (modal-backdrop) كانت بنفس أولوية العرض (z-index) الثابتة، فكانت النافذة الأحدث فتحًا
// ممكن تظهر تحت نافذة قديمة لسه مفتوحة بمجرد إنها مكتوبة قبلها في الكود. الحل: أي نافذة تتفتح،
// ترفع أولويتها البصرية تلقائيًا فوق كل حاجة تانية، بغض النظر عن ترتيبها في الكود.
(function(){
  let topZ = 100;
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName === 'class' && el.classList.contains('show')){
          topZ += 1;
          el.style.zIndex = topZ;
        }
      });
    }).observe(el, { attributes: true });
  });
})();

