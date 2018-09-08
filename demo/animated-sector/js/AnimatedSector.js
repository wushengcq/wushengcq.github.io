/*
 * @class AnimatedSector
 * @aka L.AnimatedSector
 * @inherits L.Circle
 *
 * A class for drawing animated sector on map. Extends `Circle`.
 *
 * @example
 *
 * ```js

 * L.AnimatedSector([50.5, 30.5], {radius: 500}).addTo(map);
 * ```
 */

L.AnimatedSector = L.Circle.extend({

    options: {
        pixelRadius: true,
		fill: true,
		fillColor: '#ffff00',
        fillOpacity: 0.2,
		fillGradient: true,
		border: 0,
		borderColor: '#dddddd',
		borderDashLine: false,
        directionAngle: 0,
        viewAngleRange: 140,
    },
	
	initialize: function(latlng, options, legacyOptions) {
		L.Circle.prototype.initialize.call(this, latlng, options, legacyOptions);
		options = L.Util.setOptions(this, options);
		this._timer_pendulum = null;
	},

    _updatePath: function () {
        this._renderer._updateSector(this);
    },

	pendulum: function(step, minAngle, maxAngle, interval) {
		if ( this._timer_pendulum !== null ) {
			clearInterval(this._timer_pendulum);
		}

		var angle = this.options.directionAngle;
        var trend = 1;
		var self = this;
        this._timer_pendulum = setInterval(function() {
            if (angle >= maxAngle) trend = -1;
            if (angle <= minAngle) trend = 1;
            angle +=  trend * step;
            self.setStyle({
                directionAngle: angle
            });
        }, (interval || 200));
	},

	stopPendulum: function() {
		if (this._timer_pendulum) {
			clearInterval(this._timer_pendulum);
		}
	},

	spin: function(step, interval) {
		this.pendulum(step, this.options.directionAngle, this.options.directionAngle * 100000, interval);
	},

	stopSpin: function() {
		this.stopPendulum();	
	},

});

L.Canvas.prototype._updateSector = function(layer) {
    if (!this._drawing || layer._empty()) { return; }

    var p = layer._point;
    var ctx = this._ctx;
    var ops = layer.options;
	var r = Math.round(layer._radius);

    this._drawnLayers[layer._leaflet_id] = layer;

    ctx.save();
    ctx.beginPath();
    ctx.translate(p.x, p.y);
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r,
        -(ops.directionAngle - ops.viewAngleRange / 2.0) * Math.PI / 180,
        -(ops.directionAngle + ops.viewAngleRange / 2.0) * Math.PI / 180, true);
    ctx.closePath();

	if (ops.fill) {
		if (ops.fillGradient) {
			var fs = ctx.createRadialGradient(0, 0, Math.floor(r/20.0), 0, 0, r);
			fs.addColorStop(0, ops.fillColor);
			fs.addColorStop(1, '#ffffff');
			ctx.fillStyle = fs;
		} else {
			ctx.fillStyle = ops.fillColor;
		}
		ctx.globalAlpha = ops.fillOpacity;
		ctx.fill();
	} 

	if (ops.border > 0) {
		ctx.lineWidth = ops.border;
		ctx.strokeStyle = ops.borderColor;
		if (ops.borderDashLine) {	
			ctx.setLineDash( L.Util.isArray(ops.borderDashLine) ? ops.borderDashLine : [8,4]);
		}
		ctx.stroke();
	}

    ctx.restore();
	return ctx;
}

L.animatedSector = function (latlng, options, legacyOptions){
    return new L.AnimatedSector(latlng, options, legacyOptions);
};


