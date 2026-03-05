import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface CountryShapeViewProps {
  countryCode: string;
  height?: number;
  color?: string;
}

const NUM_TO_A2: Record<string, string> = {"100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","120":"CM","124":"CA","132":"CV","136":"KY","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN","158":"TW","162":"CX","166":"CC","170":"CO","174":"KM","175":"YT","178":"CG","180":"CD","184":"CK","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ","204":"BJ","208":"DK","212":"DM","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER","233":"EE","234":"FO","238":"FK","239":"GS","242":"FJ","246":"FI","248":"AX","250":"FR","254":"GF","258":"PF","260":"TF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH","292":"GI","296":"KI","300":"GR","304":"GL","308":"GD","312":"GP","316":"GU","320":"GT","324":"GN","328":"GY","332":"HT","334":"HM","336":"VA","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY","438":"LI","440":"LT","442":"LU","446":"MO","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML","470":"MT","474":"MQ","478":"MR","480":"MU","484":"MX","492":"MC","496":"MN","498":"MD","499":"ME","500":"MS","504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL","531":"CW","533":"AW","534":"SX","535":"BQ","540":"NC","548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","570":"NU","574":"NF","578":"NO","580":"MP","581":"UM","583":"FM","584":"MH","585":"PW","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","612":"PN","616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","638":"RE","642":"RO","643":"RU","646":"RW","652":"BL","654":"SH","659":"KN","660":"AI","662":"LC","663":"MF","666":"PM","670":"VC","674":"SM","678":"ST","682":"SA","686":"SN","688":"RS","690":"SC","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS","729":"SD","732":"EH","740":"SR","744":"SJ","748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ","764":"TH","768":"TG","772":"TK","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR","795":"TM","796":"TC","798":"TV","800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","831":"GG","832":"JE","833":"IM","834":"TZ","840":"US","850":"VI","854":"BF","858":"UY","860":"UZ","862":"VE","876":"WF","882":"WS","887":"YE","894":"ZM","004":"AF","008":"AL","010":"AQ","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ","032":"AR","036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","051":"AM","052":"BB","056":"BE","060":"BM","064":"BT","068":"BO","070":"BA","072":"BW","074":"BV","076":"BR","084":"BZ","086":"IO","090":"SB","092":"VG","096":"BN", "-99": "XK"};
const A2_TO_NUM: Record<string, string> = {};
for (const [num, a2] of Object.entries(NUM_TO_A2)) {
  A2_TO_NUM[a2] = num;
}
// Manually map Svalbard and Jan Mayen (SJ) and others without separate geometries to their sovereigns
A2_TO_NUM['SJ'] = '578'; // Norway
A2_TO_NUM['XK'] = '688'; // Kosovo -> Serbia

/**
 * Renders a 2D country silhouette using Leaflet + TopoJSON.
 * Shows the country shape on a plain dark background with no tiles.
 */
export default function CountryShapeView({
  countryCode,
  height = 180,
  color = '#FFD700',
}: CountryShapeViewProps) {
  const numericId = A2_TO_NUM[countryCode] || '';
  const html = useMemo(() => buildShapeHtml(numericId, color), [numericId, color]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
      />
    </View>
  );
}

function buildShapeHtml(numericId: string, color: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/topojson-client@3/dist/topojson-client.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#0a0a1a}
    #map{width:100%;height:100%;background:#0a0a1a}
    .leaflet-control-attribution,.leaflet-control-zoom{display:none!important}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555;font-family:sans-serif;font-size:12px;z-index:999}
  </style>
</head>
<body>
  <div id="loading">Loading…</div>
  <div id="map"></div>
  <script>
    var targetId="${numericId}";
    var fillColor="${color}";

    var map=L.map('map',{
      zoomControl:false,
      attributionControl:false,
      dragging:false,
      touchZoom:false,
      scrollWheelZoom:false,
      doubleClickZoom:false,
      boxZoom:false,
      keyboard:false,
      tap:false,
    });

    // No tile layer — just show the silhouette on dark background

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json')
      .then(function(r){return r.json()})
      .then(function(topology){
        document.getElementById('loading').style.display='none';
        var geojson=topojson.feature(topology,topology.objects.countries);
        var targetFeature=null;
        var targetNum=parseInt(targetId,10);

        for(var i=0;i<geojson.features.length;i++){
          if(parseInt(String(geojson.features[i].id),10)===targetNum){
            targetFeature=geojson.features[i];
            break;
          }
        }

        if(!targetFeature){
          document.getElementById('loading').style.display='block';
          document.getElementById('loading').textContent='?';
          return;
        }

        // Draw just this country
        var layer=L.geoJSON(targetFeature,{
          style:{
            fillColor:fillColor,
            fillOpacity:0.9,
            color:fillColor,
            weight:1.5,
            opacity:0.6
          }
        }).addTo(map);

        // Fit to the country bounds with padding
        map.fitBounds(layer.getBounds().pad(0.15),{animate:false});
      })
      .catch(function(){
        document.getElementById('loading').textContent='⚠️';
      });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0a0a1a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
