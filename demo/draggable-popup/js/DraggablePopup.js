/*
 * @class DraggablePopup
 * @aka L.DraggablePopup
 * @inherits L.Popup
 *
 * A class for drawing dragglable popup. Extends `Popup`.
 *
 * @example
 *
 * ```js
 * var popup = L.draggablePopup()
 *   .setLatLng(latlng)
 *   .setContent('<p>Hello world!<br />This is a nice popup.</p>')
 *   .addTo(map);
 * ```
 */

var POPUP_TAIL_PANE = 'popup-tail-pane';

L.DraggablePopup = L.Popup.extend({

	overrideOptions: {
		// override some setting of Popup by force 
		autoPan: false,
		autoClose: false,
		closeOnEscapeKey: false,
		offset: [0, 0], // enable calculation result point to the center of _contentNode
	},

	options: {
		// set default options of DraggablePopup
		closeButton: false,
		popupLatLng: null,
		backgroundColor: '#f6f6f6',
		backgroundOpacity: 1,
		borderWidth: 1,
		borderStyle: 'solid',
		tailWeightHorizontal: 10,
		tailWeightVertical: 7,
	},
	
	initialize: function(options) {
		if (!options) options = {};
		// override some user's options
		for (var key in this.overrideOptions) {
			options[key] = this.overrideOptions[key];
		}
		// set default options
		this._popupLatLng = null;
		L.Util.setOptions(this, options);
		L.Popup.prototype.initialize.call(this, options);
		this._animatingZoom = false;
	},

	onAdd: function (map) {
		L.Popup.prototype.onAdd.call(this, map);
		// DraggablePopup is subclass of Layer
		// enable draggable when adding it to map
		this._draggable(map);
	},

	onRemove: function(map) {
		L.Popup.prototype.onRemove.call(this, map);
		if (this._tail) {
			map.removeLayer(this._tail);
			// don't set _tail to null, 
			// otherwise, reopen popup can't find the _tail object
			// this._tail = null;
		}
	},

	setLatLng: function(latlng) {
		// if this popup has been dragged, then disable setLatLng function
		// and the current _latlng is changed in drag event processing
		if (!this._popupLatLng) {
			L.Popup.prototype.setLatLng.call(this, latlng);
		}
		return this;
	},

	setAnchorLatLng: function(latlng) {
		this._anchor = latlng;
		// by default, popup poistion identical to the anchor position
		if (!this._popupLatLng) {
			this.setPopupLatLng(latlng);
		}
		return this;
	},

	setPopupLatLng: function(latlng) {
	    this._latlng = latlng;
		this._popupLatLng = latlng;
		return this;
	},

	_initLayout: function () {
		L.Popup.prototype._initLayout.call(this);
		// hide the original tip
		L.DomUtil.removeClass(this._tip, 'leaflet-popup-tip');
		// L.DomUtil.removeClass(this._container, 'leaflet-zoom-animated');
		// enable set background color of popup
		var ops = this.options;
		this._wrapper.style.backgroundColor = ops.backgroundColor;
		this._wrapper.style.borderStyle     = ops.borderStyle;
		this._wrapper.style.borderWidth     = ops.borderWidth;
		this._wrapper.style.borderColor     = ops.borderColor ? ops.borderColor : ops.backgroundColor;

		if (!this._tail) {
			// initial popup pane
			this._map._getPopupTailPane();
			// create a tail of popup
			this._tail = L.polygon([], {
				pane:        POPUP_TAIL_PANE,
				color:       ops.borderColor, 
				fillColor:   ops.backgroundColor, 
				weight:      ops.borderWidth,
				fillOpacity: ops.backgroundOpacity,
			});
		}
	},

	_draggable: function(map) {
		map.on('zoomstart', map._hidePopupTailPane)
		map.on('zoomend',   map._showPopupTailPane)

		if (this._tail) {
			this._tail.addTo(map);
		}

		var self = this;

		new L.Draggable(this._container, this._wrapper).on('drag', function(e){
				self._updateTipLayout(this._newPos);	
			}).on('dragend', function(e) {
				var pos = map.layerPointToLatLng(this._newPos);
				// set current position directly, instead of using setLatLng(latlng) function
				self._latlng = pos;
				self.setPopupLatLng(pos);
			}).enable();

		L.DomUtil.addClass(self._container, 'leaflet-grab leaflet-touch-drag');	
	},

	_updateTipLayout: function(newPos) {
		if (!newPos) {
			// before dragging, the anchor and popup position are overlap
			newPos = this._map.latLngToLayerPoint(this._anchor ? this._anchor : this._latlng);
		} else {
			this.setPopupLatLng(this._map.layerPointToLatLng(newPos));
		}

		var tailWidth  = this._wrapper.offsetWidth  / this.options.tailWeightHorizontal;
		var tailHeight = this._wrapper.offsetHeight / this.options.tailWeightVertical; 
		var offset = this._tipContainer.offsetHeight + this._wrapper.offsetHeight / 2;
		var center = L.point([Math.round(newPos.x), Math.round(newPos.y - offset)]);
		var anchor = this._map.latLngToLayerPoint(this._anchor);
	
		var tanA = this._wrapper.offsetHeight * 1.0 / this._wrapper.offsetWidth;
		var tanB = Math.abs((center.y - anchor.y) * 1.0 / (center.x - anchor.x)); 

		var a,b,c;
		if (tanA < tanB) {
			a = this._map.layerPointToLatLng(center.subtract([ tailWidth, 0]));
			b = this._map.layerPointToLatLng(center.subtract([-tailWidth, 0]));
		} else {
			a = this._map.layerPointToLatLng(center.subtract([0, -tailHeight]));
			b = this._map.layerPointToLatLng(center.subtract([0,  tailHeight]));
		}
		
		c = this._anchor;

		if (this._tail) {
			this._tail.setLatLngs([a,b,c]);
		}
	},

    _updatePosition: function () {
		L.Popup.prototype._updatePosition.call(this);
		// If there is a previous popup position existed, use it. 
		// Otherwise, popup will jump back to anchor position
		var pos = this._popupLatLng ? this._map.latLngToLayerPoint(this._popupLatLng) : null;
		this._updateTipLayout(pos);
    },

	_animateZoom: function (e) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center),
		anchor = this._getAnchor();
		L.DomUtil.setPosition(this._container, pos.add(anchor));
		//console.log(this._tail);
		//L.DomUtil.setPosition(this._tail.getPane(), pos.add(anchor));
		//L.DomEvent.stop(e);
		//this._updateTipLayout(pos.add(anchor));
	},

});


L.draggablePopup = function (options){
	return new L.DraggablePopup(options);
};

L.Map.include({
	_getPopupTailPane: function() {
		var pane = this.getPane(POPUP_TAIL_PANE) ?
			this.getPane(POPUP_TAIL_PANE) : this.createPane(POPUP_TAIL_PANE);
		return pane;
	},
	_hidePopupTailPane: function() {
		this._getPopupTailPane().style.display = 'none';
	},
	_showPopupTailPane: function() {
		this._getPopupTailPane().style.display = '';
	}
})
