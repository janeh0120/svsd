import { AppProvider } from './context'
import { Editor } from './editor/Editor'

export default function App() {
  return (
    <AppProvider>
      <Editor />
    </AppProvider>
  )
}
