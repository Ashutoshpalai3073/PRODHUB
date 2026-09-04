'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export function Chatbot() {
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Namaste! 👋 Ask me anything about Sanyog — whether you're a government department or a startup." }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const chatRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const send = async () => {
        if (!input.trim() || loading) return
        const userMsg: Message = { role: 'user', content: input.trim() }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    context: {
                        pathname: location.pathname,
                        tab: typeof window !== 'undefined'
                            ? (document.querySelector('[data-active-tab]')?.getAttribute('data-active-tab') || document.body.getAttribute('data-active-tab') || undefined)
                            : undefined,
                        section: typeof window !== 'undefined'
                            ? (document.querySelector('[data-active-section]')?.getAttribute('data-active-section') || document.body.getAttribute('data-active-section') || undefined)
                            : undefined
                    }
                })
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Connection error. Please try again.'
            }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div ref={chatRef}>
            {/* Floating Bubble */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    border: 'none', cursor: 'pointer', zIndex: 9999,
                    boxShadow: '0 0 20px rgba(124,58,237,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.3s, transform 0.2s',
                    opacity: 0.6,
                    fontSize: '18px'

                }}
                onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0.6'
                    e.currentTarget.style.transform = 'scale(1)'
                }}
            >
                {open ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {open && (
                <div className="chatbot-window" style={{
                    position: 'fixed', bottom: '90px', right: '24px',
                    width: 'min(360px, calc(100vw - 32px))', height: '480px',
                    background: '#0a0a0f',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: '20px',
                    boxShadow: '0 0 40px rgba(124,58,237,0.2)',
                    display: 'flex', flexDirection: 'column',
                    zIndex: 9998,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    overflow: 'hidden'
                }}
                onWheel={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed22, #06b6d422)',
                        borderBottom: '1px solid rgba(124,58,237,0.3)',
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px'
                        }}>🚀</div>
                        <div>
                            <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                                Sanyog AI
                            </div>
                            <div style={{ color: '#06b6d4', fontSize: '11px' }}>
                                ● Online
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'scroll', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#6366f1 transparent',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                        pointerEvents: 'auto',
                        userSelect: 'text',
                    }}
                    onWheel={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                    >
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                                    : 'rgba(255,255,255,0.05)',
                                border: msg.role === 'assistant'
                                    ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                color: 'white',
                                padding: '10px 14px',
                                borderRadius: msg.role === 'user'
                                    ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                fontSize: '13px', lineHeight: '1.5'
                            }}>
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div style={{
                                alignSelf: 'flex-start',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                                display: 'flex', gap: '5px'
                            }}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} style={{
                                        width: '7px', height: '7px', borderRadius: '50%',
                                        background: '#7c3aed',
                                        animation: `bounce 1s ${i * 0.15}s infinite`,
                                        display: 'inline-block'
                                    }} />
                                ))}
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', gap: '8px',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && send()}
                            placeholder="Ask about Sanyog..."
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(124,58,237,0.3)',
                                borderRadius: '12px', padding: '10px 14px',
                                color: 'white', fontSize: '16px', outline: 'none'
                            }}
                        />
                        <button
                            onClick={send}
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                border: 'none', borderRadius: '12px',
                                width: '42px', height: '42px',
                                cursor: 'pointer', fontSize: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >➤</button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
        </div>
    )
}