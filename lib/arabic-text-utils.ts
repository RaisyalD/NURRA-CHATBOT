/**
 * Utility functions for Arabic text detection and styling
 */

/**
 * Check if text contains Arabic characters
 * Arabic Unicode range: U+0600–U+06FF
 * Includes most Arabic characters, Arabic punctuation, and Arabic digits
 */
export function containsArabicText(text: string): boolean {
  // Arabic character range and extended Arabic block
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicRegex.test(text)
}

/**
 * Check if text is primarily Arabic (more than 50% Arabic characters)
 */
export function isPrimarilyArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
  const arabicMatches = text.match(arabicRegex) || []
  const totalChars = text.replace(/\s/g, '').length
  
  if (totalChars === 0) return false
  
  return (arabicMatches.length / totalChars) > 0.5
}

/**
 * Split text into segments and identify Arabic parts
 */
export function segmentArabicText(text: string): Array<{
  text: string
  isArabic: boolean
  className?: string
}> {
  const segments: Array<{ text: string; isArabic: boolean; className?: string }> = []
  
  // Split text by whitespace to get words
  const words = text.split(/(\s+)/)
  
  let currentSegment = ''
  let currentIsArabic = false
  
  for (const word of words) {
    const wordIsArabic = containsArabicText(word)
    
    if (wordIsArabic !== currentIsArabic && currentSegment.trim()) {
      // Start new segment
      segments.push({
        text: currentSegment,
        isArabic: currentIsArabic,
        className: currentIsArabic ? 'arabic-text' : 'non-arabic-text'
      })
      currentSegment = word
    } else {
      currentSegment += word
    }
    
    currentIsArabic = wordIsArabic
  }
  
  // Add final segment
  if (currentSegment.trim()) {
    segments.push({
      text: currentSegment,
      isArabic: currentIsArabic,
      className: currentIsArabic ? 'arabic-text' : 'non-arabic-text'
    })
  }
  
  return segments
}

/**
 * Get CSS classes for Arabic text styling
 */
export function getArabicTextClasses(): string {
  return 'arabic-text text-lg leading-relaxed text-right font-arabic'
}

/**
 * Get CSS classes for mixed text styling
 */
export function getMixedTextClasses(): string {
  return 'mixed-text leading-relaxed'
}
