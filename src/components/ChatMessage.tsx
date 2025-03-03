import { User, Bot } from 'lucide-react'

export default function ChatMessage({ message, isUser }: { message: string, isUser: boolean }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start gap-2 max-w-[80%]`}>
        {!isUser && (
          <div className="p-2 rounded-full bg-blue-500 text-white">
            <Bot className="w-5 h-5" />
          </div>
        )}
        <div className={`p-3 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-gray-200 dark:bg-gray-700 rounded-tl-none'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
        {isUser && (
          <div className="p-2 rounded-full bg-gray-500 text-white">
            <User className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
