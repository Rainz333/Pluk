import { useState } from 'react'
import './index.css'
import Header from './Header'
import ReactFirebase from './ReactFirebase/ReactFirebase'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Header/><br/>

      <h2>Suas Plantinhas</h2>

      <ReactFirebase/>
      
      {/*Flex box das plantas*/}
      <div className="plant-vase">

        <div className="vase">
            <h2 id="nomePlanta">Filomena</h2>
            <img src='assets/planta1.png' alt="Planta imagem"></img>
            <p id="regar">agua% de água</p>
            <p id="sol">luz% de sol</p>
        </div>

        <div className="vase">
            <h2 id="nomePlanta2">Joana</h2>
            <img src='assets/planta2.png' alt="Planta imagem"></img>
            <p id="regar">agua% de água</p>
            <p id="sol">luz% de sol</p>
        </div>

         {/*Botão pra addplantas*/}
        <div className='bCase'>
          <button id='addPlant'>+</button>
          <p>Adicionar Planta</p>
        </div>

      </div>

      

      
    </>
  )
}

export default App
