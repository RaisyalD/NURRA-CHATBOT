import React from 'react'
import { containsArabicText, segmentArabicText } from '@/lib/arabic-text-utils'

interface MarkdownTextProps {
  children: string
}

// Component to render segmented text with Arabic styling
function SegmentedText({ text }: { text: string }) {
  // Handle bold text **text**
  const processedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // If text contains HTML (like bold), we need to handle it differently
  if (processedText.includes('<strong>')) {
    // Split by <strong> tags to preserve bold formatting
    const parts = processedText.split(/(<strong>.*?<\/strong>)/g)
    
    return (
      <>
        {parts.map((part, partIndex) => {
          if (part.includes('<strong>')) {
            // This is a bold section, render with HTML
            const isArabic = containsArabicText(part)
            return(
              <span
                key={partIndex}
                dangerouslySetInnerHTML={{ __html: part }}
                className={isArabic ? 'arabic-text font-arabic text-lg' : ''}
              />
            )
          } else {
            // Regular text, segment and style
            const segments = segmentArabicText(part)
            return (
              <React.Fragment key={`seg-${partIndex}`}>
                {segments.map((segment, segmentIndex) => (
                  <span
                    key={`${partIndex}-${segmentIndex}`}
                    className={segment.isArabic ? 'arabic-text font-arabic text-lg' : ''}
                  >
                    {segment.text}
                  </span>
                ))}
              </React.Fragment>
            )
          }
        })}
      </>
    )
  }
  
  // Regular text without markdown formatting
  const segments = segmentArabicText(text)
  
  return (
    <>
      {segments.map((segment, segmentIndex) => (
        <span
          key={segmentIndex}
          className={segment.isArabic ? 'arabic-text font-arabic text-lg' : ''}
        >
          {segment.text}
        </span>
      ))}
    </>
  )
}

export function MarkdownText({ children }: MarkdownTextProps) {
  // Simple parser for basic markdown formatting
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => {
      // Handle bullet points with bold formatting pattern: "**Point**: Description"
      const bulletRegex = /^\*\*(.*?)\*\*\s*:\s*(.*)$/
      const bulletMatch = line.match(bulletRegex)
      
      if (bulletMatch) {
        return (
          <div key={lineIndex} className="mb-3">
            <strong className="text-foreground font-semibold">{bulletMatch[1]}:</strong>
            <span className="ml-1">
              <SegmentedText text={bulletMatch[2]} />
            </span>
          </div>
        )
      }
      
      // Check if line has Arabic text for overall styling
      
      // Regular line with or without Arabic text
      return (
        <div key={lineIndex} className="mb-1">
          <SegmentedText text={line} />
        </div>
      )
    })
  }

  // Check overall content for Arabic to determine base styling
  const hasArabicContent = containsArabicText(children)
  const baseClasses = hasArabicContent 
    ? "space-y-2 text-sm leading-relaxed font-arabic"
    : "space-y-2 text-sm leading-relaxed"

  return <div className={baseClasses}>{parseMarkdown(children)}</div>
}