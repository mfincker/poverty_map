const vega_spec = 
{
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 200,
  "height": 200,
  "autosize": "none",

  "signals": [
    {"name": "layer","value": "poverty_rate"},
    {"name": "zoom"},
    {"name": "latitude"},
    {"name": "longitude"},
    {"name": "northEast_lng", "value": -108},
    {"name": "northEast_lat", "value": 44},
    {"name": "southWest_lng", "value": -131},
    {"name": "southWest_lat", "value": 25},
  ],

  "data": [
    {
      "name": "geo_units",
      "transform": [
        {
          "type": "formula",
          "as": "selected_layer",
          "expr": "datum.properties[layer]"
        }
      ]
    },
    {
      "name": "geo_units_filtered",
      "source": "geo_units",
      "transform": [
        {
          "type": "filter",
          "expr": "(datum.properties.northEast_lat >= southWest_lat && datum.properties.northEast_lng >= southWest_lng) && (datum.properties.southWest_lat <= northEast_lat && datum.properties.southWest_lng <= northEast_lng)"
        }
      ]
    }
  ],

  "projections": [
    {
      "name": "projection",
      "type": "mercator",
      // 256 is the tile size in pixels. The world's width is (256 * 2^zoom)
      // d3 mercator scaling is (world / 2 / PI)
      "scale": {"signal": "256*pow(2,zoom)/2/PI"},
      "rotate": [{"signal": "-longitude"}, 0, 0],
      "center": [0, {"signal": "latitude"}],
      "translate": [{"signal": "width/2"}, {"signal": "height/2"}]
    }
  ],

  "scales": [
    {
      "name": "color",
      "type": "quantize",
      "domain": {"data": "counties","field": "selected_layer"},
      "range": {"scheme": "blues-9"}
    }
  ],

  "marks": [
    {
      "type": "shape",
      "from": {"data": "geo_units_filtered"},
      "encode": {
        "update": {
          "fill": {"scale": "color","field": "selected_layer"},
          "fillOpacity": {"value": 0.7}
        },
        "hover": {"fill": {"value": "red"}}
      },
      "transform": [{"type": "geoshape","projection": "projection"}]
    }
  ]
}

export { vega_spec };