import { MessageCircle, Sun, Moon } from 'lucide-react'
import { useState } from 'react'

export default function ChatHeader() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleTheme = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark', !darkMode)
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            DeepSeek Chat
          </h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-gray-800 dark:text-gray-100" />
          ) : (
            <Moon className="w-5 h-5 text-gray-800 dark:text-gray-100" />
          )}
        </button>
      </div>
    </header>
  )
}
