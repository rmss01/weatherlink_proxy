const fetch = require("node-fetch"); // Requiere node-fetch@2
const express = require("express");

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
  response = await fetch("https://api.weatherlink.com/v2/stations?api-key="+api_key, { // Fetch a la API V2 de WeatherLink
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

// Metodo que regresa datos historicos de una estacion mediante su id y un intervalo de tiempo
// NO SE REQUIERE   
app.get('/stations/historic/:id&:start_timestamp&:end_timestamp', async (req, res) => {
  const stationID = parseInt(req.params.id); // Obtiene el ID de la estación de los parámetros
  const startTimestamp = req.params.start_timestamp; // Obtiene el timestamp de inicio del intervalo de tiempo
  const endTimestamp = req.params.end_timestamp; // Obtien el timestamp de fin del intervalo de tiempo 
  // Ruta con ID de la estación, timestamp de inicios y de fin del intervalo de tiempo, para obtener los datos metereológicos históricos
  const archivo = `https://api.weatherlink.com/v2/historic/${stationID}?api-key` + api_key + `&start-timestamp=${startTimestamp}&end-timestamp=${endTimestamp}`; 
  
  response = await fetch(archivo, { // Fetch a la API V2 de WeatherLink
    headers: {
      "X-api-secret": api_secret,
    }
  });
  const historic = await response.json(); // El resultado lo guarda en historic en formato Json
  //console.log(data);
  res.json(historic);
})


// La app se ejecuta en el puerto 3003
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);

});