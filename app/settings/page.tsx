"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, User, Bell, Shield, Globe, Palette, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { ClientWrapper } from "@/components/client-wrapper"
import { useI18n } from "@/lib/i18n"
import { AuthGuard } from "@/components/auth-guard"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { language, setLanguage } = useI18n()
  const [settings, setSettings] = useState({
    notifications: true,
    autoSave: true,
    theme: "system",
    language: language,
    maxTokens: "1000",
    enableHistory: true,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveSettings = async () => {
    setIsLoading(true)
    // Simulate saving settings
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
    // In a real app, you would save to localStorage or API
    localStorage.setItem('islamic-chat-settings', JSON.stringify(settings))
  }

  useEffect(() => {
    setSettings(prev => ({ ...prev, language }))
  }, [language])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <ClientWrapper>
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">إ</span>
                </div>
                <h1 className="font-semibold text-lg">Settings</h1>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={user?.fullName || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled />
                  </div>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Chat Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Settings
                </CardTitle>
                <CardDescription>Configure your chat experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save conversations</Label>
                    <p className="text-sm text-muted-foreground">Automatically save your chat history</p>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSave: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable chat history</Label>
                    <p className="text-sm text-muted-foreground">Keep track of your previous conversations</p>
                  </div>
                  <Switch
                    checked={settings.enableHistory}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableHistory: checked }))}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Maximum Response Length</Label>
                  <Select value={settings.maxTokens} onValueChange={(value) => setSettings(prev => ({ ...prev, maxTokens: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">Short (500 tokens)</SelectItem>
                      <SelectItem value="1000">Medium (1000 tokens)</SelectItem>
                      <SelectItem value="2000">Long (2000 tokens)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for new features and updates</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifications: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={settings.theme} onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => {
                      const lang = value as typeof language
                      setSettings(prev => ({ ...prev, language: lang }))
                      setLanguage(lang)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>Manage your privacy and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Usage</Label>
                  <p className="text-sm text-muted-foreground">
                    Your conversations are processed to provide Islamic guidance. We do not store personal information beyond what's necessary for the service.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Islamic Guidelines</Label>
                  <p className="text-sm text-muted-foreground">
                    This AI assistant provides guidance based on authentic Islamic sources. For complex religious matters, please consult with qualified Islamic scholars.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </AuthGuard>
    </ClientWrapper>
  )
}
