'use client'

import {File} from 'lucide-react'
import { useMutation, useQuery, useAction } from "convex/react"; // Import useAction
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/clerk-react"
import { BrainCircuit } from 'lucide-react'; // Icon for AI
import {CommandDialog,CommandEmpty,
  CommandGroup,CommandInput,
  CommandItem,CommandList} from '@/components/ui/command'
import { useSearch } from "@/hooks/use-search"
import { api } from "@/convex/_generated/api"
import { useEffect, useState, useCallback } from "react" // Import useCallback

export function SearchCommand () {

  const {user} = useUser()
  const router = useRouter()
  const documents = useQuery(api.documents.getSearch)
  const [isMounted, setIsMounted] = useState(false);
  const [query, setQuery] = useState(""); // State for the input query
  const [aiAnswer, setAiAnswer] = useState<string | null>(null); // State for the AI answer
  const [isLoadingAi, setIsLoadingAi] = useState(false); // State for AI loading

  const askAiAction = useAction(api.ai.askMyNotes); // Hook for the askMyNotes action

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch(store => store.onClose)

  useEffect(() => {
    setIsMounted(true)
  },[])

  useEffect(() => {
    const down = (e:KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown',down)
    return () => document.removeEventListener('keydown',down)
  },[toggle])

  const onSelect = (id:string) => {
    router.push(`/documents/${id}`)
    onClose()
  }

  if (!isMounted) {
    return null
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder={`Ask or search ${user?.fullName}'s Notebot...`}
        value={query}
        onValueChange={setQuery} // Update query state on input change
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && query.trim().length > 0 && user?.id) {
            e.preventDefault(); // Prevent default form submission/newline
            setIsLoadingAi(true);
            setAiAnswer(null); // Clear previous answer
            try {
              const answer = await askAiAction({ query: query, userId: user.id });
              setAiAnswer(answer);
            } catch (error) {
              console.error("Error asking AI:", error);
              setAiAnswer("Sorry, an error occurred while asking AI.");
            } finally {
              setIsLoadingAi(false);
            }
          }
        }}
      />
      <CommandList>
        {isLoadingAi && (
           <div className="p-4 text-sm text-muted-foreground">Asking AI...</div>
        )}
        {/* Display AI answer directly in CommandList if available */}
        {aiAnswer && !isLoadingAi && (
           <div className="p-4 whitespace-pre-wrap text-sm border-t mt-2"> {/* Added border/margin for separation */}
             <p className="text-xs font-semibold text-muted-foreground mb-2">Answer from your notes:</p> {/* Manual heading */}
             {aiAnswer}
           </div>
        )}
        {!aiAnswer && !isLoadingAi && (
          <>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Documents'>
              {documents?.map(document => (
                <CommandItem key={document._id} value={`${document._id}-${document.title}`}
                title={document.title} onSelect={() => onSelect(document._id)}> {/* Ensure onSelect gets ID */}
                  {document.icon ? (
                    <p className="mr-2 text-[18px]">
                      {document.icon}
                    </p>
                  ) : (
                    <File className="w-4 h-4 mr-2"/>
                  )}
                  <span>
                    {document.title}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
)
}