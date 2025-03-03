import { Send } from 'lucide-react'
import { useState } from 'react'

export default function ChatInput({ onSend }: { onSend: (message: string) => void }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white dark:bg-gray-800">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 rounded-lg border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}
