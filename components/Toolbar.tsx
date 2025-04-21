'use client';

import React, { ElementRef, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react"; // Import useUser to get userId
import { ImageIcon, Smile, X, Layers } from "lucide-react"; // Add Layers icon
import { useMutation, useAction } from "convex/react"; // Add useAction
import TextAreaAutoSize from 'react-textarea-autosize'

import { useConverImage } from "@/hooks/use-cover-image"
import { Doc } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"

import { IconPicker } from "./icon-picker";
import { FlashcardStudyModal } from "./FlashcardStudyModal"; // Import the modal

interface ToolbarProps {
  initialData:Doc<'documents'>
  preview?:boolean
}

export function Toolbar ({initialData,preview}:ToolbarProps) {

  const inputRef = useRef<ElementRef<'textarea'>>(null)
  const [isEditing,setIsEditing] = useState(false)
  const [value, setValue] = useState(initialData.title);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false); // Restore state declaration
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<{ front: string; back: string }[]>([]);
  // Removed duplicated state declaration for isGeneratingCards

  const update = useMutation(api.documents.update)
  const removeIcon = useMutation(api.documents.removeIcon);
  const generateFlashcardsAction = useAction(api.ai.generateFlashcardsFromText); // Action hook
  const { user } = useUser(); // Get user object for ID

  const coverImage = useConverImage();

  const enableInput = () => {
    if (preview) return

    setIsEditing(true)
    setTimeout(() => {
      setValue(initialData.title)
      inputRef.current?.focus()
    },0)
  }

  const disableInput = () => setIsEditing(false)

  const onInput = (value:string) => {
    setValue(value)
    update({
      id:initialData._id,
      title:value || 'Untitled'
    })
  }

  const onKeyDown = (event:React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      disableInput()
    }
  }

  const onIconSelect = (icon:string) => {
    update({
      id:initialData._id,
      icon,
    })
  }

  const onRemoveIcon = () => {
    removeIcon({
      id:initialData._id
    })
  };
  
    // Handler for generating flashcards
    const onGenerateFlashcards = async () => {
      if (preview || !initialData.content || isGeneratingCards || !user?.id) return;
  
      setIsGeneratingCards(true);
      setGeneratedCards([]); // Clear previous cards
      setShowFlashcardModal(false); // Ensure modal is closed initially
      console.log("Generating flashcards for document:", initialData._id);
  
      try {
        // Pass the raw content string, document ID, and user ID
        const flashcards = await generateFlashcardsAction({
          textContent: initialData.content,
          sourceDocumentId: initialData._id,
          userId: user.id, // Use actual user ID
        });
        console.log("Generated Flashcards:", flashcards);
  
        if (flashcards && flashcards.length > 0) {
          setGeneratedCards(flashcards);
          setShowFlashcardModal(true); // Open the modal with the new cards
        } else {
           alert("No flashcards could be generated from this note's content.");
        }
      } catch (error) {
        console.error("Failed to generate flashcards:", error);
        alert("Error generating flashcards. Check console for details.");
      } finally {
        setIsGeneratingCards(false);
      }
    }; // End of onGenerateFlashcards handler

  // Prepare conditionally rendered elements before return
  const addIconButton = !initialData.icon && !preview ? (
    <IconPicker asChild onChange={onIconSelect}>
      <Button className="text-muted-foreground text-xs" variant='outline' size='sm'>
        <Smile className="w-4 h-4 mr-2"/> Add icon
      </Button>
    </IconPicker>
  ) : null;

  const addCoverButton = !initialData.coverImage && !preview ? (
     <Button className="text-muted-foreground text-xs" variant='outline' size='sm' onClick={coverImage.onOpen}>
       <ImageIcon className="w-4 h-4 mr-2"/> Add cover
     </Button>
  ) : null;

  const generateFlashcardsButton = !preview && !!initialData.content ? (
     <Button
       onClick={onGenerateFlashcards}
       disabled={isGeneratingCards}
       className="text-muted-foreground text-xs"
       variant='outline'
       size='sm'
     >
       <Layers className="w-4 h-4 mr-2"/>
       {isGeneratingCards ? "Generating..." : "Generate Flashcards"}
     </Button>
  ) : null;

  const titleDisplay = isEditing && !preview ? (
    <TextAreaAutoSize
      className="text-5xl bg-transparent font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF] resize-none"
      ref={inputRef}
      onBlur={disableInput}
      onKeyDown={onKeyDown}
      value={value}
      onChange={e => onInput(e.target.value)}
    />
  ) : (
    <div
      className="pb-[11.5px] text-5xl font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF]"
      onClick={enableInput}
    >
      {initialData.title}
    </div>
  );

  return (
     <> {/* Use Fragment to wrap Toolbar and Modal */}
       <div className="pl-[54px] group relative">
         {/* Icon display logic */}
         {!!initialData.icon && !preview && (
           <div className="flex gap-x-2 items-center group/icon pt-6">
             {/* Wrap the trigger element (<p>) inside IconPicker */}
             <IconPicker onChange={onIconSelect}>
               <p className="text-6xl hover:opacity-75 transition cursor-pointer"> {/* Added cursor-pointer */}
                 {initialData.icon}
               </p>
             </IconPicker>
             <Button className="rounded-full opacity-0 group-hover/icon:opacity-100 transition text-muted-foreground text-xs" variant='outline' size='icon' onClick={onRemoveIcon}>
               <X className="w-4 h-4"/>
             </Button>
           </div>
         )}
         {!!initialData.icon && preview && (
           <p className="text-6xl pt-6">{initialData.icon}</p>
         )}

         {/* Hover menu for buttons */}
         {/* Hover menu for buttons - Render pre-defined variables */}
         <div className="opacity-0 group-hover:opacity-100 flex items-center gap-x-1 py-4">
           {addIconButton}
           {addCoverButton}
           {generateFlashcardsButton}
         </div>

         {/* Title display/edit logic */}
         {/* Title display/edit logic - Render pre-defined variable */}
         {titleDisplay}
       </div>

       {/* Render the Modal outside the main toolbar div */}
       <FlashcardStudyModal
         isOpen={showFlashcardModal}
         onClose={() => setShowFlashcardModal(false)}
         flashcards={generatedCards}
         deckTitle={`Study: ${initialData.title}`}
       />
     </>
   ); // Correct closing parenthesis for return statement
} // Correct closing brace for Toolbar component function