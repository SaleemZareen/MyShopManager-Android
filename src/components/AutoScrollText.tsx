import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

export interface AutoScrollTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  speed?: number; // Pixels per second (default: 35)
  pauseDuration?: number; // Total pause time in seconds (default: 3.0 = 1.5s start + 1.5s end)
  dir?: 'ltr' | 'rtl' | 'auto';
  isUrdu?: boolean;
  as?: React.ElementType;
  title?: string;
}

// Regex to detect Arabic/Urdu unicode range
const ARABIC_URDU_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const AutoScrollText: React.FC<AutoScrollTextProps> = ({
  children,
  className = '',
  containerClassName = '',
  speed = 35,
  pauseDuration = 3.0,
  dir = 'auto',
  isUrdu,
  as: Component = 'span',
  title,
  style,
  ...rest
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);

  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const [scrollDistance, setScrollDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(5);
  const [effectiveDir, setEffectiveDir] = useState<'ltr' | 'rtl'>('ltr');
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Extract raw text for title tooltip / accessibility if string
  const rawText = useMemo(() => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    return undefined;
  }, [children]);

  // Determine direction
  const computeDirection = useCallback((): 'ltr' | 'rtl' => {
    if (dir === 'rtl' || isUrdu === true) return 'rtl';
    if (dir === 'ltr') return 'ltr';
    if (rawText && ARABIC_URDU_REGEX.test(rawText)) return 'rtl';
    if (containerRef.current) {
      const computed = window.getComputedStyle(containerRef.current);
      if (computed.direction === 'rtl') return 'rtl';
    }
    if (document.documentElement.dir === 'rtl') return 'rtl';
    return 'ltr';
  }, [dir, isUrdu, rawText]);

  // Measure overflow and recalculate scroll metrics
  const measure = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) {
      setIsOverflowing(false);
      setScrollDistance(0);
      return;
    }

    const containerWidth = container.getBoundingClientRect().width;
    const contentWidth = content.getBoundingClientRect().width;
    const overflow = contentWidth - containerWidth;

    if (overflow > 2 && containerWidth > 10) {
      const dist = Math.ceil(overflow);
      const moveTime = dist / Math.max(speed, 15);
      const totalTime = Math.max(3.5, moveTime + pauseDuration);

      setScrollDistance(dist);
      setDuration(parseFloat(totalTime.toFixed(2)));
      setEffectiveDir(computeDirection());
      setIsOverflowing(true);
    } else {
      setIsOverflowing(false);
      setScrollDistance(0);
    }
  }, [computeDirection, speed, pauseDuration]);

  // Setup ResizeObserver on both container and content
  useEffect(() => {
    measure();

    const container = containerRef.current;
    const content = contentRef.current;

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });

      if (container) resizeObserver.observe(container);
      if (content) resizeObserver.observe(content);
    }

    // Window resize / orientation change listener
    const handleResize = () => {
      measure();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [measure, children, isUrdu]);

  // Setup IntersectionObserver to pause animation when off-screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const tooltipTitle = title || (isOverflowing ? rawText : undefined);

  return (
    <Component
      ref={containerRef as any}
      title={tooltipTitle}
      className={`inline-flex max-w-full min-w-0 overflow-hidden align-middle select-none relative ${containerClassName}`}
      style={{
        ...style,
        // CSS variables for GPU-accelerated keyframe animation
        ['--scroll-distance' as any]: `${scrollDistance}px`,
        ['--scroll-duration' as any]: `${duration}s`,
      }}
      {...rest}
    >
      <span
        ref={contentRef}
        className={`whitespace-nowrap inline-block shrink-0 transition-transform ${
          isOverflowing && isVisible
            ? effectiveDir === 'rtl'
              ? 'animate-autoscroll-rtl'
              : 'animate-autoscroll-ltr'
            : ''
        } ${className}`}
      >
        {children}
      </span>
    </Component>
  );
};

export default AutoScrollText;
