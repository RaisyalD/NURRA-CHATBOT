"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { ClientWrapper } from "@/components/client-wrapper"

export function HomePageClient() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <ClientWrapper>
      <AuthGuard requireAuth={true}>
        <div className="flex h-screen bg-background">
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Header onToggleSidebar={toggleSidebar} />

            <div className="flex-1 min-h-0">
              <ChatInterface />
            </div>
          </div>
        </div>
      </AuthGuard>
    </ClientWrapper>
  )
}

