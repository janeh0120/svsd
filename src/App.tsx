import { AppProvider } from './context'
import { Agentation } from 'agentation'
import { Editor } from './editor/Editor'

export default function App() {
  return (
    <AppProvider>
      <Editor />
      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
    </AppProvider>
  )
}
