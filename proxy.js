const fetch = require("node-fetch"); // Requiere node-fetch@2
const express = require("express");
const fs = require("fs")
const path = require("path")

const app = express();
const api_key = "rli7dezcouymtb7y3zdgh8kbzjbqlvpz"; // api_key
const api_secret = "txipphs0aj3yi28sormy2ho1tyzywvvx" // api_secret

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

/*
// Metodo que regresa datos historicos de una estacion mediante su id
app.get('/stations-historic/:id', async (req, res) => {
  const stationID = parseInt(req.params.id); // Obtiene el ID de la estación de los parámetros

  let nombreJson = stationID + ".json"; // Servirá como nombre del json
  let jsonPath = path.join(__dirname, nombreJson); // Obtiene la ruta principal del proyecto

  if (fs.existsSync(jsonPath)) {
    const archivo = "/" + nombreJson;

    const resultado = await fetch(archivo);
    
    res.json(resultado) // Retorna el json de la ruta jsonPath
  } else {
    // Regresar un valor de error
  }

})
*/
// Metodo que regresa datos historicos de una estacion mediante su id
app.get('/stations-historic/:id', async (req, res) => {
  const stationID = parseInt(req.params.id); // Obtiene el ID de la estación de los parámetros
  let nombreJson = stationID + ".json"; // Servirá como nombre del json
  let jsonPath = path.join(__dirname, nombreJson); // Obtiene la ruta principal del proyecto

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


// Funcion que hace pide los datos de una estación determinada
/*async function automatic(stationID) {

  const archivo = "https://api.weatherlink.com/v2/current/" + stationID + "?api-key=" + api_key; // Ruta con ID de la estación para obtener los datos metereológicos
  response = await fetch(archivo, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const data = await response.json(); // El resultado lo guarda en data en formato Json
  return data
}*/

// Función para recuperar los datos de cada estación disponible y guardarlos en un JSON para cada uno
async function makeHistoricJSON() {
  stations = await fetch("https://api.weatherlink.com/v2/stations?api-key=" + api_key, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const stationsList = await stations.json();
  // Para cada estacion:
  stationsList.forEach(async station => {
    const archivo = "https://api.weatherlink.com/v2/current/" + station.station_id + "?api-key=" + api_key; // Ruta con ID de la estación para obtener los datos metereológicos
    let response = await fetch(archivo, {
      headers: {
        "X-api-secret": api_secret,
      }
    });
    
    let data = await response.json();
    // Recuperar los datos metereológicos en un nuevo json
    let sensorData = data['sensors'][0]['data'][0]; // Extraer los datos de data['sensors'][0]['data'][0]
    let newJson = {}
    for (let key in sensorData) {
      if (sensorData[key] !== null) {
        newJson[key] = sensorData[key]; // key es el tipo de dato metereologico
      }
    }
    newJson['timestamp'] = data.generated_at;

    let nombreJson = data.station_id + ".json"; // Servirá como nombre del json
    let jsonPath = path.join(__dirname, nombreJson); // Obtiene la ruta principal del proyecto

    // Si existe el json lo crea y le inserta los datos
    // Checa si existe el archivo
    if (fs.existsSync(jsonPath)) {
      // Leer el contenido existente
      const existingContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Mezclar el contenido existente con el nuevo
      const updatedContent = { ...existingContent, ...newJson };

      // Escribe de vuelta el contenido actualizado
      fs.writeFileSync(jsonPath, JSON.stringify(updatedContent, null, 2), 'utf8');
      console.log(`File ${nombreJson} has been updated with initial content.`);
    } else {
      // Crear el archivo directamente con el contenido nuevo
      fs.writeFileSync(jsonPath, JSON.stringify(newJson, null, 2), 'utf8');
      console.log(`File ${nombreJson} has been created.`);
    }
  });

}

// Helper function to calculate the delay until the next execution time
function calculateDelay(hour) {
  const now = new Date();
  let nextTime = new Date(now);
  nextTime.setHours(hour, 0, 0, 0);

  if (nextTime <= now) {
    nextTime.setDate(nextTime.getDate() + 1); // Set to next day if time has passed
  }

  return nextTime - now;
}

// Función que utiliza makeHistoricJSON para almacenar datos historicos cada 8 horas
async function updateHistoricJSONS() {
  // List of times to run the function (in 24-hour format)
  const hours = [8, 16, 0];

  // Sort the hours to handle the case where some hours have passed for today
  hours.sort((a, b) => a - b);

  // Find the next hour to run the function
  const now = new Date();
  const currentHour = now.getHours();
  let nextHour = hours.find(hour => hour > currentHour);

  if (nextHour === undefined) {
    nextHour = hours[0];
  }

  const delay = calculateDelay(nextHour);
  console.log("Next execution at: " + new Date(now.getTime() + delay).toLocaleTimeString()); // Borrar en produccion

  // Set a timeout for the initial call
  setTimeout(function initialCall() {
    makeHistoricJSON();

    // Set an interval for subsequent calls
    setInterval(() => {
      makeHistoricJSON();
    }, 8 * 60 * 60 * 1000); // 8 hours in milliseconds

  }, delay);

}

// Arrancar la actualizacion de JSONs
updateHistoricJSONS();

// La app se ejecuta en el puerto 3003
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);

});