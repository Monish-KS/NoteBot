"use server";

import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// --- Flashcard Deck Mutations ---

export const createDeck = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Cannot create deck.");
    }
    const userId = identity.subject;

    const deckId = await ctx.db.insert("flashcardDecks", {
      userId,
      title: args.title,
      description: args.description,
      sourceDocumentId: args.sourceDocumentId,
    });

    return deckId;
  },
});

// TODO: Add mutations for updating and deleting decks if needed

// --- Flashcard Mutations ---

// Type for a single flashcard input
const flashcardInput = v.object({
  front: v.string(),
  back: v.string(),
});

export const addFlashcardsToDeck = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    flashcards: v.array(flashcardInput), // Array of {front, back} objects
    sourceDocumentId: v.optional(v.id("documents")), // Optional source for all cards
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Cannot add flashcards.");
    }
    const userId = identity.subject;

    // Verify the user owns the deck (optional but good practice)
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found or user unauthorized.");
    }

    // Insert each flashcard
    // Consider batching if inserting a very large number, but Promise.all is usually fine
    const insertPromises = args.flashcards.map((card) =>
      ctx.db.insert("flashcards", {
        deckId: args.deckId,
        userId: userId, // Denormalized userId
        front: card.front,
        back: card.back,
        sourceDocumentId: args.sourceDocumentId, // Apply same source to all added cards
        // Initialize SRS fields to null/defaults if added to schema
      })
    );

    await Promise.all(insertPromises);

    // Return the number of cards added, or deckId, or void
    return { count: args.flashcards.length };
  },
});

// TODO: Add mutations for updating and deleting individual flashcards if needed

// --- Flashcard Queries ---

export const getDecks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty array or throw error depending on desired public/private behavior
      return [];
      // throw new Error("Unauthenticated: Cannot get decks.");
    }
    const userId = identity.subject;

    const decks = await ctx.db
      .query("flashcardDecks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc") // Or order by title, etc.
      .collect();

    return decks;
  },
});

export const getFlashcardsForDeck = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Decide if non-owners can see cards - likely not
      throw new Error("Unauthenticated: Cannot get flashcards.");
    }
    const userId = identity.subject;

    // Optional: Verify user owns the deck before returning cards
    const deck = await ctx.db.get(args.deckId);
     if (!deck || deck.userId !== userId) {
       // Return empty or throw, depending on how you handle unauthorized access
       console.warn(`Unauthorized attempt to access deck ${args.deckId} by user ${userId}`);
       return [];
       // throw new Error("Deck not found or user unauthorized.");
     }

    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      // No specific order needed usually, but could add .order("asc") by _creationTime
      .collect();

    return flashcards;
  },
});