"use client"

import type React from "react"
import { useState, useEffect } from "react"

// Import komponen UI yang diperlukan
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Settings, LogOut, Trash2, MoreHorizontal, Pencil, Share2, Archive, Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useChatStore } from "@/lib/chat-store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Interface untuk props komponen Sidebar
interface SidebarProps {
  isCollapsed?: boolean // Apakah sidebar dalam keadaan collapsed
  onToggle?: () => void // Fungsi untuk toggle sidebar
}

// Komponen Sidebar untuk navigasi dan chat history
export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  // Hook untuk autentikasi user
  const { signOut, user } = useAuth()
  // Hook untuk mengelola state chat
  const store = useChatStore()
  // Ambil user ID atau gunakan "guest" jika belum login
  const userId = user?.id || "guest"

  // State untuk dialog rename session
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [sessionToRename, setSessionToRename] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  
  // State untuk dialog delete session
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  // Ambil sessions dan active session ID untuk user saat ini
  const sessions = store.sessionsByUser[userId] || []
  const activeSessionId = store.activeSessionIdByUser[userId] || null

  // Debug: Log informasi user dan sessions
  console.log('Sidebar Debug:', {
    userId,
    user,
    sessionsCount: sessions.length,
    sessions: sessions.map(s => ({ id: s.id, title: s.title }))
  })

  // Fungsi untuk handle sign out user
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Fungsi untuk membuat chat baru
  const handleNewChat = () => {
    store.createSessionRemote(userId)
  }

  // Fungsi untuk menambahkan dummy chats untuk testing (jika tidak ada session)
  const addDummyChats = () => {
    if (sessions.length === 0) {
      store.createSession(userId, "Chat tentang Sholat")
      store.createSession(userId, "Pertanyaan tentang Puasa")
      store.createSession(userId, "Belajar Al-Quran")
    }
  }

  // Fungsi untuk memastikan ada session awal untuk user yang sudah ada
  const ensureInitialSession = () => {
    if (sessions.length === 0 && userId && userId !== "guest") {
      // Untuk local storage saja, buat session jika tidak ada
      store.createSession(userId, "New Chat")
    }
  }

  // Effect untuk menjalankan ensureInitialSession saat komponen mount
  useEffect(() => {
    ensureInitialSession()
  }, [userId])

  // Fungsi untuk handle delete session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    setSessionToDelete(sessionId) // Set session yang akan dihapus
    setDeleteDialogOpen(true) // Buka dialog konfirmasi
  }

  // Fungsi untuk konfirmasi delete session
  const confirmDeleteSession = () => {
    if (sessionToDelete) {
      store.deleteSessionRemote(userId, sessionToDelete) // Hapus session dari store
      setDeleteDialogOpen(false) // Tutup dialog
      setSessionToDelete(null) // Reset state
    }
  }

  // Fungsi untuk handle rename session
  const handleRenameSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    const session = sessions.find(s => s.id === sessionId) // Cari session yang akan di-rename
    
    if (session) {
      setNewTitle(session.title) // Set title saat ini ke input
      setSessionToRename(sessionId) // Set session yang akan di-rename
      setRenameDialogOpen(true) // Buka dialog rename
    }
  }

  // Fungsi untuk save rename session
  const handleSaveRename = () => {
    if (sessionToRename && newTitle.trim()) {
      store.updateSessionTitleRemote(userId, sessionToRename, newTitle.trim()) // Update title di store
      setRenameDialogOpen(false) // Tutup dialog
      setSessionToRename(null) // Reset state
      setNewTitle("") // Reset input
    }
  }

  // Effect untuk local storage saja, sessions otomatis dimuat dari localStorage
  // Tidak perlu load dari database
  useEffect(() => {
    if (userId && userId !== 'guest') {
      console.log('User available, sessions loaded from local storage')
    }
  }, [userId])

  // Return JSX untuk komponen Sidebar
  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 h-screen transition-all duration-300`}>
      {/* Tombol New Chat */}
      <div className="p-4">
        {!isCollapsed ? (
          // Tombol New Chat dalam mode expanded
          <Button onClick={handleNewChat} className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        ) : (
          // Tombol New Chat dalam mode collapsed (hanya icon)
          <Button onClick={handleNewChat} size="icon" className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Chat History - hanya tampil jika sidebar tidak collapsed */}
      {!isCollapsed && (
        <ScrollArea className="flex-1 px-4 min-h-0">
          <div className="space-y-2">
            {/* Header untuk Recent Chats */}
            <h3 className="text-sm font-medium text-sidebar-foreground/70 mb-3">Recent Chats</h3>
            
            {/* Jika tidak ada sessions, tampilkan pesan kosong */}
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No chats yet. Start a new conversation!</p>
            ) : (
              // Loop untuk menampilkan setiap session
              sessions.map((session, index) => (
                <div key={`${userId}-${session.id}-${index}`} className="group relative flex items-center hover:bg-muted/50 rounded-lg transition-colors p-1">
                  {/* Session item yang dapat diklik */}
                  <div 
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer ${
                      activeSessionId === session.id ? "bg-secondary" : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      store.setActiveSession(userId, session.id) // Set session sebagai aktif
                      // Untuk local storage saja, messages sudah dimuat
                      console.log('Session selected, messages loaded from local storage')
                    }}
                  >
                    {/* Icon MessageSquare */}
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    
                    {/* Info session */}
                    <div className="flex-1 min-w-0">
                      {/* Title session */}
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      {/* Timestamp session */}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Menu actions (tiga titik) - selalu visible */}
                  <div className="flex-shrink-0 ml-2 mr-2 opacity-100 hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all duration-200 flex-shrink-0 border border-transparent hover:border-border"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Three dots clicked for session:', session.id, session.title)
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 text-foreground hover:text-foreground transition-colors" />
                        </Button>
                      </DropdownMenuTrigger>
                      
                      {/* Dropdown menu content */}
                      <DropdownMenuContent align="end" className="w-48">
                        {/* Menu item untuk rename */}
                        <DropdownMenuItem 
                          onClick={(e) => handleRenameSession(session.id, e)}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* Menu item untuk delete */}
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Collapsed Chat Icons - hanya tampil jika sidebar collapsed */}
      {isCollapsed && (
        <ScrollArea className="flex-1 px-2 min-h-0">
          <div className="space-y-2">
            {/* Loop untuk menampilkan session sebagai icon saja */}
            {sessions.map((session, index) => (
              <div key={`${userId}-${session.id}-${index}`} className="relative">
                <Button
                  variant={activeSessionId === session.id ? "secondary" : "ghost"}
                  size="icon"
                  className="w-12 h-12 rounded-lg"
                  onClick={() => store.setActiveSession(userId, session.id)}
                  title={session.title} // Tooltip dengan title session
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Bottom Actions - tombol Settings dan Sign Out */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {!isCollapsed ? (
          // Mode expanded - tampilkan text dan icon
          <>
            {/* Link ke halaman Settings */}
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            
            {/* Tombol Sign Out */}
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </>
        ) : (
          // Mode collapsed - hanya icon
          <div className="flex flex-col gap-2">
            {/* Icon Settings */}
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="w-12 h-12" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            
            {/* Icon Sign Out */}
            <Button variant="ghost" size="icon" className="w-12 h-12" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new chat name"
              className="w-full"
              autoFocus
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveRename();
                }
                if (e.key === 'Escape') {
                  setRenameDialogOpen(false);
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {newTitle.length}/100 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRename} 
              disabled={!newTitle.trim() || newTitle.trim() === sessions.find(s => s.id === sessionToRename)?.title}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSession}
              className="bg-destructive text-white-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
