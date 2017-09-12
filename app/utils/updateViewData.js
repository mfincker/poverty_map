import * as vega from 'vega'
import populateLayers from './populateLayers.js'

export default function updateViewData(newData) {
	vega_layer._view.change('geo_units',  vega.changeset()
                                                  .remove(() => 1)
                                                  .insert(newData))
                        .run()
                        .runAfter( (view) => {

	                      populateLayers(view)
	                    })
}