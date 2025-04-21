'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface FlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string; // Allow passing additional styles
}

export const Flashcard: React.FC<FlashcardProps> = ({
  frontContent,
  backContent,
  className,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className={cn(
        'flashcard-container perspective w-80 h-52 cursor-pointer', // Adjust size as needed
        className
      )}
      onClick={handleFlip}
    >
      <div
        className={cn(
          'flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d',
          isFlipped ? 'rotate-y-180' : ''
        )}
      >
        {/* Front Face */}
        <div className="flashcard-face flashcard-front absolute w-full h-full backface-hidden border rounded-lg shadow-md flex items-center justify-center p-4 bg-card text-card-foreground">
          <div>{frontContent}</div>
        </div>

        {/* Back Face */}
        <div className="flashcard-face flashcard-back absolute w-full h-full backface-hidden border rounded-lg shadow-md flex items-center justify-center p-4 bg-card text-card-foreground rotate-y-180">
          <div>{backContent}</div>
        </div>
      </div>
    </div>
  );
};

// Add necessary CSS for the 3D flip effect in your global CSS (e.g., app/globals.css)
/*
.perspective {
  perspective: 1000px;
}
.transform-style-preserve-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden; // For Safari
}
.rotate-y-180 {
  transform: rotateY(180deg);
}
*/