import { useState } from 'react'
import Menu from './Menu'
import TouchPracticeSound from './TouchPracticeSound'

export default function App() {
  // null のあいだはモードえらび画面
  const [mode, setMode] = useState(null)

  if (!mode) return <Menu onSelect={setMode} />

  // key を渡して、モードを変えたらカウントも的も作り直す
  return <TouchPracticeSound key={mode} mode={mode} onExit={() => setMode(null)} />
}
