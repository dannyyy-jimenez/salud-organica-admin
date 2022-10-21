import haversine from 'haversine-distance'

String.prototype.pluralize = function() {

  let esEndings = ["s", "x", "z"]
  let esEndingsM = ["sh", "ch"]

  if (esEndings.includes(this.slice(-1)) || esEndingsM.includes(this.slice(-2))) return this + 'es'

  return this + 's'
}
export const FormatSerieName = (serie) => {
  if  (serie == 'healing') return 'Healing Fire'
  if  (serie == 'origin') return 'Origin'
  if  (serie == 'xolo') return 'Xolo'
  if  (serie == 'herencia') return 'La Herencia del Abuelo'
  if  (serie == 'life') return 'Life Balance'
  if  (serie == 'solar') return 'Solar Focus'
  if  (serie == 'travel') return 'Inner Travel'
  if  (serie == 'edgybear') return 'Edgy Bear'
  if  (serie == 'moon') return 'Moon Phase'
  if  (serie == 'healingdelta') return 'Healing Fire Delta-8'
  if  (serie == 'herencia_green') return 'Non-CBD'

  return serie
}


export const FormatProductName = (key, omitSerie = false) => {
  if (omitSerie) {
    if (key === 'herencia_rollon') return "Roll-On"
    if (key === 'herencia_rubbing') return "Alcohol"
    if (key === 'herencia_cream') return "Cream"
    if (key === 'moon_gummies-15ct') return "Jar"
    if (key === 'moon_gummies') return "Pouch"
    if (key === 'moon_oil') return "Tincture"
    if (key === 'moon_tablets') return "Tablet"
  }


  if (key === 'herencia_rollon') return "Rubbing Alcohol Roll-On"
  if (key === 'herencia_rubbing') return "Rubbing Alcohol"
  if (key === 'herencia_cream') return "Topical Cream"
  if (key === 'moon_gummies-15ct') return "Moon Phase Gummies Jar"
  if (key === 'moon_gummies') return "Moon Phase Gummies Pouch"
  if (key === 'moon_oil') return "Moon Phase Oil Tincture"
  if (key === 'moon_tablets') return "Moon Phase Tablets"


  return key
}


export const FormatProductNameLong = (item) => {
  return FormatProductName(item.serie.identifier + "_" + item.identifier)
}

export const FormatIdentifier = (identifier) => {
  if (identifier == 'topical_cream') return 'cream'

  return identifier;
}

export class Distributor {
  constructor(identifier, company, managers, address, lines, lat, lng, status, route, location) {
    this.identifier = identifier;
    this.company = company;
    this.managers = managers;
    this.address = address;
    this.lines = lines;
    this.lat = lat;
    this.lng = lng;
    this.location = location;
    this.status = status;
    this.route = route;
    this.distance = this.CalculateDistance()
  }

  CalculateDistance() {
    let coords = {
      lat: this.lat,
      lng: this.lng
    }
    let user = {
      lat: this.location?.latitude,
      lng: this.location?.longitude
    }

    return haversine(coords, user) / 3961 // returns distance in km
  }

}
