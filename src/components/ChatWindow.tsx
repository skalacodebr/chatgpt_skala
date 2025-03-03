import { useState, useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ReasoningContent from './ReasoningContent'

type Message = {
  content: string
  isUser: boolean
  reasoning?: string
  isComplete?: boolean
  showReasoning?: boolean
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentReasoning, setCurrentReasoning] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentReasoning, currentResponse])

  const handleSend = async (message: string) => {
    setMessages(prev => [...prev, { content: message, isUser: true }])
    setIsLoading(true)
    setCurrentReasoning('')
    setCurrentResponse('')

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-reasoner',
          messages: [{ role: 'user', content: message }],
          temperature: 0.7,
          stream: true,
          show_reasoning: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let reasoningComplete = false
      let reasoningMessageIndex = -1

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') {
              continue
            }

            try {
              // Remove 'data: ' e faz parse do JSON
              const data = JSON.parse(line.replace('data: ', ''))
              const delta = data.choices?.[0]?.delta

              // Se vier reasoning_content não-nulo, concatena
              if (delta?.reasoning_content != null) {
                setCurrentReasoning(prev => prev + delta.reasoning_content)
              }

              // Se vier content não-nulo, atualiza a resposta parcial
              if (delta?.content != null) {
                // Verifica se ainda estamos no momento de raciocínio
                // e precisamos inserir a mensagem que conterá a resposta
                if (!reasoningComplete) {
                  reasoningComplete = true
                  setMessages(prev => {
                    const newMessages = [
                      ...prev,
                      {
                        content: '',           // será preenchido no final
                        isUser: false,
                        reasoning: currentReasoning,
                        isComplete: false,
                        showReasoning: true
                      }
                    ]
                    reasoningMessageIndex = newMessages.length - 1
                    return newMessages
                  })
                  // Limpamos o raciocínio atual que já foi 'entregue'
                  setCurrentReasoning('')
                }
                setCurrentResponse(prev => prev + delta.content)
              }
            } catch (error) {
              console.error('Error parsing stream:', error)
            }
          }
        }
      }

      // Final do stream: atualizamos a mensagem final
      setMessages(prev => {
        const updatedMessages = [...prev]

        if (reasoningMessageIndex !== -1) {
          updatedMessages[reasoningMessageIndex] = {
            ...updatedMessages[reasoningMessageIndex],
            // caso currentResponse esteja vazio mas exista algo anterior, mantemos
            content: currentResponse || updatedMessages[reasoningMessageIndex].content,
            isComplete: true,
            showReasoning: true,
            // se currentReasoning estiver vazio mas reasoning existente for não-nulo, mantemos
            reasoning: currentReasoning || updatedMessages[reasoningMessageIndex].reasoning
          }
        } else {
          // Se não passamos pela fase do reasoningComplete, 
          // criamos uma mensagem sem raciocínio
          updatedMessages.push({
            content: currentResponse,
            isUser: false,
            isComplete: true,
            showReasoning: false
          })
        }
        return updatedMessages
      })

      // Reset final
      setCurrentResponse('')
    } catch (error) {
      console.error('API Error:', error)
      setMessages(prev => [
        ...prev,
        {
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isUser: false
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.showReasoning && msg.reasoning && (
              <ReasoningContent content={msg.reasoning} />
            )}
            <ChatMessage message={msg.content} isUser={msg.isUser} />
          </div>
        ))}

        {/* Caso estejamos carregando e já exista reasoning parcial */}
        {isLoading && currentReasoning && (
          <ReasoningContent content={currentReasoning} isStreaming />
        )}

        {/* Caso estejamos carregando e já exista content parcial */}
        {isLoading && currentResponse && (
          <ChatMessage message={currentResponse} isUser={false} />
        )}

        {/* Caso não haja nada parcial ainda, exibe o indicador de digitação */}
        {isLoading && !currentReasoning && !currentResponse && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  )
}