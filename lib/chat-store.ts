"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  feedback?: "thumbs_up" | "thumbs_down" | null
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface ChatStore {
  sessionsByUser: Record<string, ChatSession[]>
  activeSessionIdByUser: Record<string, string | null>
  archivedSessionsByUser: Record<string, ChatSession[]>

  // Session management
  createSession: (userId: string, title?: string) => string
  deleteSession: (userId: string, sessionId: string) => void
  setActiveSession: (userId: string, sessionId: string) => void
  updateSessionTitle: (userId: string, sessionId: string, title: string) => void
  archiveSession: (userId: string, sessionId: string) => void
  shareSession: (userId: string, sessionId: string) => string

  // Remote sync helpers (DB-backed)
  loadSessionsFromDb: (userId: string) => Promise<void>
  createSessionRemote: (userId: string, title?: string) => Promise<string>
  updateSessionTitleRemote: (userId: string, sessionId: string, title: string) => Promise<void>
  deleteSessionRemote: (userId: string, sessionId: string) => Promise<void>
  loadMessagesFromDb: (userId: string, sessionId: string) => Promise<void>
  syncMessagesToDb: (userId: string, sessionId: string) => Promise<void>
  ensureRemoteSession: (userId: string, sessionId: string) => Promise<string>

  // Message management
  addMessage: (userId: string, sessionId: string, message: Omit<Message, "id" | "timestamp">) => void
  addMessageRemote: (userId: string, sessionId: string, message: Omit<Message, "id" | "timestamp">) => Promise<void>
  updateMessageFeedback: (userId: string, sessionId: string, messageId: string, feedback: "thumbs_up" | "thumbs_down" | null) => void
  getActiveSession: (userId: string) => ChatSession | null
  getSessionMessages: (userId: string, sessionId: string) => Message[]
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessionsByUser: {},
      activeSessionIdByUser: {},
      archivedSessionsByUser: {},

      createSession: (userId, title = "New Chat") => {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title,
          messages: [
            {
              id: "welcome",
              role: "assistant",
              content:
                "Bismillah! I'm NURRA, your Islamic AI assistant. I'm here to help you with questions about Islam, Quran, Hadith, and Islamic guidance. How can I assist you today?",
              timestamp: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          return {
            sessionsByUser: { ...state.sessionsByUser, [userId]: [newSession, ...userSessions] },
            activeSessionIdByUser: { ...state.activeSessionIdByUser, [userId]: newSession.id },
          }
        })

        return newSession.id
      },

      // Remote helpers (Supabase via Next API). Best-effort; fall back to local store.
      async loadSessionsFromDb(userId: string) {
        console.log('loadSessionsFromDb called:', { userId })
        
        // For local storage only, sessions are already loaded from localStorage
        // No need to fetch from database
        const userSessions = get().sessionsByUser[userId] || []
        console.log('Sessions loaded from local storage:', userSessions.length)
        
        // Ensure user has at least one session
        if (userSessions.length === 0) {
          get().createSession(userId, "New Chat")
        }
      },

      async createSessionRemote(userId: string, title?: string) {
        console.log('createSessionRemote called:', { userId, title })

        // For local storage only, just create a local session
        const newSessionId = get().createSession(userId, title)

        // Ensure the new session is set as active
        set((state) => ({
          activeSessionIdByUser: { ...state.activeSessionIdByUser, [userId]: newSessionId },
        }))

        return newSessionId
      },

      deleteSession: (userId, sessionId) => {
        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          const filtered = userSessions.filter((s) => s.id !== sessionId)
          const currentActive = state.activeSessionIdByUser[userId]
          const nextActive =
            currentActive === sessionId ? (filtered.length > 0 ? filtered[0].id : null) : currentActive
          return {
            sessionsByUser: { ...state.sessionsByUser, [userId]: filtered },
            activeSessionIdByUser: { ...state.activeSessionIdByUser, [userId]: nextActive || null },
          }
        })
      },

      async deleteSessionRemote(userId, sessionId) {
        console.log('deleteSessionRemote called:', { userId, sessionId })
        
        // For local storage only, just delete from local storage
        get().deleteSession(userId, sessionId)
      },

      setActiveSession: (userId, sessionId) => {
        set((state) => ({
          activeSessionIdByUser: { ...state.activeSessionIdByUser, [userId]: sessionId },
        }))
      },

      updateSessionTitle: (userId, sessionId, title) => {
        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          return {
            sessionsByUser: {
              ...state.sessionsByUser,
              [userId]: userSessions.map((session) =>
                session.id === sessionId ? { ...session, title, updatedAt: new Date() } : session,
              ),
            },
          }
        })
      },

      async updateSessionTitleRemote(userId: string, sessionId: string, title: string) {
        console.log('updateSessionTitleRemote called:', { userId, sessionId, title })
        
        // For local storage only, just update local storage
        get().updateSessionTitle(userId, sessionId, title)
      },

      addMessage: (userId, sessionId, messageData) => {
        const message: Message = {
          ...messageData,
          id: Date.now().toString(),
          timestamp: new Date(),
        }

        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          return {
            sessionsByUser: {
              ...state.sessionsByUser,
              [userId]: userSessions.map((session) =>
                session.id === sessionId
                  ? {
                      ...session,
                      messages: [...session.messages, message],
                      updatedAt: new Date(),
                      title:
                        session.messages.length === 1 && messageData.role === "user"
                          ? messageData.content.slice(0, 50) + (messageData.content.length > 50 ? "..." : "")
                          : session.title,
                    }
                  : session,
              ),
            },
          }
        })
      },

      async addMessageRemote(userId: string, sessionId: string, messageData: Omit<Message, 'id' | 'timestamp'>) {
        console.log('addMessageRemote called:', { userId, sessionId, messageData })
        
        // Simply add message to local storage (no database calls)
        get().addMessage(userId, sessionId, messageData)
        console.log('Message saved to local storage')
      },

      async ensureRemoteSession(userId: string, sessionId: string) {
        console.log('ensureRemoteSession called:', { userId, sessionId })
        
        // For local storage only, just return the session ID as is
        // No need for database verification or remote session creation
        return sessionId
      },

      async loadMessagesFromDb(userId: string, sessionId: string) {
        console.log('loadMessagesFromDb called:', { userId, sessionId })
        
        // For local storage only, messages are already loaded from localStorage
        // No need to fetch from database
        const session = get().sessionsByUser[userId]?.find(s => s.id === sessionId)
        console.log('Messages loaded from local storage:', session?.messages?.length || 0)
      },

      // No need to sync to database - everything is local
      async syncMessagesToDb(userId: string, sessionId: string) {
        console.log('syncMessagesToDb called:', { userId, sessionId })
        
        // For local storage only, no sync needed
        // All data is already in localStorage
      },

      updateMessageFeedback: (userId, sessionId, messageId, feedback) => {
        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          return {
            sessionsByUser: {
              ...state.sessionsByUser,
              [userId]: userSessions.map((session) =>
                session.id === sessionId
                  ? {
                      ...session,
                      messages: session.messages.map((message) =>
                        message.id === messageId ? { ...message, feedback } : message
                      ),
                      updatedAt: new Date(),
                    }
                  : session,
              ),
            },
          }
        })
      },

      getActiveSession: (userId) => {
        const state = get()
        const id = state.activeSessionIdByUser[userId]
        const userSessions = state.sessionsByUser[userId] || []
        return userSessions.find((s) => s.id === id) || null
      },

      getSessionMessages: (userId, sessionId) => {
        const state = get()
        const userSessions = state.sessionsByUser[userId] || []
        return userSessions.find((s) => s.id === sessionId)?.messages || []
      },

      archiveSession: (userId, sessionId) => {
        set((state) => {
          const userSessions = state.sessionsByUser[userId] || []
          const sessionToArchive = userSessions.find((s) => s.id === sessionId)
          
          if (!sessionToArchive) return state
          
          const filteredSessions = userSessions.filter((s) => s.id !== sessionId)
          const archivedSessions = state.archivedSessionsByUser[userId] || []
          
          // Update active session if needed
          const currentActive = state.activeSessionIdByUser[userId]
          const nextActive = 
            currentActive === sessionId ? (filteredSessions.length > 0 ? filteredSessions[0].id : null) : currentActive
          
          return {
            sessionsByUser: { ...state.sessionsByUser, [userId]: filteredSessions },
            archivedSessionsByUser: { 
              ...state.archivedSessionsByUser, 
              [userId]: [sessionToArchive, ...archivedSessions] 
            },
            activeSessionIdByUser: { ...state.activeSessionIdByUser, [userId]: nextActive || null },
          }
        })
      },

      shareSession: (userId, sessionId) => {
        // Generate a shareable link or ID for the session
        // This is a placeholder implementation
        const sessionData = get().sessionsByUser[userId]?.find(s => s.id === sessionId)
        if (!sessionData) return ""
        
        // In a real implementation, you might:
        // 1. Generate a unique sharing ID
        // 2. Save the session data to a database with this ID
        // 3. Return a URL that includes this ID
        
        // For now, we'll just return a mock sharing URL
        return `${window.location.origin}/shared-chat/${sessionId}`
      },
    }),
    {
      name: "islamic-chat-storage", // persisted once, contains all users' sessions locally
      partialize: (state) => ({
        sessionsByUser: state.sessionsByUser,
        activeSessionIdByUser: state.activeSessionIdByUser,
        archivedSessionsByUser: state.archivedSessionsByUser,
      }),
      // Ensure proper hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Chat store rehydrated:', {
            users: Object.keys(state.sessionsByUser),
            totalSessions: Object.values(state.sessionsByUser).flat().length
          })
        }
      },
    },
  ),
)
