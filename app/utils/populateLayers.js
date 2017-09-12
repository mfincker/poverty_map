

export default function populateLayers(view) {
    const layers = Object.keys(view.data('geo_units')[0]["properties"])

    // Poverty layers
    const poverty_layers = layers.filter((x) => {return x.startsWith("poverty_")})

    // Population layers
    const population_layers = layers.filter((x) => {
    	return x === "total" || x.startsWith("non_") || x.startsWith("hispanic")})

    const current_layer = view.signal("layer")

                      
    document.getElementById('poverty').innerHTML = poverty_layers.reduce((innerHtml, l) => {
				return (l === current_layer)
						? innerHtml + '<label><input type="radio" name="layers" value="' + l + '" checked>' + l + "</label>"
						: innerHtml + '<label><input type="radio" name="layers" value="' + l + '">' + l + "</label>"}, '')

    document.getElementById('population').innerHTML = population_layers.reduce((innerHtml, l) => {
				return (l === current_layer)
						? innerHtml + '<label><input type="radio" name="layers" value="' + l + '" checked>' + l + "</label>"
						: innerHtml + '<label><input type="radio" name="layers" value="' + l + '">' + l + "</label>"}, '')


}



