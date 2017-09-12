import './index.css' // add css in the file during bundling
import '../node_modules/leaflet/dist/leaflet.css'
import L from 'leaflet'
import * as vega from 'vega';
import './utils/VegaLayer.js'
import { vega_spec } from './vega_spec/vega_spec.js'
import loadTopoJSON from './utils/loadTopoJSON.js'
import updateViewData from './utils/updateViewData.js'
import populateLayers from './utils/populateLayers.js'


/////////////////////
//// Leaflet Map ////
/////////////////////

// Initialize map
const poverty_map =  L.map('map').setView([37.16031654673677, -119.15771484375001], 6)

// Create a label pane - that appears on top of vega layer
poverty_map.createPane('labels')
poverty_map.getPane('labels').style.zIndex = 650
poverty_map.getPane('labels').style.pointerEvents = 'none' // avoid click registering on the label panes


// Basemap
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', 
 								{
 									maxZoom: 18, 
 									attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>'
 								}).addTo(poverty_map)

// L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
//   attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//   subdomains: 'abcd',
//   minZoom: 1,
//   maxZoom: 16,
//   ext: 'png'
// }).addTo(poverty_map)



// Labels
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png', 
                {
                  maxZoom: 18, 
                  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>',
                  pane: 'labels'
                }).addTo(poverty_map)



// Vega layers
const vega_layer = L.vega(vega_spec, 
									{
										delayRepaint: true
									})

vega_layer.addTo(poverty_map)


////////////////////
//// Fetch data ////
////////////////////

// Load county level data
let current_data = ''
let county_data = []

loadTopoJSON('./data/county_geo_data.s.q.topojson', "county_geo_data")
  .then(function(data) {
    county_data = data;
    // Initialize map with county data
    vega_layer._view.insert('geo_units', county_data)
                    .run()
                    .runAfter( (view) => {
                      populateLayers(view);
                    })

    current_data = 'county'
  });

// Load tract level data
let tract_data = [];

loadTopoJSON('./data/tract_geo_data.s.q.topojson', "tract_geo_data")
  .then(function(data) {
    tract_data = data;
  });

// Load block level data
let block_data = [];

loadTopoJSON('./data/block_geo_data.s.q.topojson', "block_geo_data")
  .then(function(data) {
    block_data = data;
  });

////////////////////////
//// Event handling ////
////////////////////////

// Zoom-based layer change
poverty_map.on('zoomend', function () {

    // county data at zoom <= 8    
    if (poverty_map.getZoom() <= 8 && 
        current_data !== 'county') {

        updateViewData(county_data)
        current_data = 'county'


    // county data at zoom > 8  && zoom <= 11
    } else if (poverty_map.getZoom() > 8  &&
               poverty_map.getZoom() <= 11 && 
               current_data !== 'tract') {

        updateViewData(tract_data)
        current_data = 'tract'


    // block data at zoom > 11
    } else if (poverty_map.getZoom() > 11 && 
               current_data !== 'block') {

        updateViewData(block_data)
        current_data = 'block'

    }


  });

// Radio input layer change
function changeLayer(e) {
  if (e.target.value && e.target !== e.currentTarget) {
        vega_layer._view.signal("layer", e.target.value)
                        .run()
    }
    e.stopPropagation();
}

document.getElementById("layers").addEventListener('click', changeLayer, false);


window.vega_layer = vega_layer;






////////////////////////////////////////////
  
  // const poverty_map =  L.map('map')
  //               .setView([37.16031654673677, -119.15771484375001], 6);

  // poverty_map.createPane('labels');
  // poverty_map.getPane('labels').style.zIndex = 650;
  // poverty_map.getPane('labels').style.pointerEvents = 'none'; // avoid click registering on the label panes

  // // Basemap
  // L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
  //       maxZoom: 18, 
  //       attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>'
  //     }).addTo(poverty_map);

  // // Labels
  // let labels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png', {
  //       maxZoom: 18, 
  //       attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>',
  //       pane: 'labels'
  //     })

  // labels.addTo(poverty_map);


  // // Vega vis
  // var vega_counties = L.vega(vega_county_spec, {
  //   delayRepaint: true
  // })

  // vega_counties.on('add', function(e) {
  //   console.log("vega_counties layer added to map");
  //   console.log(e.target);

  //   // populateLayers(e.target);
  // });

  // vega_counties.addTo(poverty_map);


  // poverty_map.on('zoomend', function () {
  //   if (poverty_map.getZoom() > 9 && poverty_map.hasLayer(vega_counties)) {
  //       poverty_map.removeLayer(vega_counties);
  //   }
  //   if (poverty_map.getZoom() < 9 && poverty_map.hasLayer(vega_counties) == false)
  //   {
  //       poverty_map.addLayer(vega_counties);
  //   }   
  // });


  // function changeLayer(event) {
  //   vega_counties._view.signal("layer", event.target.id).run();
  //   document.getElementById(event.target.id).checked = true;
  // }

  // function populateLayers(vega_layer) {
  //   //TODO: replace "counties" by geo_units once data files are ready
  //   const props  = vega_layer._view.data("counties")[0].properties;
  //   console.log(props);
  // }
