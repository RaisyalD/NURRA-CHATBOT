import { NextRequest, NextResponse } from "next/server"
import { 
  processDocument, 
  insertDocumentChunks, 
  getDocumentStats, 
  clearCorpus,
  searchSimilarDocuments 
} from "@/lib/rag-utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    switch (action) {
      case "stats":
        const stats = await getDocumentStats()
        return NextResponse.json(stats)

      case "search":
        const query = searchParams.get("q")
        if (!query) {
          return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
        }
        const results = await searchSimilarDocuments(query)
        return NextResponse.json(results)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("RAG API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, content, metadata } = await request.json()

    switch (action) {
      case "upload":
        if (!content) {
          return NextResponse.json(
            { error: "Content is required" },
            { status: 400 }
          )
        }

        const chunks = await processDocument(content, metadata || {})
        await insertDocumentChunks(chunks)

        return NextResponse.json({
          message: "Document uploaded successfully",
          chunksProcessed: chunks.length,
        })

      case "clear":
        await clearCorpus()
        return NextResponse.json({
          message: "Corpus cleared successfully",
        })

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("RAG API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
