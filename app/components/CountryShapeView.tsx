import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { geoAzimuthalEquidistant, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { trimToMainland } from '../lib/mainland';
import shapeOverrides from '../assets/map/shape-overrides.json';
import worldAtlas from '../assets/map/countries-50m.json';

interface CountryShapeViewProps {
  countryCode: string;
  height?: number;
  color?: string;
}

export const NUM_TO_A2: Record<string, string> = {"100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","120":"CM","124":"CA","132":"CV","136":"KY","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN","158":"TW","162":"CX","166":"CC","170":"CO","174":"KM","175":"YT","178":"CG","180":"CD","184":"CK","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ","204":"BJ","208":"DK","212":"DM","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER","233":"EE","234":"FO","238":"FK","239":"GS","242":"FJ","246":"FI","248":"AX","250":"FR","254":"GF","258":"PF","260":"TF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH","292":"GI","296":"KI","300":"GR","304":"GL","308":"GD","312":"GP","316":"GU","320":"GT","324":"GN","328":"GY","332":"HT","334":"HM","336":"VA","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY","438":"LI","440":"LT","442":"LU","446":"MO","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML","470":"MT","474":"MQ","478":"MR","480":"MU","484":"MX","492":"MC","496":"MN","498":"MD","499":"ME","500":"MS","504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL","531":"CW","533":"AW","534":"SX","535":"BQ","540":"NC","548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","570":"NU","574":"NF","578":"NO","580":"MP","581":"UM","583":"FM","584":"MH","585":"PW","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","612":"PN","616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","638":"RE","642":"RO","643":"RU","646":"RW","652":"BL","654":"SH","659":"KN","660":"AI","662":"LC","663":"MF","666":"PM","670":"VC","674":"SM","678":"ST","682":"SA","686":"SN","688":"RS","690":"SC","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS","729":"SD","732":"EH","740":"SR","744":"SJ","748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ","764":"TH","768":"TG","772":"TK","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR","795":"TM","796":"TC","798":"TV","800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","831":"GG","832":"JE","833":"IM","834":"TZ","840":"US","850":"VI","854":"BF","858":"UY","860":"UZ","862":"VE","876":"WF","882":"WS","887":"YE","894":"ZM","004":"AF","008":"AL","010":"AQ","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ","032":"AR","036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","051":"AM","052":"BB","056":"BE","060":"BM","064":"BT","068":"BO","070":"BA","072":"BW","074":"BV","076":"BR","084":"BZ","086":"IO","090":"SB","092":"VG","096":"BN","-99":"XK"};
export const A2_TO_NUM: Record<string, string> = {};
for (const [num, a2] of Object.entries(NUM_TO_A2)) {
  A2_TO_NUM[a2] = num;
}

const ANTARCTICA_ID = '010';
const DEFAULT_HEIGHT = 180;
// Countries crossing the date line: centre the projection on them instead of cutting them in two.
export const ANTIMERIDIAN_ROTATION: Record<string, number> = { '643': -105, '242': 180, '296': 180 };
// Detailed 1:10m outlines (scripts/build-shape-overrides.cjs) for countries missing/rough in the 50m map.
const DETAILED_FEATURES = shapeOverrides as Record<string, any>;

export const atlasFeatures = (() => {
  const topo = worldAtlas as any;
  const geojson = feature(topo, topo.objects.countries) as any;
  return geojson.features as any[];
})();

const ATLAS_NUMERIC_IDS = new Set<string>(atlasFeatures.map((g: any) => String(g.id)));

export function hasCountryShape(countryCode: string): boolean {
  const numericId = A2_TO_NUM[countryCode];
  if (!numericId) return false;
  return ATLAS_NUMERIC_IDS.has(numericId) || numericId in DETAILED_FEATURES;
}

export default function CountryShapeView({
  countryCode,
  height = DEFAULT_HEIGHT,
  color = '#FFD700',
}: CountryShapeViewProps) {
  const numericId = A2_TO_NUM[countryCode] || '';
  const pathData = useMemo(() => buildShapePath(numericId, height, height), [numericId, height]);

  if (!pathData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.missingText}>?</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${height} ${height}`}>
        <Path d={pathData} fill={color} fillOpacity={0.92} stroke={color} strokeOpacity={0.7} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

function buildShapePath(numericId: string, height: number, width: number): string | null {
  const target = getFeatureForNumericId(numericId);
  if (!target) return null;

  const featureToRender = target;
  const padding = Math.max(8, Math.min(18, height * 0.1));
  // Antarctica is drawn from above the South Pole (like on its flag), not stretched flat.
  const projection = (numericId === ANTARCTICA_ID ? geoAzimuthalEquidistant().rotate([0, 90]) : geoMercator().rotate([ANTIMERIDIAN_ROTATION[numericId] ?? 0, 0])).fitExtent(
    [[padding, padding], [width - padding, height - padding]],
    featureToRender as any,
  );
  const pathGenerator = geoPath().projection(projection);
  return pathGenerator(featureToRender as any);
}

const mainlandCache = new Map<string, any>();

// Full outline (every overseas part) - for the border mesh / world views.
export function getFullFeatureForNumericId(numericId: string): any | null {
  if (!numericId) return null;
  const targetNum = parseInt(numericId, 10);
  return atlasFeatures.find((f: any) => parseInt(String(f.id), 10) === targetNum) ?? null;
}

// Display outline: mainland only (overseas territories dropped).
export function getFeatureForNumericId(numericId: string): any | null {
  if (!mainlandCache.has(numericId)) {
    const full = DETAILED_FEATURES[numericId] ?? getFullFeatureForNumericId(numericId);
    mainlandCache.set(numericId, trimToMainland(numericId, full));
  }
  return mainlandCache.get(numericId);
}

// Same mainland outline but from the 50m map, matching the shared-border mesh.
export function getMeshFeatureForNumericId(numericId: string): any | null {
  return trimToMainland(numericId, getFullFeatureForNumericId(numericId));
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  missingText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
