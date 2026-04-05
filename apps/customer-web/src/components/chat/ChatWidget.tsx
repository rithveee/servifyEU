'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'
import { SOCKET_EVENTS } from '@servify/shared-types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatWidget() {
  const t = useTranslations('chat')
  const { user, isAuthenticated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isEscalated, setIsEscalated] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3004'

    socketRef.current = io(wsUrl, {
      auth: {
        userId: user?.id,
        locale: user?.locale ?? 'en',
      },
      autoConnect: false,
    })

    const socket = socketRef.current

    socket.on(SOCKET_EVENTS.CHAT_AGENT_TYPING, ({ typing }: { typing: boolean }) => {
      setIsTyping(typing)
    })

    socket.on(SOCKET_EVENTS.CHAT_RESPONSE, ({ message, ticketId: tid, escalated }: any) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: message, timestamp: new Date() },
      ])
      if (tid) setTicketId(tid)
      if (escalated) setIsEscalated(true)
    })

    socket.on('chat:ticket_created', ({ ticketId: tid }: any) => {
      setTicketId(tid)
    })

    socket.on(SOCKET_EVENTS.CHAT_ESCALATED, () => {
      setIsEscalated(true)
    })

    return () => {
      socket.disconnect()
    }
  }, [user?.id, user?.locale])

  useEffect(() => {
    if (isOpen && socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current?.connected) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    socketRef.current.emit(SOCKET_EVENTS.CHAT_MESSAGE, { message: input.trim(), ticketId })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendFeedback = (helpful: boolean) => {
    if (ticketId && socketRef.current) {
      socketRef.current.emit('chat:feedback', { ticketId, helpful })
    }
  }

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all"
        aria-label="Open customer support chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat drawer */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-24px)] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200"
          role="dialog"
          aria-label={t('title')}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div>
              <p className="font-semibold text-sm">Aria</p>
              <p className="text-xs text-blue-200">{t('title')}</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" aria-label="Online" />
          </div>

          {/* Escalation banner */}
          {isEscalated && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
              {t('escalated')}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p className="text-2xl mb-2">👋</p>
                <p>Hi! How can I help you today?</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="sr-only">{t('typing')}</span>
                </div>
              </div>
            )}

            {/* Feedback */}
            {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isEscalated && (
              <div className="flex items-center gap-2 justify-center mt-2">
                <span className="text-xs text-gray-400">{t('helpful')}</span>
                <button
                  onClick={() => sendFeedback(true)}
                  className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                  aria-label="Yes, helpful"
                >
                  👍 {t('yes')}
                </button>
                <button
                  onClick={() => sendFeedback(false)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="No, not helpful"
                >
                  👎 {t('no')}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label={t('placeholder')}
                disabled={isEscalated}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isEscalated}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('send')}
              >
                {t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
