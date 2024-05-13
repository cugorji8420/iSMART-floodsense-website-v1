const secrets = require('/express/secrets.json');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require("node-fetch");
var bodyParser = require('body-parser');

let Application = { 
    sensorConfig:{},
    heliumHeader:{}
}

Application.heliumHeader = new fetch.Headers({
    "key": secrets.helium.key,
});
Application.sensorConfig.maxUplinks = 200;

/*
async function getDevices() {
    const response = await fetch("https://console.helium.com/api/v1/devices", {headers:Application.heliumHeader});
    return response.json(); // parses JSON response into native JavaScript objects
}
  
getDevices().then((data) => {
    //console.log(data); // JSON data parsed by `data.json()` call
});
*/


const app = express();
app.use(express.json());
app.use(express.static("express"));
app.use(bodyParser.json()); // for parsing application/json
// default URL for website
app.get('/', function(request,response){
    console.log(request);
    response.sendFile(path.join(__dirname+'/express/index.html'));
    //__dirname : It will resolve to your project folder.
});

app.get('/sensors', function(request,response){
    console.log(request);
    response.sendFile(path.join(__dirname+'/express/data/sensors.json'));
    //__dirname : It will resolve to your project folder.
});

app.post('/', function(request,response){
    console.log(request.body);
    response.end('POST request logged');
    //__dirname : It will resolve to your project folder.
});


app.post('/uplink', function(request,response){
    var when = Number(request.body.reported_at);
    var res = {msg:"",type:request.body.decoded_payload.handle}
    if(when < Date.now() - (120*1000)){
      when = Date.now();
    }
  
    if(res.type == "ignore;"){
      res.msg = 'Uplink Ignored';
      response.end(JSON.stringify(res));
    }
    else{
      pushUplink(request.body.id, request.body.decoded_payload, when);
      res.msg = 'Uplink Confirmed';
      response.end(JSON.stringify(res));
    }
});

function pushUplink(sensorID, payload, when){
    const fileName = './express/data/sensors.json';
    fs.readFile(fileName, 'utf8', function(err, file){ 
        var data = JSON.parse(file);
        payload.time = when;
        for(var sensor of data.sensors){
            if (sensor.id == sensorID){
                sensor.uplinks.push(payload);
                sensor.last_connected = when;
                sensor.status = 1;
                var deleteCount = sensor.uplinks.length - Application.sensorConfig.maxUplinks;
                if(deleteCount > 0){
                    sensor.uplinks.splice(0, deleteCount);
                }
            }
        }
        fs.writeFileSync(fileName, JSON.stringify(data, null, "\t"), function writeJSON2(err) {
            if (err) return console.log(err);
        });
    }, this); 
}

function updateDevices(){
    const fileName = './express/data/sensors.json';
    fs.readFile(fileName, 'utf8', function(err, file){ 
        var data = JSON.parse(file);
        var activityWindow = Date.now() - (86400000);
        for(var sensor of data.sensors){
            if (sensor.last_connected < activityWindow){
                sensor.status = 0;
            }
        }
        fs.writeFileSync(fileName, JSON.stringify(data, null, "\t"), function writeJSON(err) {
            if (err) return console.log(err);
        });
    }, this); 
}


setInterval(updateDevices, 360000);
const server = http.createServer(app);
const port = 9000;
server.listen(port);
console.log('Server listening on port ' + port);