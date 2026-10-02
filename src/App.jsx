import { useState } from 'react'
import Copyright from './Copyright'
import Menu from './Menu'
import TouchPracticeSound from './TouchPracticeSound'

export default function App() {
  // null のあいだはモードえらび画面
  const [mode, setMode] = useState(null)

  return (
    <>
      {!mode
        ? <Menu onSelect={setMode} />
        // key を渡して、モードを変えたらカウントも的も作り直す
        : <TouchPracticeSound key={mode} mode={mode} onExit={() => setMode(null)} />}
      {/* きろく一覧(z-index 40)より上に出すので、どの画面でも見える */}
      <Copyright />
    </>
  )
}
