import { v } from "convex/values";
import { ActionCtx, internalAction, internalMutation, internalQuery, mutation, MutationCtx, query, QueryCtx, DatabaseWriter } from "./_generated/server"; // Add DatabaseWriter for scheduler type
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api"; // Import internal API

export const archive = mutation({
  args:{id:v.id("documents")},
  handler:async (context,args) => {
   const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Not authenticated")
    }

    const userId = identity.subject
    
    const existingDocument = await context.db.get(args.id)

    if (!existingDocument) {
      throw new Error('Not found')
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const recursiveArchive = async (documentId:Id<'documents'>) => {
      const children = await context.db
      .query('documents')
      .withIndex("by_user_parent",q => (
        q.eq("userId",userId).eq('parentDocument',documentId)
      ))
      .collect()
    
      for (const child of children) {
        await context.db.patch(child._id,{
          isArchived:true
        })
        await recursiveArchive(child._id)
      }
    }

    const document = await context.db.patch(args.id,{
      isArchived:true
    })

    recursiveArchive(args.id)

    return document
  }
});

// --- Helper Functions for Embedding ---

// Placeholder: Extracts plain text from BlockNote JSON string
// TODO: Implement actual BlockNote JSON parsing logic
function extractTextFromBlockNoteJson(contentJson?: string): string {
  if (!contentJson) return "";
  try {
    // Super basic placeholder: assumes content is just text or stringifies JSON
    // A real implementation needs to traverse the BlockNote structure
    const content = JSON.parse(contentJson);
    if (typeof content === "string") return content;
    // Very naive text extraction from block-like structure
    if (Array.isArray(content)) {
       return content.map(block => block?.content?.[0]?.text || '').join('\n\n');
    }
    return JSON.stringify(content); // Fallback
  } catch (e) {
    console.error("Failed to parse BlockNote JSON:", e);
    return ""; // Return empty string on error
  }
}

// Splits text into chunks of a target size with overlap
function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end));
    i += chunkSize - overlap;
    if (i < 0) i = end; // Prevent infinite loop with large overlap
  }
  return chunks;
}

// --- Internal Mutations for Embedding Management ---

// Internal mutation to delete all chunks associated with a document
export const deleteChunksForDocument = internalMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx: MutationCtx, args: { documentId: Id<"documents"> }) => {
    const existingChunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    await Promise.all(existingChunks.map((chunk) => ctx.db.delete(chunk._id)));
    console.log(`Deleted ${existingChunks.length} old chunks for ${args.documentId}.`);
  },
});

// Internal mutation to insert a single document chunk with its embedding
export const insertChunk = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    textChunk: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.insert("documentChunks", {
      documentId: args.documentId,
      userId: args.userId,
      textChunk: args.textChunk,
      embedding: args.embedding,
    });
  },
});

// --- Internal Action for Embedding Process ---

// Internal ACTION to handle the embedding process for a document
export const embedDocumentContent = internalAction({
  args: { documentId: v.id("documents"), userId: v.string() },
  // Note: ctx type is now ActionCtx
  handler: async (ctx: ActionCtx, args: { documentId: Id<"documents">; userId: string }) => {
    // Cannot use ctx.db directly in actions, need to query if necessary
    // Let's assume we get the content passed in or fetch via a query if needed.
    // For simplicity, let's fetch it here using runQuery.
    const document = await ctx.runQuery(internal.documents.getDocumentContentInternal, { documentId: args.documentId });

    if (!document || !document.content) {
      console.log(`Document ${args.documentId} has no content to embed.`);
      return; // Nothing to embed
    }

    // 1. Extract text
    const textContent = extractTextFromBlockNoteJson(document.content);
    if (!textContent.trim()) {
      console.log(`Extracted text for ${args.documentId} is empty.`);
      return; // Nothing to embed
    }

    // 2. Chunk text
    const textChunks = chunkText(textContent); // Use default chunk/overlap

    // 3. Clear existing chunks for this document (important for updates)
    // Call the internal mutation to delete chunks
    await ctx.runMutation(internal.documents.deleteChunksForDocument, {
       documentId: args.documentId
    });


    // 4. Generate embeddings and store new chunks
    let chunksStored = 0;
    for (const chunk of textChunks) {
      try {
        // Call the action in ai.ts to get embedding
        const embedding = await ctx.runAction(internal.ai.generateEmbedding, {
          text: chunk,
        });
        // Call the internal mutation to insert the chunk
        await ctx.runMutation(internal.documents.insertChunk, {
           documentId: args.documentId,
           userId: args.userId, // Store userId for filtering
           textChunk: chunk,
           embedding: embedding,
        });
        // Removed incorrect nested definition of getDocumentContentInternal from here
        chunksStored++;
      } catch (error) {
        console.error(
          `Failed to embed chunk for document ${args.documentId}:`,
          error
        );
        // Decide if you want to stop or continue on error
      }
    }
    console.log(`Stored ${chunksStored} new chunks for ${args.documentId}.`);
  },
});

// Helper internal query needed by the embedding action to get document content
export const getDocumentContentInternal = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx: QueryCtx, args: { documentId: Id<"documents"> }): Promise<Doc<"documents"> | null> => {
    return await ctx.db.get(args.documentId);
  },
});

// --- End Helper Functions / Internal Queries ---

export const getSidebar = query({
  args:{
    parentDocument:v.optional(v.id("documents"))
  },
  handler:async (context,args) => {
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Not authenticated")
    }

    const userId = identity.subject

    const documents = await context.db
    .query("documents")
    .withIndex("by_user_parent",(q) => q.eq('userId',userId)
    .eq('parentDocument',args.parentDocument))
    .filter(q => q.eq(q.field("isArchived"),false))
    .order('desc')
    .collect()

    return documents
  }
})

export const create = mutation({
  args:{
    title:v.string(),
    parentDocument:v.optional(v.id('documents'))
  },
  handler:async (ctx,args) => { // Changed context to ctx for consistency
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject

    const document = await ctx.db.insert('documents',{
      title:args.title,
      parentDocument:args.parentDocument,
      userId,
      isArchived:false,
      isPublished:false,
      // Initialize content as null or empty if needed for embedding trigger
      // content: "" // Or null, depending on schema/preference
    })

    // Schedule the embedding action immediately after creation
    // Note: create doesn't have content yet, embedding might be better triggered by update
    // If you want to embed based on title or initial state, adjust embedDocumentContent
    // For now, let's assume embedding happens *only* when content is added/updated via the 'update' mutation.
    // If embedding on create is desired based on title/etc., uncomment below:
    // await ctx.scheduler.runAfter(0, internal.documents.embedDocumentContent, {
    //   documentId: document._id, // Use the ID of the created document
    //   userId: userId,
    // });


    return document
  }
})

export const getTrash = query({
  handler:async (context) => {
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject

    const documents = await context.db.query('documents')
    .withIndex('by_user',q => q.eq('userId',userId))
    .filter(q => q.eq(q.field('isArchived'),true))
    .order('desc')
    .collect()

    return documents
  }
})

export const restore = mutation({
  args:{id:v.id('documents')},
  handler: async (context,args) => {
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject

    const existingDocument = await context.db.get(args.id)

    if (!existingDocument) {
      throw new Error('Not found')
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const recursiveRestore = async (documentId:Id<'documents'>) => {
      const children = await context.db.query('documents')
      .withIndex('by_user_parent',q => (
        q.eq('userId',userId).eq('parentDocument',documentId)
      ))
      .collect()

      for (const child of children) {
        await context.db.patch(child._id,{
          isArchived:false
        })

        await recursiveRestore(child._id)
      }
    }

    const options:Partial<Doc<'documents'>> = {
      isArchived:false
    }

    if (existingDocument.parentDocument) {
      const parent = await context.db.get(existingDocument.parentDocument)
      if (parent?.isArchived) {
        options.parentDocument = undefined
      }
    }

    const document = await context.db.patch(args.id,options)

    recursiveRestore(args.id)

    return document
  }
})


export const remove = mutation({
  args:{id:v.id('documents')},
  handler:async (context,args) => {

    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject

    const existingDocument = await context.db.get(args.id)

    if (!existingDocument) {
      throw new Error('Not found')
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const document = await context.db.delete(args.id)

    return document
  }
})

export const getSearch = query({
  handler:async (context) => {
   
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject
    
    const documents = await context.db.query('documents')
    .withIndex('by_user',q => q.eq('userId',userId))
    .filter(q => q.eq(q.field('isArchived'),false))
    .order('desc')
    .collect()

    return documents
  }
})

export const getById = query({
  args:{documentId:v.id('documents')},
  handler:async (context,args) => {
    const identity = await context.auth.getUserIdentity()

    const document = await context.db.get(args.documentId)

    if (!document) {
      throw new Error("Not found")
    }

    if (document.isPublished && !document.isArchived) {
      return document
    }

    if (!identity) {
      throw new Error("Not authenticated")
    }

    const userId = identity.subject

    if (document.userId !== userId)  {
      throw new Error("Unauthorized")
    }
    
    return document
  }
})


export const update = mutation({
  args:{
    id:v.id('documents'),
    title:v.optional(v.string()),
    content:v.optional(v.string()),
    coverImage:v.optional(v.string()),
    icon:v.optional(v.string()),
    isPublished:v.optional(v.boolean())
  },
  handler:async (ctx,args) => { // Changed context to ctx
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Unauthenticated")
    }

    const userId = identity.subject

    const {id,...rest} = args

    const existingDocument = await ctx.db.get(args.id)

    if (!existingDocument) {
      throw new Error("Not found")
    }

    if (existingDocument.userId !== userId) {
      throw new Error('Unauthorized')
    }

    const document = await ctx.db.patch(args.id,{
      ...rest
    })

    // Check if the 'content' field was part of the update
    if (args.content !== undefined) {
       // Schedule the embedding action immediately after update
       await ctx.scheduler.runAfter(0, internal.documents.embedDocumentContent, {
         documentId: args.id,
         userId: userId,
       });
    }

    return document
  }
})


export const removeIcon = mutation({
  args:{id:v.id('documents')},
  handler:async (context,args) => {
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Unauthenticated")
    }

    const userId = identity.subject

     const existingDocument = await context.db.get(args.id)

    if (!existingDocument) {
      throw new Error('Not found')
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const document = await context.db.patch(args.id,{
      icon:undefined
    })

    return document
  } 
})

export const removeCoverImage = mutation({
  args:{id:v.id('documents')},
  handler:async (context,args) => {
    const identity = await context.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Unauthenticated")
    }

    const userId = identity.subject

    const existingDocument = await context.db.get(args.id)

    if (!existingDocument) {
      throw new Error('Not found')
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized")
    }

    const document = await context.db.patch(args.id,{
      coverImage:undefined
    })

    return document
  }
})