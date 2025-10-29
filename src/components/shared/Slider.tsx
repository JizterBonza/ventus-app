import React, { useEffect, useRef } from 'react';
import { SliderProps } from '../../types/slider';

const Slider: React.FC<SliderProps> = ({
  slides,
  autoplay = true,
  autoplayTimeout = 5000,
  showDots = true,
  showNavigation = false,
  animateOut = 'fadeOut'
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const $ = (window as any).$;
    if ($ && $.fn.owlCarousel && sliderRef.current) {
      const $owl = $(sliderRef.current).find('.owl-carousel');
      
      // Destroy existing instance if any
      if ($owl.data('owl.carousel')) {
        $owl.trigger('destroy.owl.carousel');
        $owl.find('.owl-stage-outer').children().unwrap();
      }
      
      // Initialize Owl Carousel
      $owl.owlCarousel({
        items: 1,
        loop: true,
        dots: showDots,
        margin: 0,
        autoplay: autoplay,
        autoplayTimeout: autoplayTimeout,
        animateOut: animateOut,
        nav: showNavigation,
        navText: [
          '<i class="ti-angle-left" aria-hidden="true"></i>', 
          '<i class="ti-angle-right" aria-hidden="true"></i>'
        ],
        responsiveClass: true,
        responsive: {
          0: {
            dots: false,
            nav: false
          },
          600: {
            dots: false,
            nav: showNavigation
          },
          1000: {
            dots: showDots,
            nav: showNavigation
          }
        }
      });

      // Cleanup on unmount
      return () => {
        if ($owl.data('owl.carousel')) {
          $owl.trigger('destroy.owl.carousel');
        }
      };
    }
  }, [autoplay, autoplayTimeout, showDots, showNavigation, animateOut]);

  return (
    <header className="header slider-fade" ref={sliderRef}>
      <div className="owl-carousel owl-theme">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className="text-center item bg-img"
            data-overlay-dark={slide.overlay}
            style={{ backgroundImage: `url(${slide.background})` }}
          >
            <div className="v-middle caption">
              <div className="container">
                <div className="row">
                  <div className="col-md-10 offset-md-1">
                    <span>
                      <i className="star-rating"></i>
                      <i className="star-rating"></i>
                      <i className="star-rating"></i>
                      <i className="star-rating"></i>
                      <i className="star-rating"></i>
                    </span>
                    <h4>{slide.subtitle}</h4>
                    <h1>{slide.title}</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </header>
  );
};

export default Slider;

