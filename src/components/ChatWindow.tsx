import { useState, useEffect, useRef, useCallback } from 'react'
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

/**
 * Função que remove duplicações consecutivas de tokens,
 * e tenta fundir tokens quebrados. É apenas um exemplo simples –
 * não garante eliminação de todas as duplicações complexas.
 */
function cleanReasoningChain(text: string): string {
  // Remove repetições de pontuação duplicada
  // ex: "..." -> ".", "??" -> "?"
  const simplifiedPunctuation = text.replace(/[.]{2,}/g, ".").replace(/[?]{2,}/g, "?")

  // Separa tokens por espaço
  let tokens = simplifiedPunctuation.split(/\s+/)

  // Remove tokens vazios
  tokens = tokens.filter(t => t.trim() !== "")

  // Remove duplicações consecutivas exatas
  const newTokens: string[] = []
  for (const t of tokens) {
    // Se for igual ao último token adicionado, pula
    if (newTokens.length && newTokens[newTokens.length - 1] === t) {
      continue
    }
    newTokens.push(t)
  }

  // (Opcional) Remove duplicações em que o token atual é parte do final do anterior
  // Ex: "resolu" "resolução" => "resolução"
  // Este passo é heurístico e pode remover pedaços legítimos.
  const fusedTokens: string[] = []
  for (const t of newTokens) {
    if (fusedTokens.length) {
      const last = fusedTokens[fusedTokens.length - 1]
      // Se "t" for sufixo do "last", tente não duplicar
      if (last.endsWith(t) || t.endsWith(last)) {
        // ficamos com o maior
        if (t.length > last.length) {
          fusedTokens[fusedTokens.length - 1] = t
        }
      } else {
        fusedTokens.push(t)
      }
    } else {
      fusedTokens.push(t)
    }
  }

  return fusedTokens.join(" ")
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Índice da mensagem final (quando chega o primeiro pedaço de content)
  const answerMessageIndexRef = useRef<number>(-1)

  // Flag indicando se já criamos a mensagem final de resposta
  const alreadyCreatedRef = useRef<boolean>(false)

  // Aqui acumulamos TODO o raciocínio, sem exibir em tempo real
  const reasoningAccumulatorRef = useRef<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Adiciona um pedaço de texto na mensagem final (campo content).
   */
  const appendContentToFinalMessage = useCallback((contentChunk: string) => {
    setMessages(prev => {
      const newArr = [...prev]
      const idx = answerMessageIndexRef.current
      if (idx >= 0 && newArr[idx]) {
        const oldContent = newArr[idx].content || ''
        newArr[idx].content = oldContent + contentChunk
      }
      return newArr
    })
  }, [])

  /**
   * Cria a mensagem final de resposta, caso ainda não exista.
   */
  const createFinalMessage = useCallback(() => {
    setMessages(prev => {
      const newArr = [...prev]
      newArr.push({
        content: '',
        isUser: false,
        reasoning: '',    // será preenchido no final
        isComplete: false,
        showReasoning: true
      })
      answerMessageIndexRef.current = newArr.length - 1
      return newArr
    })
  }, [])

  /**
   * Marca a mensagem final como completa e insere o raciocínio deduplicado.
   */
  const finalizeMessage = useCallback(() => {
    // Aplica a heurística de limpeza
    const deduplicatedReason = cleanReasoningChain(reasoningAccumulatorRef.current)
    setMessages(prev => {
      const newArr = [...prev]
      const idx = answerMessageIndexRef.current
      if (idx >= 0 && newArr[idx]) {
        newArr[idx].isComplete = true
        newArr[idx].reasoning = deduplicatedReason
      }
      return newArr
    })
    // Limpa o acumulador para a próxima pergunta
    reasoningAccumulatorRef.current = ''
  }, [])

  const handleSend = async (prompt: string) => {
    console.log('[handleSend] => START with prompt=', prompt)

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, { content: prompt, isUser: true }])

    setIsLoading(true)
    answerMessageIndexRef.current = -1
    alreadyCreatedRef.current = false
    reasoningAccumulatorRef.current = '' // zera o raciocínio local

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
          messages: [{ role: 'user', content: prompt }],
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
      let finished = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') {
              finished = true
              break
            }
            try {
              const data = JSON.parse(line.replace('data: ', ''))
              const choice = data.choices?.[0]
              if (!choice) continue

              // Se vier finish_reason, marcamos finished
              if (choice.finish_reason) {
                finished = true
              }

              const delta = choice.delta
              if (!delta) continue

              // Raciocínio: apenas acumulamos no ref, sem exibir agora.
              if (delta.reasoning_content != null) {
                reasoningAccumulatorRef.current += delta.reasoning_content
              }

              // Content: exibe em tempo real
              if (delta.content != null) {
                // Se ainda não criamos a mensagem final, criamos agora
                if (!alreadyCreatedRef.current) {
                  createFinalMessage()
                  alreadyCreatedRef.current = true
                }
                appendContentToFinalMessage(delta.content)
              }
            } catch (err) {
              console.error('Error parsing chunk:', err)
            }
          }
          if (finished) break
        }
      }

      // Ao final do stream, marcamos a mensagem como completa e definimos o raciocínio
      finalizeMessage()
    } catch (error) {
      console.error('[handleSend] => error:', error)
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
            {/* Exibe raciocínio somente depois que a msg está completa */}
            {msg.showReasoning && msg.isComplete && msg.reasoning && (
              <ReasoningContent content={msg.reasoning} />
            )}
            <ChatMessage message={msg.content} isUser={msg.isUser} />
          </div>
        ))}

        {/* Se está carregando e não há nenhuma mensagem de resposta, exibe um indicador */}
        {isLoading && answerMessageIndexRef.current === -1 && (
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
