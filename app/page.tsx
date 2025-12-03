"use client"

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Import komponen-komponen yang diperlukan
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { ClientWrapper } from "@/components/client-wrapper"
import { useState } from "react"

// Komponen utama untuk halaman home/dashboard
export default function HomePage() {
  // State untuk mengontrol apakah sidebar collapsed atau tidak
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Fungsi untuk toggle sidebar (collapse/expand)
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  // Return JSX untuk halaman utama
  return (
    <ClientWrapper>
      <AuthGuard requireAuth={true}>
        <div className="flex h-screen bg-background">
          {/* Sidebar untuk chat history dan navigasi */}
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggle={toggleSidebar}
          />

          {/* Area utama untuk chat */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Header dengan tombol toggle sidebar */}
            <Header onToggleSidebar={toggleSidebar} />
            
            {/* Area chat interface yang dapat di-scroll */}
            <div className="flex-1 min-h-0">
              <ChatInterface />
            </div>
          </div>
        </div>
      </AuthGuard>
    </ClientWrapper>
  )
}
