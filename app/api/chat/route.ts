// Import library yang diperlukan untuk AI SDK dan streaming
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { createServerSupabaseClient } from "@/lib/supabase"
import OpenAI from "openai"

// Inisialisasi OpenAI client dengan API key dari environment
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Handler untuk POST request ke endpoint /api/chat
export async function POST(req: Request) {
  try {
    // Parse URL untuk mendapatkan query parameters
    const url = new URL(req.url)
    // Cek apakah request non-streaming (untuk debug)
    const nonstream = url.searchParams.get("nonstream") === "1"
    // Cek apakah request ping (untuk health check)
    const ping = url.searchParams.get("ping") === "1"

    // Path debug cepat: verifikasi API route merespons
    if (ping) {
      return new Response(JSON.stringify({ ok: true, message: "chat api alive" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Parse body request untuk mendapatkan array messages
    const { messages } = await req.json()
    // Ambil pesan terakhir dari user
    const userMessage = messages[messages.length - 1]?.content

    // Validasi: jika tidak ada pesan user, return error
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Generate embedding untuk query user (best-effort)
    let queryEmbedding: number[] | null = null
    // Cek apakah RAG enabled dari environment variable
    const ragEnabled = (process.env.ENABLE_RAG ?? "true").toLowerCase() !== "false"
    
    if (ragEnabled) {
      try {
        // Generate embedding menggunakan OpenAI text-embedding-3-small
        const embeddingResponse = await openaiClient.embeddings.create({
          model: "text-embedding-3-small",
          input: userMessage,
          encoding_format: "float",
        })
        // Ambil embedding dari response
        queryEmbedding = (embeddingResponse.data?.[0]?.embedding as unknown as number[]) || null
      } catch (e: any) {
        // Gracefully degrade ketika quota exceeded atau embeddings tidak tersedia
        const code = e?.code || e?.status || e?.response?.status
        const type = e?.type || e?.response?.data?.error?.type
        
        if (code === 429 || type === "insufficient_quota") {
          console.info("RAG disabled for this request due to quota; continuing without embeddings.")
        } else {
          console.info("Embedding generation failed; continuing without RAG.")
        }
        queryEmbedding = null
      }
    }

    // Search untuk dokumen relevan di Supabase (best-effort)
    let context = ""
    try {
      if (queryEmbedding) {
        // Buat Supabase client untuk server-side
        const supabase = createServerSupabaseClient()
        
        // Panggil function match_documents untuk mencari dokumen serupa
        const { data: relevantDocs, error: searchError } = await supabase.rpc(
          "match_documents",
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.78, // Threshold similarity
            match_count: 5, // Jumlah dokumen maksimal yang diambil
          }
        )
        
        // Jika ada error search, log warning
        if (searchError) {
          console.warn("Supabase search error:", searchError)
        } else if (relevantDocs && relevantDocs.length > 0) {
          // Gabungkan konten dokumen yang relevan
          context = relevantDocs.map((doc: any) => doc.content).join("\n\n")
        }

        // Fallback: jika tidak ada context dari corpus, coba Storage bucket best-effort
        if (!context) {
          try {
            const bucketName = "islamic_buckets"
            // Coba nama file spesifik; sesuaikan sesuai kebutuhan
            const candidateFiles = [
              "martabah samilah.txt",
              "waqfeya.txt",
            ]
            
            // Loop untuk mencari file yang cocok
            for (const filename of candidateFiles) {
              const { data: fileList, error: listErr } = await supabase.storage
                .from(bucketName)
                .list("", { search: filename, limit: 1 })
              
              if (listErr) {
                console.warn("Storage list error:", listErr)
                continue
              }
              
              // Cari file yang cocok dengan nama
              const match = fileList?.find((f: any) => f.name.toLowerCase() === filename.toLowerCase())
              if (!match) continue
              
              // Download file
              const { data: fileData, error: dlErr } = await supabase.storage
                .from(bucketName)
                .download(match.name)
              
              if (dlErr) {
                console.warn("Storage download error:", dlErr)
                continue
              }
              
              // Convert file ke text dan clean
              const text = await fileData.text()
              const cleaned = text.replace(/\s+/g, " ").trim()
              
              if (cleaned) {
                // Limit ke excerpt yang aman untuk menjaga prompt tetap kecil
                context = cleaned.slice(0, 6000)
                break
              }
            }
          } catch (storageErr) {
            console.warn("Storage fallback failed:", storageErr)
          }
        }
      }
    } catch (e) {
      console.warn("RAG search failed; continuing without context:", e)
    }

    // Buat system prompt yang enhanced dengan language handling dan topic limitation
    const systemPrompt = `You are NURRA, an Islamic AI assistant designed to help with questions about Islam, the Qur'an, Hadith, fiqh, aqeedah, akhlaq, and Islamic history.

Language policy:
- Detect the user's language among: Indonesian (id), English (en), or Arabic (ar).
- Always respond in the user's language.
- If the input mixes languages, prefer the dominant one; if unclear, default to Indonesian.

Topic limitation policy:
- If the user's question is outside Islamic topics (e.g., programming, sports, entertainment, general chit-chat unrelated to Islam), do NOT answer the question.
- Instead, reply ONLY with the following message in the user's language:
  - Indonesian: "Mohon maaf, saya asisten Islam yang hanya menjawab pertanyaan seputar ajaran Islam, Al‑Qur'an, Hadis, fikih, akidah, akhlak, dan sejarah Islam. Silakan ajukan pertanyaan terkait topik tersebut."
  - English: "Sorry, I am an Islamic assistant and only answer questions related to Islamic teachings, the Qur'an, Hadith, fiqh, creed, ethics, and Islamic history. Please ask a question on those topics."
  - Arabic: "عذرًا، أنا مساعد إسلامي وأجيب فقط عن الأسئلة المتعلقة بتعاليم الإسلام والقرآن والحديث والفقه والعقيدة والأخلاق والتاريخ الإسلامي. يرجى طرح سؤال ضمن هذه المواضيع."

Response guidelines (when on-topic):
- Begin with an appropriate greeting in the user's language (e.g., Indonesian: "Bismillah", English: "Bismillah", Arabic: "بسم الله").
- Base answers on authentic sources (Qur'an and Sahih Hadith). Include references: Surah:Ayah for Qur'an; collection for Hadith (e.g., Sahih Bukhari, Sahih Muslim).
- Use clear, concise language suitable for general audiences.
- If unsure on complex rulings, advise consulting a qualified Islamic scholar.
- **Formatting for lists**: When presenting bullet points, lists, or multiple related points, use this exact format: **Kata Kunci atau Judul**: Deskripsi atau penjelasan yang detail. Always follow this pattern - bold keyword/title colon space regular description. Examples: "**Rukun Islam**: Lima dasar agama Islam yang wajib dipahami dan diamalkan setiap muslim.", "**Menjamak Shalat**: Menggabungkan dua waktu shalat dalam kondisi tertentu seperti safar atau hujan."

${context ? `Relevant Islamic knowledge to help answer the question (use only if relevant):\n${context}` : ''}`

    // Path debug non-streaming
    if (nonstream) {
      try {
        // Buat completion menggunakan OpenAI GPT-4-turbo
        const completion = await openaiClient.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role || "user", content: m.content })),
          ],
          temperature: 0.2, // Temperature rendah untuk konsistensi
        })
        
        // Ambil konten dari response
        const content = completion.choices?.[0]?.message?.content || ""
        
        // Return response JSON
        return new Response(JSON.stringify({ content }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      } catch (err: any) {
        // Log error dan return error response
        console.error("OpenAI nonstream error:", err?.message || err)
        return new Response(JSON.stringify({ error: "LLM request failed", details: String(err?.message || err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    // Default: streaming response menggunakan AI SDK
    try {
      // Buat streaming text response menggunakan AI SDK
      const result = await streamText({
        model: openai("gpt-4-turbo"), // Gunakan GPT-4-turbo untuk streaming
        system: systemPrompt, // System prompt yang sudah dibuat
        messages, // Array messages dari request
      })
      
      // Return streaming response sebagai text stream
      return result.toTextStreamResponse()
    } catch (err: any) {
      // Log error dan return error response
      console.error("OpenAI stream error:", err?.message || err)
      return new Response(JSON.stringify({ error: "LLM streaming failed", details: String(err?.message || err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    // Catch-all error handler untuk error yang tidak terduga
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ error: "Failed to process your request. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
