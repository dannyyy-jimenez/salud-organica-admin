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


export const FormatProductName = (key) => {
  if (key === 'herencia_rollon') return "Roll-On"
  if (key === 'herencia_rubbing') return "Alcohol"
  if (key === 'herencia_cream') return "Cream"

  return key
}
