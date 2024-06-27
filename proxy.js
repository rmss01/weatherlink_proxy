const fetch = require("node-fetch"); // Requiere node-fetch@2
const express = require("express");
const fs = require("fs")
const path = require("path")

const app = express();
const api_key = "rli7dezcouymtb7y3zdgh8kbzjbqlvpz"; // api_key
const api_secret = "txipphs0aj3yi28sormy2ho1tyzywvvx" // api_secret
const dirHistorica = path.join(__dirname, 'dirHistorica') // Ruta donde se guardan los archivos historicos json

// En caso de uso le agrega los encabezados CORS en sus respuestas
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Reemplaza * con el origen permitido
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// /stations responde la lista de estaciones registradas a la cuenta de WeatherLink
app.get('/stations', async (req, res) => {
  response = await fetch("https://api.weatherlink.com/v2/stations?api-key=" + api_key, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const data = await response.json(); // El resultado lo guarda en data en formato Json

  res.json(data); // Retorna el Json con la lista de estaciónes metereológicas
})

// /stations/:id responde con los datos metereologicos de una estacion mediante su id
app.get('/stations/:id', async (req, res) => {
  const stationID = parseInt(req.params.id); // Obtiene el ID de la estación de los parámetros
  const archivo = "https://api.weatherlink.com/v2/current/" + stationID + "?api-key=" + api_key; // Ruta con ID de la estación para obtener los datos metereológicos
  response = await fetch(archivo, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const data = await response.json(); // El resultado lo guarda en data en formato Json
  //console.log(data);
  res.json(data); // Retorna el Json con los datos metereológicos de la estación
})


// Metodo que regresa datos historicos de una estacion mediante su id
app.get('/stations-historic/:id', async (req, res) => {
  const stationID = parseInt(req.params.id); // Obtiene el ID de la estación de los parámetros
  let nombreJson = stationID + ".json"; // Servirá como nombre del json
  let jsonPath = path.join(dirHistorica, nombreJson); // Obtiene la ruta principal del proyecto

  if (fs.existsSync(jsonPath)) {
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ error: 'Error al leer el archivo' });
        return;
      }
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData); // Retorna el json de la ruta jsonPath
      } catch (parseErr) {
        res.status(500).json({ error: 'Error al parsear el JSON' }); // Regresar un valor de error
      }
    });
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' }); // Regresar un valor de error
  }
});

// Función para recuperar los datos de cada estación disponible y guardarlos en un JSON para cada uno
async function makeHistoricJSON() {
  stations = await fetch("https://api.weatherlink.com/v2/stations?api-key=" + api_key, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const stationsList = await stations.json();
  // Para cada estacion:
  stationsList.stations.forEach(async station => {
    const archivo = "https://api.weatherlink.com/v2/current/" + station.station_id + "?api-key=" + api_key; // Ruta con ID de la estación para obtener los datos metereológicos
    let response = await fetch(archivo, {
      headers: {
        "X-api-secret": api_secret,
      }
    });
    
    let data = await response.json();
    // Recuperar los datos metereológicos en un nuevo json
    let sensorData = data['sensors'][0]['data'][0]; // Extraer los datos de data['sensors'][0]['data'][0]
    let newJson = {};
    newJson['timestamp'] = data.generated_at;
    for (let key in sensorData) {
      if (sensorData[key] !== null) {
        newJson[key] = sensorData[key]; // key es el tipo de dato metereologico
      }
    }
    

    let nombreJson = data.station_id + ".json"; // Servirá como nombre del json
    let jsonPath = path.join(dirHistorica, nombreJson); // Obtiene la ruta principal del proyecto

    // Si existe el json lo crea y le inserta los datos
    // Checa si existe el archivo

    let existingContent = [];
    if (fs.existsSync(jsonPath)) {
      
      // Leer el contenido existente
      existingContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
      // Actualizar el contenido existente
      existingContent.push(newJson);

      // Escribe de vuelta el contenido actualizado
      fs.writeFileSync(jsonPath, JSON.stringify(existingContent, null, 2), 'utf8');
      console.log(`File ${nombreJson} has been updated with initial content.`);
    
    
  });

}

// Función que utiliza makeHistoricJSON para almacenar datos historicos cada 8 horas
function updateHistoric(intervalId){
  const now = new Date(); // almacenar la fecha y hora de ese momento
  const minutes = now.getMinutes(); // [0-59]
  const hours = now.getHours(); // [0-24]
  
  // Si son las 0:00, 8:00 o 16:00, y es el minuto 0
  if (minutes === 44 && (hours === 0 || hours === 8 || hours === 21)) {
    makeHistoricJSON();
    
    // Detiene el interval cuando es true
    clearInterval(intervalId);
  } 
  
}

// La app se ejecuta en el puerto 3003
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);

  // Ejecutar la funcion updateHistoric() cada minuto
  const intervalId = setInterval(() => {
    updateHistoric(intervalId);
  }, 60 * 1000); // Ejecutar cada minuto
});