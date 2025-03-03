import ChatHeader from './components/ChatHeader'
import ChatWindow from './components/ChatWindow'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ChatHeader />
      <ChatWindow />
    </div>
  )
}
