// UMD initialization to work with CommonJS, AMD and basic browser script include
(function (factory) {
	var L;
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['leaflet'], factory);
	} else if (typeof module === 'object' && typeof module.exports === "object") {
		// Node/CommonJS
		L = require('leaflet');
		module.exports = factory(L);
	} else {
		// Browser globals
		if (typeof window.L === 'undefined')
			throw 'Leaflet must be loaded first';
		factory(window.L);
	}
}(function (L) {

L.Playback = L.Playback || {};

L.Playback.Util = L.Class.extend({
  statics: {

    DateStr: function(time) {
      return new Date(time).toDateString();
      //return new Date(time).toUTCString(); //if you want UTC time
    },

    TimeStr: function(time) {
      var d = new Date(time);
      var h = d.getHours();
      var m = d.getMinutes();
      var s = d.getSeconds();
      var tms = time / 1000;
      var dec = (tms - Math.floor(tms)).toFixed(2).slice(1);
      var mer = 'AM';
      
      if (h > 11) {
        h %= 12;
        mer = 'PM';
      } 
      if (h === 0) h = 12;
      if (m < 10) m = '0' + m;
      if (s < 10) s = '0' + s;
      
      tzo = -d.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num) {
          var norm = Math.abs(Math.floor(num));
          return (norm < 10 ? '0' : '') + norm;
      };
      
      return h + ':' + m + ':' + s + ' ' + mer + dif + pad(tzo / 60) 
      + ':' + pad(tzo % 60);;
    },

    ParseGPX: function(gpx) {
      var geojson = {
        type: 'Feature',
        geometry: {
          type: 'MultiPoint',
          coordinates: []
        },
        properties: {
          time: [],
          speed: [],
          altitude: []
        },
        bbox: []
      };
      var xml = $.parseXML(gpx);
      var pts = $(xml).find('trkpt');
      for (var i=0, len=pts.length; i<len; i++) {
        var p = pts[i];
        var lat = parseFloat(p.getAttribute('lat'));
        var lng = parseFloat(p.getAttribute('lon'));
        var timeStr = $(p).find('time').text();
        var eleStr = $(p).find('ele').text();
        var t = new Date(timeStr).getTime();
        var ele = parseFloat(eleStr);

        var coords = geojson.geometry.coordinates;
        var props = geojson.properties;
        var time = props.time;
        var altitude = geojson.properties.altitude;

        coords.push([lng,lat]);
        time.push(t);
        altitude.push(ele);
      }
      return geojson;
    }
  }

});

L.Playback = L.Playback || {};

L.Playback.MoveableMarker = L.Marker.extend({    
    initialize: function (startLatLng, options, feature) {    
        var marker_options = options.marker || {};
        
        this.photoHtml='';
        this.statusHtml='';

        if (jQuery.isFunction(marker_options)){        
            marker_options = marker_options(feature);
            if (jQuery.isFunction(marker_options.icon))
            {
            	marker_options.icon = marker_options.icon(feature);            
        	}
        }
        
        if (marker_options.getPopup){
        	marker_options.title =   marker_options.getPopup(feature);            
        }
        
        if (marker_options.title === null ||  typeof( marker_options.title) === 'undefined' || marker_options.title.length <= 0 )  marker_options.title = "Unknown";
        
        L.Marker.prototype.initialize.call(this, startLatLng, marker_options);
        
        this.popupContent = '';
        this.feature = feature;
		
        if (marker_options.getPopup){
            this.popupContent = marker_options.getPopup(feature);            
        }
        
        if(options.popups)
        {
            this.bindPopup(this.getPopupContent() + startLatLng.toString());
        }
        	
        if(options.labels)
        {
            if(this.bindLabel)
            {
                this.bindLabel(this.getPopupContent());
            }
            else
            {
                console.log("Label binding requires leaflet-label (https://github.com/Leaflet/Leaflet.label)");
            }
        }
        
        
        
        this.on("popupopen",function(e){

        	var mmsi = this.feature.properties.ship.mmsi;
        	var thisShipMarker = this;
        	var shipImgUrl = "http://boatbeaconapp.com/web-shipheaderfetch.php?width=150&height=75&userSubmit=0&mmsi="+mmsi+"&user=1234&registered=1";
        	$.get(shipImgUrl, function( data){

        		thisShipMarker.imgUrl = data;
        		thisShipMarker.photoHtml = "<div style='width=90%%;text-align:center'>"+thisShipMarker.imgUrl+"</div>";
        		thisShipMarker._popup.setContent(thisShipMarker.photoHtml + thisShipMarker.getPopupContent() + thisShipMarker.statusHtml);
        	});
        });
        
    },
    
    getPopupContent: function() {
        if (this.popupContent !== ''){
            return '<b>' + this.popupContent + '</b><br/>';
        }
        
        return '';
    },

    move: function (latLng, transitionTime,mystatus) {
        // Only if CSS3 transitions are supported
        if (L.DomUtil.TRANSITION) {
            if (this._icon) { 
                this._icon.style[L.DomUtil.TRANSITION] = 'all ' + transitionTime + 'ms linear'; 
                if (this._popup && this._popup._wrapper)
                    this._popup._wrapper.style[L.DomUtil.TRANSITION] = 'all ' + transitionTime + 'ms linear'; 
            }
            if (this._shadow) { 
                this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + transitionTime + 'ms linear'; 
            }
        }
        this.setLatLng(latLng);
        
        if (this._popup) {
        	if (mystatus!== null && typeof( mystatus) !== 'undefined' && typeof( mystatus.sog)  !== 'undefined' )
        	{ 
        		var heading= mystatus.hdg;
        		this.markerStatus=mystatus;
        		this.statusHtml= this._latlng.toString() + "<br>SOG:" +  mystatus.sog +  "Kts HDG: " + mystatus.hdg + "T COG: " + mystatus.cog + "T";
        		
        	}
        	else
        	{
        		this.statusHtml=this._latlng.toString();
        		
        		
        	}
        	
        	this._popup.setContent(this.photoHtml + this.getPopupContent() + this.statusHtml);
        }    
    },
    
    // modify leaflet markers to add our rotation code
    /*
     * Based on comments by @runanet and @coomsie 
     * https://github.com/CloudMade/Leaflet/issues/386
     *
     * Wrapping function is needed to preserve L.Marker.update function
     */
    _old__setPos:L.Marker.prototype._setPos,
    
    _updateImg: function (i, a, s) {
        a = L.point(s).divideBy(2)._subtract(L.point(a));
        var transform = '';
        transform += ' translate(' + -a.x + 'px, ' + -a.y + 'px)';
        transform += ' rotate(' + this.options.iconAngle + 'deg)';
        transform += ' translate(' + a.x + 'px, ' + a.y + 'px)';
        i.style[L.DomUtil.TRANSFORM] += transform;
    },
    setIconAngle: function (iconAngle) {
        this.options.iconAngle = iconAngle;
        if (this._map)
            this.update();
    },
    _setPos: function (pos) {
        if (this._icon) {
            this._icon.style[L.DomUtil.TRANSFORM] = "";
        }
        if (this._shadow) {
            this._shadow.style[L.DomUtil.TRANSFORM] = "";
        }

        this._old__setPos.apply(this, [pos]);
        if (this.options.iconAngle) {
            var a = this.options.icon.options.iconAnchor;
            var s = this.options.icon.options.iconSize;
            var i;
            if (this._icon) {
                i = this._icon;
                this._updateImg(i, a, s);
            }

            if (this._shadow) {
                // Rotate around the icons anchor.
                s = this.options.icon.options.shadowSize;
                i = this._shadow;
                this._updateImg(i, a, s);
            }

        }
    }
});

L.Playback = L.Playback || {};


        
L.Playback.Track = L.Class.extend({

        initialize : function (geoJSON, options) {
            options = options || {};
            var tickLen = options.tickLen || 250;
            this._staleTime = options.staleTime || 60*60*1000;
            this._fadeMarkersWhenStale = options.fadeMarkersWhenStale || false;
            
            this._geoJSON = geoJSON;
            this._tickLen = tickLen;
            this._ticks = [];
            this._marker = null;
			//this._orientations = [];
			this._status = [];
			
			
            var sampleTimes = geoJSON.properties.time;
            var sampleStatus = geoJSON.properties.status;//associative array of hdng,sog,cog and status
			
            this._orientIcon = options.orientIcons;
            var previousOrientation;
			
            var samples = geoJSON.geometry.coordinates;
            var currSample = samples[0];
            var nextSample = samples[1];
			
            var currSampleTime = sampleTimes[0];
            var t = currSampleTime;  // t is used to iterate through tick times
            var nextSampleTime = sampleTimes[1];
            var tmod = t % tickLen; // ms past a tick time
            var rem,
            ratio;

            // handle edge case of only one t sample
            if (sampleTimes.length === 1) {
                if (tmod !== 0)
                    t += tickLen - tmod;
                this._ticks[t] = samples[0];
				//this._orientations[t] = 0;
				this._status[t]=sampleStatus[0];
                this._startTime = t;
                this._endTime = t;
                return;
            }

            this._status[t]=sampleStatus[0];
            // interpolate first tick if t not a tick time
            if (tmod !== 0) {
                rem = tickLen - tmod;
                ratio = rem / (nextSampleTime - currSampleTime);
                t += rem;
                this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
				//this._orientations[t] = this._directionOfPoint(currSample,nextSample);
				
                //previousOrientation = this._orientations[t];
            } else {
                this._ticks[t] = currSample;
				//this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                //previousOrientation = this._orientations[t];
            }

            this._startTime = t;
            t += tickLen;
            while (t < nextSampleTime) {
                ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);
                this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
				//this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                //previousOrientation = this._orientations[t];
                this._status[t]=sampleStatus[0];
                t += tickLen;
            }

            // iterating through the rest of the samples
            for (var i = 1, len = samples.length; i < len; i++) {
                currSample = samples[i];
                nextSample = samples[i + 1];
                t = currSampleTime = sampleTimes[i];
                nextSampleTime = sampleTimes[i + 1];
                this._status[t]=sampleStatus[i];
                
                tmod = t % tickLen;
                if (tmod !== 0 && nextSampleTime) {
                    rem = tickLen - tmod;
                    ratio = rem / (nextSampleTime - currSampleTime);
                    t += rem;
                    this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
                    /*
                    
                    if(nextSample){
                        this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;    
                    }
                    */
                } else {
                    this._ticks[t] = currSample;
                    /*
                    if(nextSample){
                        this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;    
                    }
                    */
                }

                t += tickLen;
                while (t < nextSampleTime) {
                    ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);
                    this._status[t]=sampleStatus[i];
                    if (nextSampleTime - currSampleTime > options.maxInterpolationTime){
                        this._ticks[t] = currSample;
                        /*
						if(nextSample){
                            this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                            previousOrientation = this._orientations[t];
                        } else {
                            this._orientations[t] = previousOrientation;    
                        }
                        */
                    }
                    else {
                        this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
						/*
						if(nextSample) {
                            this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                            previousOrientation = this._orientations[t];
                        } else {
                            this._orientations[t] = previousOrientation;    
                        }
                        */
                    }
                    
                    t += tickLen;
                }
            }

            // the last t in the while would be past bounds
            this._endTime = t - tickLen;
            this._lastTick = this._ticks[this._endTime];

        },

        _interpolatePoint : function (start, end, ratio) {
            try {
                var delta = [end[0] - start[0], end[1] - start[1]];
                var offset = [delta[0] * ratio, delta[1] * ratio];
                return [start[0] + offset[0], start[1] + offset[1]];
            } catch (e) {
                console.log('err: cant interpolate a point');
                console.log(['start', start]);
                console.log(['end', end]);
                console.log(['ratio', ratio]);
            }
        },
        
        _directionOfPoint:function(start,end){
            return this._getBearing(start[1],start[0],end[1],end[0]);
        },
        
        _getBearing:function(startLat,startLong,endLat,endLong){
              startLat = this._radians(startLat);
              startLong = this._radians(startLong);
              endLat = this._radians(endLat);
              endLong = this._radians(endLong);

              var dLong = endLong - startLong;

              var dPhi = Math.log(Math.tan(endLat/2.0+Math.PI/4.0)/Math.tan(startLat/2.0+Math.PI/4.0));
              if (Math.abs(dLong) > Math.PI){
                if (dLong > 0.0)
                   dLong = -(2.0 * Math.PI - dLong);
                else
                   dLong = (2.0 * Math.PI + dLong);
              }

              return (this._degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        },
        
        _radians:function(n) {
          return n * (Math.PI / 180);
        },
        _degrees:function(n) {
          return n * (180 / Math.PI);
        },

        getFirstTick : function () {
            return this._ticks[this._startTime];
        },

        getLastTick : function () {
            return this._ticks[this._endTime];
        },

        getStartTime : function () {
            return this._startTime;
        },

        getEndTime : function () {
            return this._endTime;
        },

        getTickMultiPoint : function () {
            var t = this.getStartTime();
            var endT = this.getEndTime();
            var coordinates = [];
            var time = [];
            while (t <= endT) {
                time.push(t);
                coordinates.push(this.tick(t));
                t += this._tickLen;
            }

            return {
                type : 'Feature',
                geometry : {
                    type : 'MultiPoint',
                    coordinates : coordinates
                },
                properties : {
                    time : time
                }
            };
        },
		
        trackPresentAtTick : function(timestamp)
        {
            return (timestamp >= this._startTime);
        },
        
        trackStaleAtTick : function(timestamp)
        {
            return ((this._endTime + this._staleTime) <= timestamp);
        },

        tick : function (timestamp) {
            if (timestamp > this._endTime)
                timestamp = this._endTime;
            if (timestamp < this._startTime)
                timestamp = this._startTime;
            return this._ticks[timestamp];
        },
		
        courseAtTime: function(timestamp)
        {
            //return 90;
            if (timestamp > this._endTime)
               timestamp = this._endTime;
            if (timestamp < this._startTime)
                timestamp = this._startTime;
            //return this._orientations[timestamp];
            if (typeof (this._status[timestamp]) === "undefined") return 0;
            if (this._status[timestamp].hdg >= 0 && this._status[timestamp].hdg <  360)
            	return this._status[timestamp].hdg;
            else if (this._status[timestamp].sog >= 0.2 && this._status[timestamp].cog >= 0 && this._status[timestamp].cog <  360)
            	return this._status[timestamp].cog;
            else return 0;
            //else return this._orientations[timestamp];
            	
        },
        
        statusAtTime: function(timestamp)
        {
            
            if (timestamp > this._endTime)
               timestamp = this._endTime;
            if (timestamp < this._startTime)
                timestamp = this._startTime;
            return this._status[timestamp];
        },
        
        setMarker : function(timestamp, options){
            var lngLat = null;
            
            // if time stamp is not set, then get first tick
            if (timestamp) {
                lngLat = this.tick(timestamp);
            }
            else {
                lngLat = this.getFirstTick();
            }        
        
            if (lngLat) {
                var latLng = new L.LatLng(lngLat[1], lngLat[0]);
                this._marker = new L.Playback.MoveableMarker(latLng, options, this._geoJSON);     
				if(options.mouseOverCallback) {
                    this._marker.on('mouseover',options.mouseOverCallback);
                }
				if(options.clickCallback) {
                    this._marker.on('click',options.clickCallback);
                }
				
				//hide the marker if its not present yet and fadeMarkersWhenStale is true
				if(this._fadeMarkersWhenStale && !this.trackPresentAtTick(timestamp))
				{
					this._marker.setOpacity(0);
				}
            }
            
            return this._marker;
        },
        
        moveMarker : function(latLng, transitionTime,timestamp) {
            if (this._marker) {
                if(this._fadeMarkersWhenStale) {
                    //show the marker if its now present
                    if(this.trackPresentAtTick(timestamp)) {
                        this._marker.setOpacity(1);
                    } else {
                        this._marker.setOpacity(0);
                    }
                    
                    if(this.trackStaleAtTick(timestamp)) {
                        this._marker.setOpacity(0.25);
                    }
                }
				
                if(this._orientIcon){
                    this._marker.setIconAngle(this.courseAtTime(timestamp));
                }
				
                this._marker.move(latLng, transitionTime,this._status[timestamp]);
            }
        },
        
        getMarker : function() {
            return this._marker;
        }

    });

L.Playback = L.Playback || {};

L.Playback.TrackController = L.Class.extend({

    initialize : function (map, tracks, options) {
        this.options = options || {};
    
        this._map = map;
        
        this.markerLayer = L.layerGroup();

        this._tracks = [];

        // initialize tick points
        this.setTracks(tracks);
    },
    
    clearTracks: function(){
        while (this._tracks.length > 0) {
            var track = this._tracks.pop();
            var marker = track.getMarker();
            
            if (marker){
                this._map.removeLayer(marker);
            }
        }            
    },

    setTracks : function (tracks) {
        // reset current tracks
        this.clearTracks();
        
        this.addTracks(tracks);
    },
    
    addTracks : function (tracks) {
        // return if nothing is set
        if (!tracks) {
            return;
        }
        
        if (tracks instanceof Array) {            
            for (var i = 0, len = tracks.length; i < len; i++) {
                this.addTrack(tracks[i]);
            }
        } else {
            this.addTrack(tracks);
        }            
    },
    
    // add single track
    addTrack : function (track, timestamp) {
        // return if nothing is set
        if (!track) {
            return;
        }

        var marker = track.setMarker(timestamp, this.options);

        if (marker) {
            marker.addTo(this.markerLayer); //this._map
            
            this._tracks.push(track);
        }            
    },

    tock : function (timestamp, transitionTime) {
        for (var i = 0, len = this._tracks.length; i < len; i++) {
            var lngLat = this._tracks[i].tick(timestamp);
            var latLng = new L.LatLng(lngLat[1], lngLat[0]);
            this._tracks[i].moveMarker(latLng, transitionTime,timestamp);
        }
    },

    getStartTime : function () {
        var earliestTime = 0;

        if (this._tracks.length > 0) {
            earliestTime = this._tracks[0].getStartTime();
            for (var i = 1, len = this._tracks.length; i < len; i++) {
                var t = this._tracks[i].getStartTime();
                if (t < earliestTime) {
                    earliestTime = t;
                }
            }
        }
        
        return earliestTime;
    },

    getEndTime : function () {
        var latestTime = 0;
    
        if (this._tracks.length > 0){
            latestTime = this._tracks[0].getEndTime();
            for (var i = 1, len = this._tracks.length; i < len; i++) {
                var t = this._tracks[i].getEndTime();
                if (t > latestTime) {
                    latestTime = t;
                }
            }
        }
    
        return latestTime;
    },

    getTracks : function () {
        return this._tracks;
    }
});
L.Playback = L.Playback || {};

L.Playback.Clock = L.Class.extend({

  initialize: function (trackController, callback, options) {
    this._trackController = trackController;
    this._callbacksArry = [];
    if (callback) this.addCallback(callback);
    L.setOptions(this, options);
    this._speed = this.options.speed;
    this._tickLen = this.options.tickLen;
    this._cursor = trackController.getStartTime();
    this._transitionTime = this._tickLen / this._speed;
  },

  _tick: function (self) {
    if (self._cursor > self._trackController.getEndTime()) {
      clearInterval(self._intervalID);
      return;
    }
    self._trackController.tock(self._cursor, self._transitionTime);
    self._callbacks(self._cursor);
    self._cursor += self._tickLen;
  },

  _callbacks: function(cursor) {
    var arry = this._callbacksArry;
    for (var i=0, len=arry.length; i<len; i++) {
      arry[i](cursor);
    }
  },

  addCallback: function(fn) {
    this._callbacksArry.push(fn);
  },

  start: function () {
    if (this._intervalID) return;
    this._intervalID = window.setInterval(
      this._tick, 
      this._transitionTime, 
      this);
  },

  stop: function () {
    if (!this._intervalID) return;
    clearInterval(this._intervalID);
    this._intervalID = null;
  },

  getSpeed: function() {
    return this._speed;
  },

  isPlaying: function() {
    return this._intervalID ? true : false;
  },

  setSpeed: function (speed) {
    this._speed = speed;
    this._transitionTime = this._tickLen / speed;
    if (this._intervalID) {
      this.stop();
      this.start();
    }
  },

  setCursor: function (ms) {
    var time = parseInt(ms);
    if (!time) return;
    var mod = time % this._tickLen;
    if (mod !== 0) {
      time += this._tickLen - mod;
    }
    this._cursor = time;
    this._trackController.tock(this._cursor, 0);
    this._callbacks(this._cursor);
  },

  getTime: function() {
    return this._cursor;
  },

  getStartTime: function() {
    return this._trackController.getStartTime();
  },

  getEndTime: function() {
    return this._trackController.getEndTime();
  },

  getTickLen: function() {
    return this._tickLen;
  }

});

//Simply shows all of the track points as polylines
//TODO: Associate circle color with the marker color.
//TODO: Add gps sensor offsets.
L.Playback = L.Playback || {};

L.Playback.TracksLayer = L.Class.extend({
 initialize : function (map, options) {
     var layer_options = options.layer || {};
     
     this.layer = new L.FeatureGroup();
		 
     if (jQuery.isFunction(layer_options)){
         layer_options = layer_options(feature);
     }
     
     
     var overlayControl = {
         'GPS Tracks' : this.layer
     };

     L.control.layers(null, overlayControl, {
     	collapsed : false //show it
     }).addTo(map);
     
 },

 // clear all geoJSON layers
 clearLayer : function(){
     for (var i in this.layer._layers) {
         this.layer.removeLayer(this.layer._layers[i]);            
     }
 },

 // add new geoJSON layer
 addLayer : function(geoJSON) {
	 if (geoJSON instanceof Array) {
         for (var i = 0, len = geoJSON.length; i < len; i++) {
        	 	
        	 this.addTrack(geoJSON[i]);
         }
     } else {
         this.addTrack(geoJSON);
         
     }

 },
 
 addTrack : function(geoJSON) {
	 
	 var boatTrack =  L.polyline([],{color: 'red', weight: 2, dasharray: "2, 5"});
	 var samples = geoJSON.geometry.coordinates;
	 var numSamples = samples.length;
	 var currSample,fixlat,fixlong,fixCenter;
	 
	 for (var ii=0 ; ii < numSamples; ii++)
	 {
		 currSample=samples[ii];
		 fixlat =  currSample[1];
		 fixlong =  currSample[0];
		 fixCenter = L.latLng(fixlat, fixlong );
		 boatTrack.addLatLng(fixCenter);
	 }
	 
	 //TODO: Add on click
	 
	 boatTrack.addTo(this.layer); 
 }
});


L.Playback = L.Playback || {};

L.Playback.DateControl = L.Control.extend({
    options : {
        position : 'bottomleft',
        dateFormatFn: L.Playback.Util.DateStr,
        timeFormatFn: L.Playback.Util.TimeStr
    },

    initialize : function (playback, options) {
        L.setOptions(this, options);
        this.playback = playback;
    },

    onAdd : function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

        var self = this;
        var playback = this.playback;
        var time = playback.getTime();

        var datetime = L.DomUtil.create('div', 'datetimeControl', this._container);

        // date time
        this._date = L.DomUtil.create('p', '', datetime);
        this._time = L.DomUtil.create('p', '', datetime);

        this._date.innerHTML = this.options.dateFormatFn(time);
        this._time.innerHTML = this.options.timeFormatFn(time);
        
     // slider
        this._slider = L.DomUtil.create('input', 'slider', this._container);
        this._slider.type = 'range';
        this._slider.min = playback.getStartTime();
        this._slider.max = playback.getEndTime();
        this._slider.value = playback.getTime();

        var stop = L.DomEvent.stopPropagation;

        L.DomEvent
        .on(this._slider, 'click', stop)
        .on(this._slider, 'mousedown', stop)
        .on(this._slider, 'dblclick', stop)
        .on(this._slider, 'click', L.DomEvent.preventDefault)
        //.on(this._slider, 'mousemove', L.DomEvent.preventDefault)
        .on(this._slider, 'change', onSliderChange, this)
        .on(this._slider, 'mousemove', onSliderChange, this);  
        
        function onSliderChange(e) {
            var val = Number(e.target.value);
            playback.setCursor(val);
        }
        // setup callback
        playback.addCallback(function (ms) {
            self._date.innerHTML = self.options.dateFormatFn(ms);
            self._time.innerHTML = self.options.timeFormatFn(ms);
            self._slider.value = ms;
        });
        
        map.on('playback:add_tracks', function() {
            self._slider.min = playback.getStartTime();
            self._slider.max = playback.getEndTime();
            self._slider.value = playback.getTime();
        });

        return this._container;
    }
    
    
    
    
});
    
L.Playback.PlayControl = L.Control.extend({
    options : {
        position : 'bottomleft'
    },

    initialize : function (playback) {
        this.playback = playback;
    },

    onAdd : function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

        var self = this;
        var playback = this.playback;
        playback.setSpeed(100);

        var playControl = L.DomUtil.create('div', 'playControl', this._container);


        this._button = L.DomUtil.create('button', '', playControl);
        this._button.innerHTML = 'Play';


        var stop = L.DomEvent.stopPropagation;

        L.DomEvent
        .on(this._button, 'click', stop)
        .on(this._button, 'mousedown', stop)
        .on(this._button, 'dblclick', stop)
        .on(this._button, 'click', L.DomEvent.preventDefault)
        .on(this._button, 'click', play, this);
        
        function play(){
            if (playback.isPlaying()) {
                playback.stop();
                self._button.innerHTML = 'Play';
            }
            else {
                playback.start();
                self._button.innerHTML = 'Stop';
            }                
        }

        return this._container;
    }
});    
    
L.Playback.SliderControl = L.Control.extend({
    options : {
        position : 'bottomleft'
    },

    initialize : function (playback) {
        this.playback = playback;
    },

    onAdd : function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

        var self = this;
        var playback = this.playback;

        // slider
        this._slider = L.DomUtil.create('input', 'slider', this._container);
        this._slider.type = 'range';
        this._slider.min = playback.getStartTime();
        this._slider.max = playback.getEndTime();
        this._slider.value = playback.getTime();

        var stop = L.DomEvent.stopPropagation;

        L.DomEvent
        .on(this._slider, 'click', stop)
        .on(this._slider, 'mousedown', stop)
        .on(this._slider, 'dblclick', stop)
        .on(this._slider, 'click', L.DomEvent.preventDefault)
        //.on(this._slider, 'mousemove', L.DomEvent.preventDefault)
        .on(this._slider, 'change', onSliderChange, this)
        .on(this._slider, 'mousemove', onSliderChange, this);           


        function onSliderChange(e) {
            var val = Number(e.target.value);
            playback.setCursor(val);
        }

        playback.addCallback(function (ms) {
            self._slider.value = ms;
        });
        
        
        map.on('playback:add_tracks', function() {
            self._slider.min = playback.getStartTime();
            self._slider.max = playback.getEndTime();
            self._slider.value = playback.getTime();
        });

        return this._container;
    }
});     

L.Playback.SpeedControl = L.Control.extend({
    options : {
        position : 'bottomleft'
    },

    initialize : function (playback) {
        this.playback = playback;
    },

    onAdd : function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');
       
        var self = this;
        var playback = this.playback;
        playback.setSpeed(playback.options.speed);
        
      
        // speed value
        var speedValue = L.DomUtil.create('div', 'speedControl', this._container);
        this._speed = L.DomUtil.create('p', '', speedValue);     
        this._speed.innerHTML = "Playback speed: x"+playback.getSpeed();

        // slider
        this._slider = L.DomUtil.create('input', 'slider', this._container);
        this._slider.type = 'range';
        this._slider.min = 1;
        this._slider.max = 1000;
        this._slider.value = playback.getSpeed();

        var stop = L.DomEvent.stopPropagation;

        L.DomEvent
        .on(this._slider, 'click', stop)
        .on(this._slider, 'mousedown', stop)
        .on(this._slider, 'dblclick', stop)
        .on(this._slider, 'click', L.DomEvent.preventDefault)
        //.on(this._slider, 'mousemove', L.DomEvent.preventDefault)
        .on(this._slider, 'change', onSliderChange, this)
        .on(this._slider, 'mousemove', onSliderChange, this);           


        function onSliderChange(e) {
            var val = Number(e.target.value);
            playback.setSpeed(val);
            this._speed.innerHTML = "Playback speed: x"+playback.getSpeed();
        }


        map.on('playback:add_tracks', function() {
           
          
        });

        return this._container;
    }
});     

L.Playback = L.Playback.Clock.extend({
        statics : {
            MoveableMarker : L.Playback.MoveableMarker,
            Track : L.Playback.Track,
            TrackController : L.Playback.TrackController,
            Clock : L.Playback.Clock,
            Util : L.Playback.Util,
            
            TracksLayer : L.Playback.TracksLayer,
            PlayControl : L.Playback.PlayControl,
            DateControl : L.Playback.DateControl,
            SliderControl : L.Playback.SliderControl,
            SpeedControl : L.Playback.SpeedControl
        },

        options : {
            tickLen: 250,
            speed: 1,
            maxInterpolationTime: 5*60*1000, // 5 minutes

            tracksLayer : true,
            
            playControl: false,
            dateControl: false,
            sliderControl: false,
            
            // options
            layer: {
                // pointToLayer(featureData, latlng)
            },
            
            marker : {
                // getPopup(feature)
            }
        },

        initialize : function (map, geoJSON, callback, options) {
            L.setOptions(this, options);
            
            this._map = map;
            this._trackController = new L.Playback.TrackController(map, null, this.options);
            L.Playback.Clock.prototype.initialize.call(this, this._trackController, callback, this.options);
            
            if (this.options.tracksLayer) {
                this._tracksLayer = new L.Playback.TracksLayer(map, options);
            }

            this.setData(geoJSON);    
            
            this._trackController.markerLayer.addTo(map);
            
          

            if (this.options.playControl) {
                this.playControl = new L.Playback.PlayControl(this);
                this.playControl.addTo(map);
            }
            
            if (this.options.speed)
            {
            	this.speedControl = new L.Playback.SpeedControl(this);
            	this.speedControl.addTo(map);
            }

            if (false) //this.options.sliderControl) 
            {
                this.sliderControl = new L.Playback.SliderControl(this);
                this.sliderControl.addTo(map);
            }

            if (this.options.dateControl) {
                this.dateControl = new L.Playback.DateControl(this, options);
                this.dateControl.addTo(map);
            }
            
            

        },
        
        getMarkersLayer : function() {
        	return this._trackController.markerLayer;
        },
        
        clearData : function() {
            this._trackController.clearTracks();
            
            if (this._tracksLayer) {
                this._tracksLayer.clearLayer();
            }
        },
        
        setData : function (geoJSON) {
            this.clearData();
        
            this.addData(geoJSON, this.getTime());
            
            this.setCursor(this.getStartTime());
        },

        // bad implementation
        addData : function (geoJSON, ms) {
            // return if data not set
            if (!geoJSON) {
                return;
            }
        
            if (geoJSON instanceof Array) {
                for (var i = 0, len = geoJSON.length; i < len; i++) {
                	/*var thisPlayer= this;
                	var endlen=geoJSON.length -1;
                	var thisgeoJSON = geoJSON[i];
                	var thisItem=i;
                	setTimeout(function() {
                		thisPlayer._trackController.addTrack(new L.Playback.Track(thisgeoJSON, thisPlayer.options), ms);
                		if  (thisItem==endlen)
                		{
                			thisPlayer._map.fire('playback:set:data');
                            
                            if (thisPlayer.options.tracksLayer) {
                            	thisPlayer._tracksLayer.addLayer(geoJSON);
                            } 
                		}
                	}, 0)
                	*/
                	
                    this._trackController.addTrack(new L.Playback.Track(geoJSON[i], this.options), ms);
                }
            } else {
                this._trackController.addTrack(new L.Playback.Track(geoJSON, this.options), ms);
                
            }
            
            this._map.fire('playback:set:data');
            
            if (this.options.tracksLayer) {
                this._tracksLayer.addLayer(geoJSON);
            } 

                             
        },

        destroy: function() {
            this.clearData();
            if (this.playControl) {
                this._map.removeControl(this.playControl);
            }
            if (this.sliderControl) {
                this._map.removeControl(this.sliderControl);
            }
            if (this.dateControl) {
                this._map.removeControl(this.dateControl);
            }
            if (this.speedControl) {
                this._map.removeControl(this.speedControl);
            }
        }
    });

L.Map.addInitHook(function () {
    if (this.options.playback) {
        this.playback = new L.Playback(this);
    }
});

L.playback = function (map, geoJSON, callback, options) {
    return new L.Playback(map, geoJSON, callback, options);
};
return L.Playback;

}));
