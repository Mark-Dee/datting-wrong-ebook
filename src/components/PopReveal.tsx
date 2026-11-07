import React, { useEffect, useRef, useState } from 'react';

interface PopRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  yOffset?: number;
  scaleInitial?: number;
  threshold?: number;
  staggerChildren?: boolean;
}

/**
 * Scroll reveal component that makes elements "pop from down" when scrolled into view.
 * Provides a responsive, lively springy animation that feels tactile and alive.
 */
export const PopReveal: React.FC<PopRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  durationMs = 650,
  yOffset = 36,
  scaleInitial = 0.95,
  threshold = 0.12,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const currentEl = elementRef.current;
    if (!currentEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once popped in, keep it visible
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(currentEl);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div
      ref={elementRef}
      className={`transform-gpu ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateY(0px) scale(1)'
          : `translateY(${yOffset}px) scale(${scaleInitial})`,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
        // Lively spring overshoot cubic-bezier for a buoyant "pop"
        transitionTimingFunction: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};

export default PopReveal;
