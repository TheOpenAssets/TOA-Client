// src/components/FadeIn.tsx
"use client"; // If using Next.js App Router

import { useEffect, useRef, useState, type ReactNode } from "react";

interface FadeInProps {
    children: ReactNode;
    delay?: number; // Optional delay for staggered effects
    className?: string; // Allow merging extra classes
}

const FadeIn = ({ children, delay = 0, className = "" }: FadeInProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // When the section comes into view (isIntersecting is true)
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Optional: Once visible, stop observing to improve performance
                    // and prevent it from fading out again.
                    if (ref.current) observer.unobserve(ref.current);
                }
            },
            {
                threshold: 0.1, // Trigger when 10% of the element is visible
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-in-out transform ${isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default FadeIn;