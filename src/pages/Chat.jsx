import ChatBox from '../components/ChatBox.jsx'

export default function Chat() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health assistant</h1>
        <p className="text-sm text-slate-500">Ask general questions. The assistant can see your latest readings.</p>
      </div>
      <ChatBox />
    </div>
  )
}
