import L from 'leaflet'
import * as vega from 'vega'

L.vega = function (spec, options) {
  return new L.VegaLayer(spec, options);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  options: {
    // FIXME: uses window.vega
    vega: vega,

    // If Vega spec creates controls (inputs), put them all into this container
    bindingsContainer: undefined,

    // Options to be passed to the Vega's parse method
    parseConfig: undefined,

    // Options to be passed ot the Vega's View constructor
    viewConfig: undefined,

    // If true, graph will be repainted only after the map has finished moving (faster)
    delayRepaint: true,

    // optional warning handler:   (warning) => { ... }
    onWarning: false,

    // optional error handler:   (err) => { ...; throw err; }
    onError: false,
  },

  initialize: function (spec, options) {
    L.Util.setOptions(this, options);
    this._disableSignals = 0;
    this.disableSignals = () => {
      this._disableSignals++;
    };
    this.enableSignals = () => {
      this._disableSignals--;
      if (this._disableSignals < 0) {
        throw new Error('too many signal enables');
      }
    };
    this._spec = this._updateGraphSpec(spec);
  },

  /**
   * @param {L.Map} map
   * @return {L.VegaLayer}
   */
  addTo: function (map) {
    map.addLayer(this);
    // console.log('addTo')
    return this;
  },

  onAdd: function (map) {
    return Promise.resolve().then(() => {
      this.disableSignals();

      this._map = map;
      this._vegaContainer = L.DomUtil.create('div', 'leaflet-vega-container');
      map._panes.overlayPane.appendChild(this._vegaContainer);

      const vega = this.options.vega;

      const dataflow = vega.parse(this._spec, this.options.parseConfigp);

      // const oldLoad = this.options.viewConfig.loader.load.bind(this.options.viewConfig.loader);
      // this.options.viewConfig.loader.load = (uri, opt) => {
      //   console.log('Load', uri, opt);
      //   return oldLoad(uri, opt);
      // };
      this._view = new vega.View(dataflow, this.options.viewConfig);
      // console.log('booom');


      if (this.options.onWarning) {
        this._view.warn = this.options.onWarning;
      }

      if (this.options.onError) {
        this._view.error = this.options.onError;
      }

      this._view
        .padding({left: 0, right: 0, top: 0, bottom: 0})
        .initialize(this._vegaContainer, this.options.bindingsContainer)
        .hover();

      const onSignal = (sig, value) => this._onSignalChange(sig, value);

      this._view
        .addSignalListener('latitude', onSignal)
        .addSignalListener('longitude', onSignal)
        .addSignalListener('zoom', onSignal);

      map.on(this.options.delayRepaint ? 'moveend' : 'move', () => this._reset());
      map.on('zoomend', () => this._reset());

      return this._reset(true);
    }).then(this.enableSignals, this.enableSignals);
  },

  onRemove: function () {
    if (this._view) {
      this._view.finalize();
      this._view = null;
    }

    // TODO: once Leaflet 0.7 is fully out of the picture, replace this with L.DomUtil.empty()
    const el = this._vegaContainer;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  _onSignalChange: function (sig, value) {
    if (this._ignoreSignals) {
      return;
    }

    const map = this._map;
    let center = map.getCenter();
    let zoom = map.getZoom();

    switch (sig) {
      case 'latitude':
        center.lat = value;
        break;
      case 'longitude':
        center.lng = value;
        break;
      case 'zoom':
        zoom = value;
        break;
      default:
        return; // ignore
    }

    map.setView(center, zoom);

    this._reset(); // ignore promise
  },

  _reset: function (force) {

    return Promise.resolve().then(() => {
      this.disableSignals();

      if (!this._view) {
        return 0;
      }

      const map = this._map;
      const view = this._view;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._vegaContainer, topLeft);

      const size = map.getSize();
      const center = map.getCenter();
      const zoom = map.getZoom();

      function sendSignal(sig, value) {
        if (view.signal(sig) !== value) {
          view.signal(sig, value);
          return 1;
        }

        return 0;
      }


      // Only send changed signals to Vega. Detect if any of the signals have changed before calling run()
      let changed = 0;
      changed |= sendSignal('width', size.x);
      changed |= sendSignal('height', size.y);
      changed |= sendSignal('latitude', center.lat);
      changed |= sendSignal('longitude', center.lng);
      changed |= sendSignal('zoom', zoom);

      if (changed || force) {
        return view.runAsync();
      }
      return 0;
    }).then(this.enableSignals, this.enableSignals);
  },

  /*
   Inject signals into the spec
   TODO: make it less hacky - avoid spec modification
   */
  _updateGraphSpec: function (spec) {
    /**
     * Find all names that are not defined in the spec's section
     * @param {string} section
     * @param {Iterable.<string>} names
     * @return {Iterable.<string>}
     */
    const findUndefined = (section, names) => {
      if (!spec.hasOwnProperty(section)) {
        spec[section] = [];
        return names;
      } else if (!Array.isArray(spec[section])) {
        throw new Error('signals must be an array');
      }

      names = new Set(names);
      for (let obj of spec[section]) {
        // If obj has a name field, delete that name from the names
        // Set will silently ignore delete() for undefined names
        if (obj.name) names.delete(obj.name);
      }
      return names;
    };

    /**
     * Set spec field, and warn if overriding
     * @param {string} key
     * @param {*} value
     */
    const overrideField = (key, value) => {
      if (spec[key] && spec[key] !== value) {
        const msg = `Overriding ${key} 𐃘 ${value}`;
        if (this.options.onWarning) {
          this.options.onWarning(msg);
        } else {
          console.log(msg);
        }
      }
      spec[key] = value;
    };

    const mapSignals = ['zoom', 'latitude', 'longitude'];
    for (let sig of findUndefined('signals', mapSignals)) {
      spec.signals.push({name: sig});
    }

    for (let prj of findUndefined('projections', ['projection'])) {
      spec.projections.push({
        name: prj,
        type: 'mercator',
        scale: {signal: '256*pow(2,zoom)/2/PI'},
        rotate: [{signal: '-longitude'}, 0, 0],
        center: [0, {signal: 'latitude'}],
        translate: [{signal: 'width/2'}, {signal: 'height/2'}]
      });
    }

    overrideField('padding', 0);
    overrideField('autosize', 'none');

    return spec;
  }

});




// import { Layer, Class, Util, DomUtil } from 'leaflet'

// const VegaLayer = (Layer || Class).extend({
//     options: {
//         // If true, graph will be repainted only after the map has finished moving (faster)
//         delayRepaint: true,
//     },

//     initialize: function initialize(view, options) {
//         Util.setOptions(this, options);
//         this.view = view;
//     },

//     /**
//      * @param {L.Map} map
//      * @return {L.VegaLayer}
//      */
//     addTo: function addTo(map) {
//         map.addLayer(this);
//         return this;
//     },

//     onAdd: function onAdd(map) {
//         this.map = map;
//         this.vegaContainer = DomUtil.create('div', 'leaflet-vega-container');
//         map._panes.overlayPane.appendChild(this.vegaContainer);

//         this.view
//             .initialize(this.vegaContainer)
//             .hover()
//             .padding({ top: 0, left: 0, right: 0, bottom: 0 });

//         const onSignal = (sig, value) => this.onSignalChange(sig, value);

//         this.view
//             .addSignalListener('latitude', onSignal)
//             .addSignalListener('longitude', onSignal)
//             .addSignalListener('zoom', onSignal);

//         map.on(this.options.delayRepaint ? 'moveend' : 'move', () => this.update());
//         map.on('zoomend', () => this.update());

//         return this.update(true);
//     },

//     onRemove: function onRemove() {
//         if (this.view) {
//             this.view.finalize();
//             this.view = null;
//         }

//         // TODO: once Leaflet 0.7 is fully out of the picture, replace this with L.DomUtil.empty()
//         const el = this.vegaContainer;
//         while (el.firstChild) {
//             el.removeChild(el.firstChild);
//         }
//     },

//     onSignalChange: function onSignalChange(sig, value) {
//         const center = this.map.getCenter();
//         let zoom = this.map.getZoom();

//         switch (sig) {
//         case 'latitude':
//             center.lat = value;
//             break;
//         case 'longitude':
//             center.lng = value;
//             break;
//         case 'zoom':
//             zoom = value;
//             break;
//         default:
//             return; // ignore
//         }

//         this.map.setView(center, zoom);
//         this.update();
//     },

//     update: function update(force) {
//         const topLeft = this.map.containerPointToLayerPoint([0, 0]);
//         DomUtil.setPosition(this.vegaContainer, topLeft);

//         const size = this.map.getSize();
//         const center = this.map.getCenter();
//         const zoom = this.map.getZoom();

//         const sendSignal = (sig, value) => {
//             if (this.view && this.view.signal(sig) !== value) {
//                 this.view.signal(sig, value);
//                 return 1;
//             }
//             return 0;
//         };

//         // Only send changed signals to Vega. Detect if any of the signals have changed before calling run()
//         let changed = 0;
//         changed |= sendSignal('width', size.x);
//         changed |= sendSignal('height', size.y);
//         changed |= sendSignal('latitude', center.lat);
//         changed |= sendSignal('longitude', center.lng);
//         changed |= sendSignal('zoom', zoom);

//         if ((changed || force) && this.view) {
//             return this.view.runAsync();
//         }
//         return 0;
//     },
// });

// export default VegaLayer;