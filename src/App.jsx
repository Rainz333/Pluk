import { useState } from 'react'
import './App.css'
import Header from './Header'
import Base from './Base'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Header/>
      <Base/>
      
    </>
  )
}

export default App
