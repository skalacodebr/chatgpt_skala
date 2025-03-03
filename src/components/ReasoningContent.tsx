import { Bot } from 'lucide-react'

export default function ReasoningContent({ 
  content, 
  isStreaming 
}: { 
  content: string, 
  isStreaming?: boolean 
}) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[80%]">
        <div className="p-2 rounded-full bg-blue-500 text-white">
          <Bot className="w-5 h-5" />
        </div>
        <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 rounded-tl-none">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium mb-1">Raciocínio:</p>
            <p className="whitespace-pre-wrap">{content}</p>
            {isStreaming && (
              <div className="mt-2 flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
