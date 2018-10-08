/*
 * @class LeadingLine
 * @aka L.LeadingLine
 * @inherits L.Polyline
 *
 * A class for drawing polyline with leading pattern. Extends `Polyline`.
 *
 * @example
 *
 * ```js

 * var latlngs = [[30.661057, 104.081757],[29.558176, 106.510338],[28.200825, 112.98127],[30.567514, 114.291939],[31.863255, 117.275703]];
 * var polyline = L.leadingLine(latlngs, {
 *		with: 14,
 *		color: '#ffff00',
 *		weight: 2,
 *		opacity: 0.8,
 * }).addTo(map);
 * ```
 */

L.LeadingLine = L.Polyline.extend({

	options: {
		weight: 14,
		color: '#ffff00',
		borderSize: 2,	
		borderColor: '#aaaaaa',
		signColor: '#ffffff',
		signInterval: 60,
	},
	
	initialize: function(latlngs, options) {
		L.Polyline.prototype.initialize.call(this, latlngs, options);
		this.leadingSign = this._createLeadingSign();
	},

	_updatePath: function() {
		this._renderer._updatePolyLeading(this, this.options.weight);
	},

	/**
	 * 因为做了buffer，所以图层的_bounds会比原来的polyline宽，不调整的话会出现绘制区域被裁剪的问题
	 * 地理空间的_bounds不能变化，变化后做pointClip的时候会不准确;
	 * 要修改的是像素的_pxBounds，像素_pxBounds在父类的_project函数中初始化，其中通过_clickTolerance的值对范围做了调整
	 * 刚好利用这一机制，把buffer的radius范围加入到 tolerance 的值中，修改边界的范围
	 */	
	_clickTolerance: function() {
		var w = L.Polyline.prototype._clickTolerance.call(this);
		return w + this.options.weight;
	},

	_createLeadingSign : function() {
		var icon = L.DomUtil.create('canvas');
		var ctx = icon.getContext('2d');
		var w = this.options.weight * 1;
		//var h = this.options.weight - this.options.borderSize * 2;
		var h = this.options.weight;
		icon.width = w;
		icon.height = h;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(w * 2 / 3, h/2);
		ctx.lineTo(0, h);

		ctx.lineWidth = 3;
		ctx.strokeStyle = this.options.signColor;
		ctx.lineCap = 'butt';
		ctx.lineJoin = 'miter' ;
		ctx.stroke();
		return icon;
	},

	_rotateLeadingSign: function(angle) {
		var icon = L.DomUtil.create('canvas');
		var ctx = icon.getContext('2d');
		var w = this.leadingSign.width;
		var h = this.leadingSign.height;
		icon.width = w;
		icon.height = h;
		ctx.save();
		ctx.translate(w/2, h/2);
		ctx.rotate(angle);
		ctx.translate(-w/2, -w/2);
		ctx.drawImage(this.leadingSign, 0, 0, w, h);
		ctx.restore();
		return icon;
	}
});

L.Canvas.prototype._updatePolyLeading = function(layer, weight, closed) {
	if (!this._drawing) { return; }
	var i, j, len2, p,
		parts = layer._parts,
		len = parts.length,
		ctx = this._ctx;

	if (!len) { return; }

	this._drawnLayers[layer._leaflet_id] = layer;

	ctx.save();
	
	ctx.beginPath();
	// origin polyline implementation
	for (i = 0; i < len; i++) {
		for (j = 0, len2 = parts[i].length; j < len2; j++) {
			p = parts[i][j];
			ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
		}
		if (closed) {
			ctx.closePath();
		}
	}
	this._fillStrokeLeadingBackground(ctx, layer);


	ctx.beginPath();
	for (i = 0; i < len; i++) {
		for (j = 0, len2 = parts[i].length; j < len2; j++) {
			p = parts[i][j];
			ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
		}
		if (closed) {
			ctx.closePath();
		}
	}
	this._fillStrokeLeadingForground(ctx, layer);

	var p1, p2, distance, count, length = 50, interval = layer.options.signInterval;
	for (i = 0; i < len; i++) {
		for (j = 0, len2 = parts[i].length - 1; j < len2; j++) {
			p1 = parts[i][j];
			p2 = parts[i][j+1];
			distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
			length += distance;
			count = parseInt(length / interval);
			if (count < 1) continue;
	
			thelta = Math.atan2(p2.y - p1.y, p2.x - p1.x);
			var sign = layer._rotateLeadingSign(thelta);
	
			for (var k=1; k <= count; k++) {
				length -= interval;
				ctx.drawImage(sign, 
					p1.x + (distance - length) * Math.cos(thelta) - sign.width / 2, 
					p1.y + (distance - length) * Math.sin(thelta) - sign.height / 2);
			}	
		}
	}

	ctx.restore();
}

L.Canvas.prototype._fillStrokeLeadingBackground = function (ctx, layer) {
	var options = layer.options;

	if (options.weight !== 0) {
		ctx.globalAlpha = options.opacity;
		ctx.lineWidth = options.weight;
		ctx.strokeStyle = options.borderColor;
		ctx.lineCap = options.lineCap;	
		ctx.lineJoin = options.lineJoin;
		ctx.stroke();
	}
}

L.Canvas.prototype._fillStrokeLeadingForground = function (ctx, layer) {
	var options = layer.options;

	if (options.weight !== 0) {
		ctx.globalAlpha = options.opacity;
		ctx.lineWidth = options.weight - options.borderSize * 2;
		ctx.strokeStyle = options.color;
		ctx.lineCap = options.lineCap;	
		ctx.lineJoin = options.lineJoin;
		ctx.stroke();
	}
}


L.leadingLine = function (latlngs, options){
	return new L.LeadingLine(latlngs, options);
};


