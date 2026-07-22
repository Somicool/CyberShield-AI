import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

/** Markdown renderer for Copilot responses: GFM tables/lists + code highlighting. */
export default function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
