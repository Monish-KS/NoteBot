"use server";

import { ActionCtx, action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api"; // Import internal API for calling other actions/queries
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel"; // Import Id and Doc types
// No need to import VectorSearchQuery, the return type is simpler

// Initialize the Google Generative AI client with the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY environment variable not set in Convex dashboard."
  );
}
const genAI = new GoogleGenerativeAI(apiKey);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Action to generate content using Gemini Pro (existing)
// Internal action containing the core logic for content generation
export const _generateContentInternal = internalAction({
  args: { prompt: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    console.log("Attempting to generate content with prompt:", args.prompt); // Log prompt
    try {
      // Use a currently available model like gemini-1.5-flash-latest
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const result = await model.generateContent(args.prompt);
      const response = result.response; // No await needed here
      const text = response.text();
      console.log("Received Gemini Raw Response Text:", text); // Log raw response
      return text;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Consider more specific error handling based on Gemini API errors
      throw new Error("Failed to generate content using Gemini.");
    }
  },
});

// Public action wrapper for content generation
export const generateContent = action({
  args: { prompt: v.string() },
  handler: async (ctx, args): Promise<string> => {
    // Simply call the internal action
    return await ctx.runAction(internal.ai._generateContentInternal, { prompt: args.prompt });
  },
});

// --- RAG Actions ---

// Internal action to generate embedding for a given text
export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, args): Promise<number[]> => {
    try {
      const result = await embeddingModel.embedContent(args.text);
      const embedding = result.embedding;
      if (!embedding || !embedding.values) {
        throw new Error("Failed to generate embedding.");
      }
      return embedding.values;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding.");
    }
  },
});

// Action to find relevant document chunks based on a query
// Internal action containing the core logic for searching relevant chunks
export const _searchRelevantChunksInternal = internalAction({
  args: { query: v.string(), userId: v.string(), numResults: v.number() }, // numResults required internally
  handler: async (
    ctx: ActionCtx,
    args: { query: string; userId: string; numResults: number }
  ): Promise<{ _id: Id<"documentChunks">; _score: number }[]> => {
    // 1. Generate embedding for the user's query
    const queryEmbedding: number[] = await ctx.runAction(internal.ai.generateEmbedding, {
      text: args.query,
    });

    // 2. Perform vector search
    const results = await ctx.vectorSearch(
      "documentChunks",
      "by_embedding",
      {
        vector: queryEmbedding,
        limit: args.numResults,
        filter: (q) => q.eq("userId", args.userId),
      }
    );
    return results;
  },
});

// Public action wrapper for searching relevant chunks
export const searchRelevantChunks = action({
  args: { query: v.string(), userId: v.string(), numResults: v.optional(v.number()) },
  handler: async (
    ctx: ActionCtx,
    args: { query: string; userId: string; numResults?: number | undefined }
  ): Promise<{ _id: Id<"documentChunks">; _score: number }[]> => {
    const numResults = args.numResults ?? 5; // Apply default here
    // Call the internal action
    return await ctx.runAction(internal.ai._searchRelevantChunksInternal, {
      query: args.query,
      userId: args.userId,
      numResults: numResults,
    });
  },
});

// Helper query to get a chunk by ID (used internally if needed)
export const getChunkById = internalQuery({
  args: { chunkId: v.id("documentChunks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

// --- RAG Q&A Action ---

export const askMyNotes = action({
  args: { query: v.string(), userId: v.string() },
  handler: async (ctx: ActionCtx, args: { query: string; userId: string }): Promise<string> => {
    console.log(`askMyNotes: Received query "${args.query}" for user ${args.userId}`);
    // 1. Find relevant document chunks for the user's query
    // 1. Find relevant document chunks using the *internal* search action
    const searchResults = await ctx.runAction(internal.ai._searchRelevantChunksInternal, {
      query: args.query,
      userId: args.userId,
      numResults: 5, // Adjust number of chunks to retrieve as needed
    });
    console.log(`askMyNotes: Found ${searchResults.length} relevant chunks.`);

    if (searchResults.length === 0) {
      console.log("askMyNotes: No relevant chunks found.");
      return "I couldn't find any relevant information in your notes to answer that question.";
    }

    // 2. Fetch the actual text content of the relevant chunks
    const chunkDocs = await Promise.all(
      // Add explicit type for 'result'
      searchResults.map(async (result: { _id: Id<"documentChunks">; _score: number }) => {
        // Use the existing internal query to get chunk details
        return await ctx.runQuery(internal.ai.getChunkById, { chunkId: result._id });
      })
    );
    console.log(`askMyNotes: Fetched ${chunkDocs.filter(Boolean).length} chunk documents.`);

    // Filter out any null results (shouldn't happen often) and extract text
    const contextText = chunkDocs
      // Add explicit type for 'doc' in filter and map
      .filter((doc: Doc<"documentChunks"> | null): doc is Doc<"documentChunks"> => doc !== null)
      .map((doc: Doc<"documentChunks">) => doc.textChunk)
      .join("\n\n---\n\n"); // Join chunks with a separator
    console.log("askMyNotes: Constructed context text:", contextText);

    // 3. Construct the prompt for Gemini
    const prompt = `Based *only* on the following context from the user's notes, answer the user's question. Cite the source of the information if possible (though source mapping isn't implemented here yet). Do not use any external knowledge. If the context doesn't contain the answer, say so.

Context from notes:
---
${contextText}
---

User's Question: ${args.query}

Answer:`;
    console.log("askMyNotes: Sending prompt to _generateContentInternal."); // Log before calling

    // 4. Call Gemini to generate the answer based on the context
    try {
      // Call the *internal* content generation action
      const answer = await ctx.runAction(internal.ai._generateContentInternal, { prompt });
      console.log("askMyNotes: Received answer from _generateContentInternal:", answer); // Log received answer
      // TODO: Post-process the answer if needed (e.g., add source links if we stored them)
      return answer;
    } catch (error) {
      console.error("Error generating answer in askMyNotes:", error);
      return "Sorry, I encountered an error trying to answer your question based on your notes.";
    }
  },
});


// --- Flashcard Generation Action ---

// Defines the expected structure for a generated flashcard pair
interface FlashcardPair {
  front: string;
  back: string;
}

export const generateFlashcardsFromText = action({
  // Takes text content and optionally the source document ID
  args: {
    textContent: v.string(),
    userId: v.string(), // Needed for potential future context/filtering
    sourceDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx: ActionCtx, args): Promise<FlashcardPair[]> => {
    if (!args.textContent.trim()) {
      console.log("No text content provided for flashcard generation.");
      return []; // Return empty array if no text
    }

    // Construct the prompt for Gemini
    const prompt = `Analyze the following text content from a user's notes. Identify key concepts, terms, definitions, or question/answer pairs suitable for creating flashcards. Generate a list of flashcards based on this text. Each flashcard should have a 'front' (question/term) and a 'back' (answer/definition).

Return the result ONLY as a valid JSON array of objects, where each object has a "front" and a "back" key. Example format: [{"front": "Example Question?", "back": "Example Answer."}]

Do not include any introductory text, explanations, or markdown formatting outside the JSON array itself.

Text Content:
---
${args.textContent}
---

JSON Array Output:`;

    try {
      // Call the internal content generation action
      const rawResponse = await ctx.runAction(internal.ai._generateContentInternal, { prompt });

      // Attempt to parse the JSON response from Gemini
      let flashcards: FlashcardPair[] = [];
      try {
        // Extract JSON content between ```json and ``` markers
        const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch || !jsonMatch[1]) {
          console.error("Could not find JSON block in Gemini response:", rawResponse);
          throw new Error("JSON block not found in AI response.");
        }
        const jsonString = jsonMatch[1].trim();
        console.log("Extracted JSON String:", jsonString); // Log the extracted string
        flashcards = JSON.parse(jsonString);

        // Basic validation (check if it's an array and objects have front/back)
        if (!Array.isArray(flashcards) || flashcards.some(card => typeof card.front !== 'string' || typeof card.back !== 'string')) {
           console.error("Gemini response was not a valid JSON array of flashcards:", jsonString); // Use jsonString here
           throw new Error("Invalid flashcard format received from AI.");
        }

      } catch (parseError) {
        console.error("Failed to parse flashcard JSON response from Gemini:", parseError);
        console.error("Raw Gemini Response:", rawResponse); // Log raw response for debugging
        // Optionally, try a fallback or return an error indicator
        // For now, return empty array on parse failure
         return [];
      }

      // TODO: Potentially add logic here to associate flashcards with sourceDocumentId if provided

      return flashcards;

    } catch (error) {
      console.error("Error generating flashcards:", error);
      // Return empty array or throw a more specific error
      return [];
    }
  },
});


// TODO: Implement action for Summarization
// export const summarizeNote = action({ ... });

// TODO: Implement action for Concept Mapping (if feasible via LLM)
// export const generateConceptMapData = action({ ... });