import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Dimension for Gemini embedding model (e.g., embedding-001)
const embeddingDimension = 768;

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()), // Raw content (e.g., JSON string from BlockNote)
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    // Optional: Flag to track embedding status
    // isEmbedded: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),

  // New table to store document chunks and their embeddings for RAG
  documentChunks: defineTable({
    documentId: v.id("documents"),
    userId: v.string(), // Denormalized for efficient filtering in vector search
    textChunk: v.string(), // The actual text snippet
    embedding: v.array(v.float64()), // The vector embedding
  })
    // Index for vector search, filtering by user
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: embeddingDimension,
      filterFields: ["userId"], // Allow filtering searches by userId
    })
    // Optional: Index to easily find chunks for a specific document
    .index("by_document", ["documentId"]),

  // Table for Flashcard Decks
  flashcardDecks: defineTable({
    userId: v.string(),
    title: v.string(), // Name of the deck (e.g., "Chapter 5 Key Terms")
    description: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")), // Optional link back to source note
  }).index("by_user", ["userId"]),

  // Table for individual Flashcards
  flashcards: defineTable({
    deckId: v.id("flashcardDecks"),
    userId: v.string(), // Denormalized for easier querying
    front: v.string(), // Question or Term
    back: v.string(), // Answer or Definition
    sourceDocumentId: v.optional(v.id("documents")), // Optional link back to source note chunk/section
    // Fields for Spaced Repetition System (SRS) - Added later if implementing SRS
    // interval: v.optional(v.number()), // Days until next review
    // easeFactor: v.optional(v.float64()), // How easy the card is (e.g., 2.5 default)
    // dueDate: v.optional(v.number()), // Timestamp for next review
  })
    .index("by_deck", ["deckId"])
    .index("by_user", ["userId"]), // To fetch all user's cards if needed
});