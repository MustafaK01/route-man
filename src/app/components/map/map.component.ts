import { Component, Input, OnInit } from '@angular/core';
import Map from "ol/Map";
import Tile from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import View from 'ol/View';
import { fromLonLat, transform } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Stroke from 'ol/style/Stroke';
import Polyline from 'ol/format/Polyline';
import Fill from 'ol/style/Fill';
import {Text} from 'ol/style';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  /*
    >markersLen indicates how many locations have selected. (if markersLen=5, routes will be 4) 
    >The feature of creating a route by selecting 
    as many locations as desired will be added 
    (location distance will be limited according to the first location)
    >refactoring the code
  */

  public map:any;
  public vectorSource:any;
  public vectorLayer:any;
  public rasterLayer:any;
  private clickCount = 0;
  public routeBetweenTwoPlaces:any = true;

  @Input() markersLen = 5;

  markerSource = new VectorSource();
  markerLayer = new VectorLayer({
    source: this.markerSource
  });


  originStyle = new Style({
    image: new Icon({
      src: 'http://maps.gstatic.com/intl/de_de/mapfiles/ms/micons/red-pushpin.png',
      scale: 0.8,
    })
  });
  destinationStyle = new Style({
    image: new Icon({
      src: 'http://maps.gstatic.com/intl/de_de/mapfiles/ms/micons/blue-pushpin.png',
      scale: 0.8,
    })
  });

  constructor() { }

  ngOnInit(): void {
    this.initMap();
    this.routeBetweenTwoPlaces = this.markersLen==0;
  }

  initMap(){
    this.map = new Map({
      target:'map',
      layers : [
        new Tile({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([28.979530, 41.015137]),
        zoom:12
      })
    });
    this.drawMarkers();
  }

  createRoute (startMarker: Feature, endMarker: Feature,index?){
    const startCoord = transform((startMarker.getGeometry() as Point).getCoordinates(),'EPSG:3857','EPSG:4326');
    const endCoord = transform((endMarker.getGeometry() as Point).getCoordinates(),'EPSG:3857','EPSG:4326');
    const coordinates = [startCoord, endCoord];
    const baseUrl = 'https://router.project-osrm.org/route/v1/driving';
    const params = 'overview=full&geometries=polyline6';
    const url = `${baseUrl}/${coordinates.join(';')}?${params}`;
  
    fetch(url)
      .then(response => response.json())
      .then(result => {
        const routes = result.routes;
        routes.forEach((route: any) => {
          const polyline = route.geometry;
          const randomColor = '#' + Math.floor(Math.random() * 256 ** 3).toString(16).padStart(6, '0');
          const routeGeometry = new Polyline({
            factor: 1e6,
          }).readGeometry(polyline, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          index = isNaN(index) ? 1: index+1
          const text = new Text({
            text: " "+index,
            font: '25px Arial',
            fill: new Fill({
              color: randomColor,
            }),
            offsetX: 0,
            offsetY: -10,
            textAlign: 'center',
          });

          const routeFeature = new Feature({
            geometry: routeGeometry,
          });
          const vectorLayer = new VectorLayer({
            source: new VectorSource({
              features: [routeFeature],
            }),
            style: new Style({
              text:text,
              stroke: new Stroke({
                width: 3,
                color: randomColor,
              }),
            }),
          });
          this.map.addLayer(vectorLayer);
          this.map.getView().fit(routeGeometry, { padding: [50, 50, 50, 50] });
        });
      });
  };

  drawMarkers(){
    const selectedMarkers = [];
    const coordinatesOfMarkers = [];
    let firstClick = true;
    const clickHandler = this.map.on('click', (event) => {
      this.clickCount++;
      const coordinate = event.coordinate;
      coordinatesOfMarkers.push(coordinate);
      if (this.routeBetweenTwoPlaces && selectedMarkers.length < 2) {
        firstClick = selectedMarkers.length<1;
        this.createMarker(coordinate,firstClick,selectedMarkers);
        if (selectedMarkers.length === 2) {
          this.createRoute(selectedMarkers[0], selectedMarkers[1]);
        }
      }else if(!this.routeBetweenTwoPlaces && selectedMarkers.length < this.markersLen){
        firstClick = selectedMarkers.length<1;
        this.createMarker(coordinate,firstClick,selectedMarkers);
        if(!this.routeBetweenTwoPlaces && selectedMarkers.length==this.markersLen){
          this.sortLocationsByDistanceAsc(coordinatesOfMarkers);
          for (let i = 0; i < selectedMarkers.length-1; i++) {
            this.createRoute(selectedMarkers[i], selectedMarkers[i+1],i);            
          }
        }
      }
    });
    if(this.clickCount==this.markersLen) this.map.un('click',clickHandler);
    this.map.addLayer(this.markerLayer);
  }

  createMarker(coordinate,firstClick,selectedMarkers){
    const marker = new Feature({
      geometry: new Point(coordinate)
    });
    marker.setStyle(firstClick ? this.originStyle : this.destinationStyle);
    this.markerSource.addFeature(marker);
    selectedMarkers.push(marker);
  }


  sortLocationsByDistanceAsc(coordinatesOfMarkers) {
    const tempSelectedMarkers = [];
    const calculateDistance = (x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx ** 2 + dy ** 2);
      return distance;
    };
    const startCoords = coordinatesOfMarkers[0];
    for (let i = 1; i < coordinatesOfMarkers.length; i++) {
      const currentCoords = coordinatesOfMarkers[i];
      const tempDistance = calculateDistance(
        startCoords[0],
        startCoords[1],
        currentCoords[0],
        currentCoords[1]
      );
      tempSelectedMarkers.push({
        obj: currentCoords[0],
        obj1: currentCoords[1]
      });
    }
    tempSelectedMarkers.sort((a, b) => {
      const distanceA = calculateDistance(
        startCoords[0],
        startCoords[1],
        a.obj,
        a.obj1
      );
      const distanceB = calculateDistance(
        startCoords[0],
        startCoords[1],
        b.obj,
        b.obj1
      );
      return distanceA - distanceB;
    });
  
    return tempSelectedMarkers.map(item => [item.obj, item.obj1]);
  }
  
}
