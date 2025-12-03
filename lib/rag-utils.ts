// Import Supabase client untuk server-side dan OpenAI client
import { createServerSupabaseClient } from "./supabase"
import OpenAI from "openai"

// Inisialisasi OpenAI client dengan API key dari environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Interface untuk hasil pencarian dokumen
export interface SearchResult {
  id: number
  content: string
  similarity: number
  metadata?: any
}

// Interface untuk chunk dokumen
export interface DocumentChunk {
  content: string
  embedding: number[]
  metadata?: any
}

/**
 * Generate embedding untuk teks yang diberikan menggunakan OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Panggil OpenAI API untuk generate embedding
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // Model embedding OpenAI
      input: text, // Teks yang akan di-embed
      encoding_format: "float", // Format encoding
    })
    
    // Return embedding array dari response
    return response.data[0].embedding
  } catch (error) {
    // Log error dan throw kembali
    console.error("Error generating embedding:", error)
    throw error
  }
}

/**
 * Search untuk dokumen serupa di Supabase menggunakan vector similarity
 */
export async function searchSimilarDocuments(
  query: string,
  threshold: number = 0.78, // Threshold similarity (default 0.78)
  limit: number = 5 // Jumlah maksimal dokumen yang diambil (default 5)
): Promise<SearchResult[]> {
  try {
    // Generate embedding untuk query
    const embedding = await generateEmbedding(query)
    
    // Buat Supabase client untuk server-side
    const supabase = createServerSupabaseClient()

    // Panggil function match_documents di Supabase untuk vector search
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding, // Embedding dari query
      match_threshold: threshold, // Threshold similarity
      match_count: limit, // Jumlah dokumen maksimal
    })

    // Jika ada error, log dan throw
    if (error) {
      console.error("Supabase search error:", error)
      throw error
    }

    // Return data hasil pencarian atau array kosong jika tidak ada
    return data || []
  } catch (error) {
    // Log error dan throw kembali
    console.error("Error searching documents:", error)
    throw error
  }
}

/**
 * Insert document chunks ke dalam Supabase dalam batch untuk menghindari rate limit
 */
export async function insertDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  try {
    // Buat Supabase client untuk server-side
    const supabase = createServerSupabaseClient()

    // Proses dalam batch untuk menghindari rate limit
    const batchSize = 5 // Ukuran batch
    for (let i = 0; i < chunks.length; i += batchSize) {
      // Ambil batch dari chunks
      const batch = chunks.slice(i, i + batchSize)
      
      // Insert batch ke tabel islamic_corpus
      const { error } = await supabase
        .from("islamic_corpus")
        .insert(
          batch.map(chunk => ({
            content: chunk.content, // Konten teks
            embedding: chunk.embedding, // Vector embedding
            metadata: chunk.metadata || {}, // Metadata tambahan
          }))
        )

      // Jika ada error dalam batch, log dan throw
      if (error) {
        console.error("Error inserting batch:", error)
        throw error
      }

      // Log progress batch
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
      
      // Rate limiting: tunggu 1 detik sebelum batch berikutnya
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  } catch (error) {
    // Log error dan throw kembali
    console.error("Error inserting document chunks:", error)
    throw error
  }
}

/**
 * Clean dan preprocess teks untuk menghilangkan karakter yang tidak diinginkan
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces dengan single space
    .replace(/\n+/g, "\n") // Replace multiple newlines dengan single newline
    .replace(/[^\w\s\n.,!?;:()[\]{}"'\-–—…]/g, "") // Remove special characters tapi keep basic punctuation
    .trim() // Trim whitespace di awal dan akhir
}

/**
 * Split teks menjadi chunks dengan overlap untuk mempertahankan konteks
 */
export function splitIntoChunks(
  text: string,
  maxChunkSize: number = 1000, // Ukuran maksimal chunk (default 1000 karakter)
  overlap: number = 200 // Overlap antar chunk (default 200 karakter)
): string[] {
  const chunks: string[] = []
  let start = 0

  // Loop untuk membuat chunks
  while (start < text.length) {
    let end = start + maxChunkSize

    // Jika ini bukan chunk terakhir, coba break di sentence boundary
    if (end < text.length) {
      // Cari titik terdekat dalam range 100 karakter sebelum end
      const nextPeriod = text.indexOf(".", end - 100)
      const nextNewline = text.indexOf("\n", end - 100)
      
      // Jika ada titik dalam range yang wajar, gunakan sebagai break point
      if (nextPeriod > end - 100 && nextPeriod < end + 100) {
        end = nextPeriod + 1
      } else if (nextNewline > end - 100 && nextNewline < end + 100) {
        // Jika ada newline dalam range yang wajar, gunakan sebagai break point
        end = nextNewline + 1
      }
    }

    // Ambil chunk dari start sampai end
    const chunk = text.slice(start, end).trim()
    
    // Hanya tambahkan chunk jika panjangnya lebih dari 50 karakter (meaningful content)
    if (chunk.length > 50) {
      chunks.push(chunk)
    }

    // Set start untuk chunk berikutnya dengan overlap
    start = end - overlap
    if (start >= text.length) break
  }

  return chunks
}

/**
 * Process dokumen teks dan siapkan untuk insertion ke database
 */
export async function processDocument(
  content: string,
  metadata: any = {} // Metadata tambahan untuk dokumen
): Promise<DocumentChunk[]> {
  // Clean teks dari karakter yang tidak diinginkan
  const cleanedText = cleanText(content)
  
  // Split teks menjadi chunks dengan overlap
  const chunks = splitIntoChunks(cleanedText, 1000, 200)
  
  const documentChunks: DocumentChunk[] = []
  
  // Loop untuk setiap chunk dan generate embedding
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    // Generate embedding untuk chunk ini
    const embedding = await generateEmbedding(chunk)
    
    // Tambahkan chunk ke array dengan metadata
    documentChunks.push({
      content: chunk, // Konten teks chunk
      embedding, // Vector embedding
      metadata: {
        ...metadata, // Metadata dari parameter
        chunk_index: i, // Index chunk dalam dokumen
        total_chunks: chunks.length, // Total jumlah chunks
      },
    })
  }
  
  return documentChunks
}

/**
 * Get statistik dokumen dari Supabase
 */
export async function getDocumentStats(): Promise<{
  totalDocuments: number
  totalChunks: number
}> {
  try {
    // Buat Supabase client untuk server-side
    const supabase = createServerSupabaseClient()
    
    // Query untuk mendapatkan count total dokumen
    const { count, error } = await supabase
      .from("islamic_corpus")
      .select("*", { count: "exact", head: true })

    // Jika ada error, log dan throw
    if (error) {
      console.error("Error getting document stats:", error)
      throw error
    }

    // Return statistik dokumen
    return {
      totalDocuments: count || 0,
      totalChunks: count || 0, // Dalam kasus ini, setiap row adalah chunk
    }
  } catch (error) {
    // Log error dan throw kembali
    console.error("Error getting document stats:", error)
    throw error
  }
}

/**
 * Hapus semua dokumen dari corpus (untuk reset database)
 */
export async function clearCorpus(): Promise<void> {
  try {
    // Buat Supabase client untuk server-side
    const supabase = createServerSupabaseClient()
    
    // Delete semua records dari tabel islamic_corpus
    const { error } = await supabase
      .from("islamic_corpus")
      .delete()
      .neq("id", 0) // Delete all records (condition yang selalu true)

    // Jika ada error, log dan throw
    if (error) {
      console.error("Error clearing corpus:", error)
      throw error
    }

    // Log success
    console.log("Corpus cleared successfully")
  } catch (error) {
    // Log error dan throw kembali
    console.error("Error clearing corpus:", error)
    throw error
  }
}
