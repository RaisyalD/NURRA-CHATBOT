const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Initialize clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseAnonKey || !openaiApiKey) {
  console.error('Missing required environment variables')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

// Helper function to clean text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .replace(/[^\w\s\n.,!?;:()[\]{}"'\-–—…]/g, '') // Remove special characters but keep basic punctuation
    .trim()
}

// Helper function to split text into chunks
function splitIntoChunks(text, maxChunkSize = 1000, overlap = 200) {
  const chunks = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // If this isn't the last chunk, try to break at a sentence boundary
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end - 100)
      const nextNewline = text.indexOf('\n', end - 100)
      
      if (nextPeriod > end - 100 && nextPeriod < end + 100) {
        end = nextPeriod + 1
      } else if (nextNewline > end - 100 && nextNewline < end + 100) {
        end = nextNewline + 1
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) { // Only add chunks with meaningful content
      chunks.push(chunk)
    }

    start = end - overlap
    if (start >= text.length) break
  }

  return chunks
}

// Helper function to generate embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
      encoding_format: 'float',
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

// Helper function to process PDF file
async function processPDFFile(filePath) {
  try {
    console.log(`Processing PDF: ${filePath}`)
    
    // For this example, we'll read a text file instead of PDF
    // In production, you'd use a PDF parsing library like pdf-parse
    const fileContent = fs.readFileSync(filePath, 'utf8')
    
    // Clean the text
    const cleanedText = cleanText(fileContent)
    console.log(`Cleaned text length: ${cleanedText.length} characters`)
    
    // Split into chunks
    const chunks = splitIntoChunks(cleanedText, 1000, 200)
    console.log(`Created ${chunks.length} chunks`)
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 5
    let processedCount = 0
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
      
      // Generate embeddings for the batch
      const embeddingPromises = batch.map(chunk => generateEmbedding(chunk))
      const embeddings = await Promise.all(embeddingPromises)
      
      // Prepare data for insertion
      const dataToInsert = batch.map((chunk, index) => ({
        content: chunk,
        embedding: embeddings[index],
        metadata: {
          source: path.basename(filePath),
          chunk_index: i + index,
          total_chunks: chunks.length
        }
      }))
      
      // Insert into Supabase
      const { error } = await supabase
        .from('islamic_corpus')
        .insert(dataToInsert)
      
      if (error) {
        console.error('Error inserting data:', error)
        throw error
      }
      
      processedCount += batch.length
      console.log(`✅ Inserted ${batch.length} chunks (${processedCount}/${chunks.length} total)`)
      
      // Rate limiting - wait a bit between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`✅ Successfully processed ${filePath}`)
    return processedCount
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error)
    throw error
  }
}

// Main ingestion function
async function ingestDocuments() {
  try {
    console.log('🚀 Starting document ingestion...')
    
    // Check if the table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('islamic_corpus')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('Table does not exist. Please run: npm run setup-db')
      process.exit(1)
    }
    
    // Get list of files to process
    const documentsDir = path.join(__dirname, '../documents')
    
    if (!fs.existsSync(documentsDir)) {
      console.log('Creating documents directory...')
      fs.mkdirSync(documentsDir, { recursive: true })
      console.log('✅ Created documents directory')
      console.log(`Please place your PDF/text files in: ${documentsDir}`)
      return
    }
    
    const files = fs.readdirSync(documentsDir)
      .filter(file => file.endsWith('.txt') || file.endsWith('.pdf'))
    
    if (files.length === 0) {
      console.log('No documents found in documents directory')
      console.log(`Please place your PDF/text files in: ${documentsDir}`)
      return
    }
    
    console.log(`Found ${files.length} files to process`)
    
    let totalProcessed = 0
    
    for (const file of files) {
      const filePath = path.join(documentsDir, file)
      const processedCount = await processPDFFile(filePath)
      totalProcessed += processedCount
    }
    
    console.log(`🎉 Ingestion completed!`)
    console.log(`Total chunks processed: ${totalProcessed}`)
    
    // Get final count
    const { count } = await supabase
      .from('islamic_corpus')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total documents in database: ${count}`)
    
  } catch (error) {
    console.error('Error during ingestion:', error)
    process.exit(1)
  }
}

// Run the ingestion
if (require.main === module) {
  ingestDocuments()
}

module.exports = {
  processPDFFile,
  generateEmbedding,
  splitIntoChunks,
  cleanText
}
