
function Base () {

    let agua = 100;
    let luz = 100;

    <>
        <div className="flex-container">

            <div className="container">
                <h2 id="nomePlanta">Filomena</h2>
                <img src="#" alt="Planta imagem"></img>
                <p id="regar">${agua}% de água</p>
                <p id="sol">${luz}% de sol</p>
            </div>

        </div>
    
    </>

}

export default Base;