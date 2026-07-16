import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const TRUMP_TRUTH_URL = 'https://trumpstruth.org'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(TRUMP_TRUTH_URL, {
      next: { revalidate: 300 }, // Cache 5 min
      headers: { 'User-Agent': 'TradeXEssence/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ posts: [], error: 'Upstream fetch failed' })
    }

    const html = await res.text()

    // Parse out posts from HTML structure
    // Each post block: date text like "April 21, 2026, 11:41 PM", then content, then "Original Post" link
    const posts = []
    
    // Match date lines and content
    // The page displays: [Date] \n [Original Post link] \n content text
    // Structure: "April 22, 2026, 12:01 AM" followed by content
    const dateRegex = /(\w+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M)/g
    const originalPostRegex = /href="(https:\/\/truthsocial\.com\/@realDonaldTrump\/\d+)"/g
    
    // Split by "Donald J. Trump" blocks
    const blocks = html.split(/Donald J\. Trump/)
    
    for (let i = 1; i < blocks.length && posts.length < 15; i++) {
      const block = blocks[i]
      
      // Extract date
      const dateMatch = block.match(/(\w+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M)/)
      if (!dateMatch) continue
      
      // Extract original post URL
      const urlMatch = block.match(/href="(https:\/\/truthsocial\.com\/@realDonaldTrump\/(\d+))"/)
      const truthUrl = urlMatch ? urlMatch[1] : null
      
      // Extract text content — strip all HTML tags
      // Get content after the Original Post link
      let textContent = block
      // Remove HTML tags
      textContent = textContent.replace(/<[^>]+>/g, ' ')
      // Remove URLs
      textContent = textContent.replace(/https?:\/\/[^\s]+/g, '')
      // Remove @realDonaldTrump mentions
      textContent = textContent.replace(/@realDonaldTrump/g, '')
      // Remove "Original Post" text
      textContent = textContent.replace(/Original Post/g, '')
      // Remove the date itself  
      textContent = textContent.replace(dateMatch[1], '')
      // Clean up whitespace
      textContent = textContent.replace(/\s+/g, ' ').trim()
      
      // Skip empty posts (just retweets of links)
      if (textContent.length < 10) continue
      // Truncate very long posts
      if (textContent.length > 500) textContent = textContent.slice(0, 500) + '…'
      
      const dateStr = dateMatch[1]
      let isoDate = null
      try {
        isoDate = new Date(dateStr).toISOString()
      } catch {
        continue
      }

      posts.push({
        id: urlMatch ? urlMatch[2] : `post-${i}`,
        text: textContent,
        date: isoDate,
        dateDisplay: dateStr,
        url: truthUrl,
      })
    }

    // Deduplicate by id
    const seen = new Set()
    const unique = posts.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    return NextResponse.json({ posts: unique })
  } catch (err) {
    console.error('Trump posts fetch error:', err)
    return NextResponse.json({ posts: [], error: 'Failed to fetch posts' })
  }
}
