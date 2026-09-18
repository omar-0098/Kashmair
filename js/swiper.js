var swiper = new Swiper(".slide_swp", {
  pagination: {
    el: ".swiper-pagination",
    dynamicBullests: true ,
    clickable: true ,
  },
  autoplay:{
    delay:2500,
  },
  loop:true
});

//   prodect
var swiper = new Swiper(".slide_product", {
    slidesPerView:5,
    spaceBetween:20,
    autoplay:{
      delay:2500,
    },
    navigation:{
      nextEl:".swiper-button-next",
      prevEl:".swiper-button-prev"
    },
    loop:true,
    breakpoints:{
      1200:{
        slidesPerView : 6,
        spaceBetween : 20
      },
      1000:{
        slidesPerView : 4,
        spaceBetween : 20
      },
      700:{
        slidesPerView : 2,
         spaceBetween : 15
      },
      0:{
        slidesPerView : 2,
        spaceBetween: 9
      }
    }
  });







////////////

var swiper = new Swiper('.swipernostop', {
  loop: true,
  autoplay: {
      delay: 0, 
      disableOnInteraction: false
  },
  speed: 2000, 
  slidesPerView: "auto", 
  spaceBetween: 70, 
  freeMode: true, 

});