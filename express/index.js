import secrets from './secrets.json' assert { type: 'json' };
import dict from './data/sensors.json' assert { type: 'json' };


document.querySelector('#tab2-sub1-btn').addEventListener('click', () => {
    setSubTab('acc');
});

document.querySelector('#tab2-sub2-btn').addEventListener('click', () => {
    setSubTab('ev_acc');
});

document.querySelector('#tab2-sub3-btn').addEventListener('click', () => {
    setSubTab('r_int');
});

mapboxgl.accessToken = secrets.map.accessToken;
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: secrets.map.style, // style URL
    center: [-74.02, 40.75], // starting position [lng, lat]
    zoom: 13 // starting zoom
});

dict.markers = [];

map.on('load', async () => { 
    map.addSource('trace', { type: 'geojson', data: "/data/sensors.geojson" });
    
    dict.sensors.forEach(addMarker);

    // on a regular basis, add more coordinates from the saved list and update the map
    const timer = setInterval(() => {
        const geojsonSource = map.getSource('trace');
        // Update the data after the GeoJSON source was created
        geojsonSource.setData({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {"name": "Null Island"},
                "geometry": {
                        "type": "Point",
                        "coordinates": [ 0, 0 ]
                    }
                }]
        });

        fetch('./data/sensors.json')
            .then((response) => response.json())
            .then((json) => dict.sensors = json.sensors);

        //update all markers
        
    }, 5000);
  
  const marker_up = setInterval(() => {
    updateMarkers(); 
  }, 10);
});

function addMarker(item) {
    // create a HTML element for each feature
   const elem = document.createElement('div');
   
   elem.setAttribute("class",
   "el");
   //elem.className = 'marker';
    // make a marker for each feature and add to the map
   var marker = new mapboxgl.Marker(elem);
   marker.setLngLat(item.position).addTo(map);
   marker.setPopup(addPopup(marker));

   marker.info = item.id;
   dict.markers.push(marker);
}


function addPopup(marker) {
    const popup = new mapboxgl.Popup({className: 'my-class'});
    popup.marker = marker;

    popup.on('open', () => {
        var sensor = findByID(popup.marker.info);
        var status = (sensor.status < 1) ? "Inactive" : "Active";
        popup.setHTML('<div class="sensor-popup"><h5><b>' + sensor.name + '</b></h5><p><b>Status:</b> ' + status + '</p><p><b>Location:</b> ' + sensor.position.lat + ', ' + sensor.position.lng + '</p></div>');
        document.getElementById("mySidenav").style.width = "480px";
        eventSelection(sensor.id, 'open');
    })

    popup.on('close', () => {
        var sensor = findByID(popup.marker.info);
        eventSelection(sensor.id, 'close');
    })

    return popup;
}

function updateMarkers() {
    //document.getElementById("mySidenav").style.width = "250px";
    for (var marker of dict.markers){
    var stringVal = "blue";
    var stingVal = "blue";
    var found =  findByID(marker.info);
    if(found != null){
        switch (found.status) {
            case 0:
                stringVal = "#DCDCDC";
                stingVal = "#DCDCDC";
                break;
            case 1:
                stringVal = "#2b95fe";
                stingVal = "#004dad";
                break;
            case 2:
                stringVal = "#ff4646";
                stingVal = "#ffabab";
                break;
            default:
                stringVal = "green";
                break;
        }
    }
    marker.getElement().style.setProperty('--sens-col', stringVal);
    marker.getElement().style.setProperty('--sens-bck', stingVal);           
    }
}

function findByID(id){
    for (var sens of dict.sensors){
        if (sens.id == id){
            return sens;
        }
    }
}

function findUplinkData(sensorID, dataKey, reference, interval){
    let sensor = {};
    for (var sens of dict.sensors){
        if (sens.id == sensorID){
            sensor = sens;
            break;
        }
    }

    if(sensor.hasOwnProperty('uplinks')){
        for (var data of sensor.uplinks){
            console.log([(data.time > reference-interval), (reference >= data.time), reference-interval, data.time, reference])
            if (reference-interval < data.time && data.time <= reference){
                switch(dataKey){
                    case 'volt':
                        return {dt:data.voltage, handle:data.handle};
                    case 'dist':
                        return {dt:data.distance, handle:data.handle};
                    case 'acc':
                        return {dt:data.acc, handle:data.handle};
                    case 'ev_acc':
                        return {dt:data.ev_acc, handle:data.handle};
                    case 'tot_acc':
                        return {dt:data.tot_acc, handle:data.handle};
                    case 'r_int':
                        return {dt:data.r_int, handle:data.handle}; 
                    default:
                        console.error("Unrecognized dataKey '" + dataKey +"'")
                        break;
                }
            }
        }
    }
    return {dt:null, handle:'null'};
}

function eventSelection(sensorId, cmd){
    if(cmd == 'open'){
        const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

        const d = new Date();
        let day = weekday[d.getDay()];

        const f = new Date(findByID(sensorId).date_activated);
        var fst = weekday[f.getDay()] + ", " + month[f.getMonth()] + " " + f.getDate().toString() + ", " + f.getFullYear().toString();
        
        const l = new Date(findByID(sensorId).last_connected);
        var lst = weekday[l.getDay()] + ", " + month[l.getMonth()] + " " + l.getDate().toString() + ", " + l.getFullYear().toString();

        document.getElementById("mySidenav").style.width = "480px";
        document.getElementById("sensName").innerHTML = findByID(sensorId).name;
        document.getElementById("instDate").innerHTML = fst;
        document.getElementById("heardDate").innerHTML = lst;
        document.getElementById("heardTime").innerHTML = l.toLocaleTimeString();
        setCharts(sensorId);
    }
    else{
        document.getElementById("mySidenav").style.width = "0px";
        clearCharts();
    }
}


var charter = {
    sensorId:"",
    intervalIds:[],
    interVal:60
};

function clearCharts(){ 
    charter.sensorId = "";
    console.log(charter.intervalIds);
    for(const [key, value] of Object.entries(charter.intervalIds)){
        clearInterval(value.intV);
    }
    charter.intervalIds = [];
}

function setCharts(id){
    clearCharts();
    charter.sensorId = id;
    var arr = [
        {
            id:'volt-chart',
            min: 0,
            max: 5,
            yAxis: 'Voltage',
            plot:'Scatter',
            interval: 0.5,
            key: 'volt'
        },
         {
           id:'rain-chart',
           min: 0,
           max: 300,
           yAxis: 'Total Accumulation',
           plot: 'Scatter',
           interval: 10,
           key: 'tot_acc'
         },
        {
            id:'dist-chart',
            min: 300,
            max: 5000,
            yAxis: 'Distance (mm) to Ground',
            plot:'Scatter',
            interval: 500,
            key: 'dist' 
        }
    ];
    for (var x of arr){
        setChart(x);
    }
    setSubTab("ev_acc");
}

function setupChart(spec){
    var set = [];
    var i = 0;
    var span = 3600/charter.interVal;
    var presection = Date.now();
    for (i = 0; i <= span; i++) {
        var section = presection-(i*charter.interVal*1000);
        var findUlink = findUplinkData(charter.sensorId, spec.key, section, charter.interVal*1000);
        set[(span-1)-i] = { x: new Date(section), y: findUlink.dt, color: handleColor(findUlink.handle)};
    }

    // Creating real time chart
    var chartEr = new ej.charts.Chart({
        series: [{
            pointColorMapping: "color",
            type: spec.plot,
            dataSource: set,
            xName: "x",
            yName: "y",
            animation: { enable: false },
        }],
        primaryXAxis: {
            valueType: 'DateTime',
            title: 'Time',
            interval: 10,
            intervalType: 'Minutes',
            labelFormat: "h:mm a"
        },
        primaryYAxis: {
            valueType: 'Double',
            // Numeric axis range
            minimum: spec.min,
            maximum: spec.max,
            interval: spec.interval,
            title: spec.yAxis,
        },
        tooltip: {enable: true},
        width: '400', 
        height: '340'
    });
    chartEr.appendTo('#'+spec.id);

    return {chart:chartEr, data:set};
}

function handleColor(type){
  switch(type){
      case 'err': 
        return 'red';
      case 'push': 
        return 'blue';
      case 'test': 
        return 'grey';
      default: 
        return 'none';
  }
}

function setChart(spec){
// Creating live data
var setUp = setupChart(spec);
console.log(setUp);
charter.intervalIds[spec.id] = {
    chart:setUp.chart,
    dataSeries:setUp.data,
    date:Date.now(),
    max:spec.max,
    intV:parseInt(setInterval(function() {
    
    var value = 0;
    if (document.getElementById(spec.id) === null) {
        clearInterval(charter.intervalIds[spec.id].intV);
    } else {
      value = Math.random() * charter.intervalIds[spec.id].max;
      var section = Date.now();
      var findUlink = findUplinkData(charter.sensorId, spec.key, section, charter.interVal*1000);
      charter.intervalIds[spec.id].dataSeries.push({ x: new Date(section), y: findUlink.dt, color: handleColor(findUlink.handle)});
      charter.intervalIds[spec.id].date = Date.now();
      charter.intervalIds[spec.id].dataSeries.shift();
      charter.intervalIds[spec.id].chart.series[0].dataSource = setUp.data;
      charter.intervalIds[spec.id].chart.refresh();
    }
  }, charter.interVal*1000).toString()
)};

}


function setSubTab(tag){
    clearInterval(charter.intervalIds['rain-chart'].intV);
    var x = {
      id:'rain-chart',
      min: 0,
      max: 10,
      yAxis: "label",
      plot:'Scatter',
      interval: 1,
      key: tag
    };
    switch(tag){
        case 'acc':
            x.yAxis = "[acc] Accumulation (mm)";
            break;
        case 'ev_acc':
            x.yAxis = "[ev_acc] Event Accumulation (mm)";
            x.max = 80;
            x.interval = 10;
            break;
        case 'tot_acc':
            x.yAxis = "[tot_acc] Total Accumulation (mm)";
            break;
        case 'r_int':
            x.yAxis = "[r_int] Rain Intensity (mm/h)";
            x.max = 80;
            x.interval = 10;
            break; 
        default:
            console.error("Unrecognized tag '" + tag +"'")
            break;
    }
    
    setChart(x);
}