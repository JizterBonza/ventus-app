export interface SlideData {
  background: string;
  overlay: string;
  subtitle: string;
  title: string;
}

export interface SliderProps {
  slides: SlideData[];
  autoplay?: boolean;
  autoplayTimeout?: number;
  showDots?: boolean;
  showNavigation?: boolean;
  animateOut?: string;
}

