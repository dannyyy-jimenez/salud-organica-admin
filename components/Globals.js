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
    if (key === 'herencia_rollon') return "Rubbing Alcohol Roll-On"
    if (key === 'herencia_rubbing') return "Rubbing Alcohol"
    if (key === 'herencia_cream') return "Topical Cream"
    if (key === 'moon_gummies-15ct') return "Gummies Jar"
    if (key === 'moon_gummies') return "Gummies Pouch"
    if (key === 'moon_oil') return "Oil Tincture"
    if (key === 'moon_tablets') return "Tablets"
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
