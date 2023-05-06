let width = 700;
let height = 780;
var hexRadius;
var hexbin; 

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

let chiProjection = d3.geoAlbers()
  .scale( 80000 ) //how far zoomed in the map should be
  .rotate( [87.623,0] )
  .center( [0, 41.881] )
  .translate( [width/2,height/2] );

function drawGeo(data) {
    var geoPath = d3.geoPath()
      .projection(chiProjection);
  
    svg
      .append('path').datum(data)
        .attr('d', geoPath)
        .attr('fill', '#ccc')
  }

  function keepPointsInPolygon(points, polygon) {
    var pointsInPolygon = [];
    points.forEach(function(el) {
      var latLong = chiProjection.invert([el.x, el.y]);
      var point = turf.points([latLong]);
      var ptsWithin = turf.pointsWithinPolygon(polygon.geometry, point);
      if (ptsWithin.length > 0) pointsInPolygon.push(el);
    });
    return pointsInPolygon;
  }

  function getHexPoints(points) {
    hexbin = d3.hexbin() // note: global
      .radius(hexRadius)
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });
  
    var hexPoints = hexbin(points);
      return hexPoints;
  }

  function drawHexmap(points) {
    var hexes = svg.append('g').attr('id', 'hexes')
      .selectAll('.hex').data(points)
      .enter().append('path')
        .attr('class', 'hex')
        .attr('transform', function(d) { 
          return 'translate(' + d.x + ', ' + d.y + ')'; })
        .attr('d', hexbin.hexagon())
        .style('fill', '#fff')
        .style('stroke', '#ccc')
        .style('stroke-width', 1);
  }

  function update() {
        d3.json("js/zips.geojson").then(function(geojson, err) { 
        if(err){
            console.log(err);
        }    
        var points = getPointGrid(20);
        var chiPoints = []
        var latLong = points.map(pt => chiProjection.invert([pt.x, pt.y]));
        var latLongPoints = turf.points(latLong);
        var zipCenters = [];
        geojson.features.forEach(feat => {
          var center = turf.center(feat);
          var centerCoordinate = chiProjection(center.geometry.coordinates);
          center.properties.zip = feat.properties.zip;
          zipCenters.push({centerCoordinate: centerCoordinate, center: center, zip: feat.properties.zip});
          var pointsWithin = turf.pointsWithinPolygon(latLongPoints, feat.geometry);
          pointsWithin.features.forEach(pointFeature => {
            var coordinate = chiProjection(pointFeature.geometry.coordinates)
            chiPoints.push({x: coordinate[0], y: coordinate[1]});
          })
        });
        var hexPoints = getHexPoints(chiPoints);
        var hexpointsLatLong = hexPoints.map((pt) => {
          var invPt = chiProjection.invert([pt.x,pt.y]);
          return turf.point(invPt);
        });
        var locatedPoints = [];
        // console.log(hexpointsLatLong);
        // zipCenters.reverse().forEach(c => {
        //   var point = turf.nearestPoint(c.center, turf.featureCollection(hexpointsLatLong));
        //   point.properties.zip = c.zip;
        //   locatedPoints.push(turf.point([point.geometry.coordinates[0], point.geometry.coordinates[1]]));
        //   var idx = hexpointsLatLong.findIndex((pt) => 
        //     {return pt.geometry.coordinates[0] === point.geometry.coordinates[0] && pt.geometry.coordinates[1] === point.geometry.coordinates[1]})
        //   console.log(hexpointsLatLong[idx]);   
        //   hexpointsLatLong.splice(idx, 1)
        // })
        var centerCollection = zipCenters.map(z => z.center);
        hexpointsLatLong.sort((pt1, pt2) => {
          return pt1.geometry.coordinates[0] - pt2.geometry.coordinates[0]
        }).reverse().forEach(ft => {
          if(centerCollection.length > 0){
            var point = turf.nearestPoint(ft, turf.featureCollection(centerCollection));
            ft.properties.zip = point.properties.zip;
            var idx = centerCollection.findIndex((pt) => 
              {return pt.geometry.coordinates[0] === point.geometry.coordinates[0] && pt.geometry.coordinates[1] === point.geometry.coordinates[1]})
            centerCollection.splice(idx, 1);
            locatedPoints.push(ft);
          }
        })
        console.log(JSON.stringify(turf.featureCollection(locatedPoints)));
        drawHexmap(locatedPoints.map(pt => {
          var coordinate = chiProjection(pt.geometry.coordinates)
          return {x: coordinate[0], y: coordinate[1]};
        }));
        // drawPointGrid(zipCenters.map(c => {return {x: c.centerCoordinate[0], y: c.centerCoordinate[1]}}), 'darkgreen');
        // drawPointGrid(hexPoints, 'darkred');
    });
  }

  function getPointGrid(cols) {
    var hexDistance = width / cols;
    var rows = Math.floor(height / hexDistance);
    hexRadius = hexDistance/1.5;
    return d3.range(rows * cols).map(function(el, i) {
      return {
        x: Math.floor(i % cols * hexDistance),
        y: Math.floor(i / cols) * hexDistance,
        datapoint: 0
      }
    });
  }
  
  function drawPointGrid(data, fill) {
    svg.append('g').attr('id', 'circles')
      .selectAll('.dot').data(data)
      .enter().append('circle')
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; })
        .attr('r', 1)
        .attr('fill', fill);
  }
  
update();

