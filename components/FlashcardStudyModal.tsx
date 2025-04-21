'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'; // Assuming shadcn dialog
import { Button } from '@/components/ui/button';
import { Flashcard } from './Flashcard'; // Import the Flashcard component

interface FlashcardData {
  front: string;
  back: string;
}

interface FlashcardStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: FlashcardData[];
  deckTitle?: string; // Optional title for the modal
}

export const FlashcardStudyModal: React.FC<FlashcardStudyModalProps> = ({
  isOpen,
  onClose,
  flashcards = [], // Default to empty array
  deckTitle = 'Study Flashcards',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when modal opens or cards change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen, flashcards]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : flashcards.length - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex < flashcards.length - 1 ? prevIndex + 1 : 0
    );
  };

  const currentCard = flashcards[currentIndex];

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent> {/* Removed className */}
        <DialogHeader>
          <DialogTitle>{deckTitle}</DialogTitle>
          {flashcards.length > 0 && (
             <p className="text-sm text-muted-foreground">
               Card {currentIndex + 1} of {flashcards.length}
             </p>
          )}
        </DialogHeader>

        <div className="flex items-center justify-center py-8 min-h-[250px]">
          {flashcards.length > 0 && currentCard ? (
            <Flashcard
              key={currentIndex} // Re-added key to reset state on card change
              frontContent={currentCard.front}
              backContent={currentCard.back}
            />
          ) : (
            <p className="text-muted-foreground">No flashcards to display.</p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
           {flashcards.length > 1 && (
             <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={goToPrevious} aria-label="Previous card">
                   <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNext} aria-label="Next card">
                   <ArrowRight className="h-4 w-4" />
                </Button>
             </div>
           )}
           <DialogClose> {/* Removed asChild */}
             <Button type="button" variant="secondary">
               Close
             </Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};