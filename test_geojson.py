import urllib.request
import json
import math

def check_jumps(coords, name):
    for i in range(len(coords)-1):
        if type(coords[i]) is list and len(coords[i]) >= 2:
            lon1, lon2 = coords[i][0], coords[i+1][0]
            if abs(lon1 - lon2) > 180:
                # print(f"{name} jumps: {lon1} to {lon2}")
                return True
    return False

def check_poly(poly, name):
    for ring in poly:
        if check_jumps(ring, name): return True
    return False

def check_feature(feature):
    name = feature['properties'].get('name', feature['id'])
    geom = feature['geometry']
    has_jump = False
    if geom['type'] == 'Polygon':
        has_jump = check_poly(geom['coordinates'], name)
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            if check_poly(poly, name): has_jump = True
    if has_jump:
        print(f"Jumps in {name}")

url = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for f in data['features']:
        check_feature(f)
