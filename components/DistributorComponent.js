import * as React from 'react';
import { ScrollView, RefreshControl, Pressable, StyleSheet, Alert, Text, TextInput, View, Dimensions, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { Feather, Ionicons, Entypo } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from "react-native-chart-kit";
import { FormatProductName, FormatSerieName } from './Globals'
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {SheetManager} from 'react-native-actions-sheet';
import InvoiceModel from './Invoice.model'

import API from '../Api'
import moment from 'moment'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const infoSheetRef = React.createRef();
const layoutSheetRef = React.createRef();
const managersUpkeepActionsheetRef = React.createRef();

export default function DistributorComponent({navigation, route}) {
  const [lines, setLines] = React.useState([])
  const [inventory, setInventory] = React.useState([])
  const [line, setLine] = React.useState(null)
  const animationRef = React.useRef(null)
  const fulfilledRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDelivery, setIsDelivery] = React.useState(false)
  const [progressLog, setProgressLog] = React.useState(null)
  const [notes, setNotes] = React.useState("")
  const [editMode, setEditMode] = React.useState(false)
  const [editID, setEditID] = React.useState(null)
  const [projections, setProjections] = React.useState(null)
  const [lineProducts, setLineProducts] = React.useState([])
  const [editDate, setEditDate] = React.useState(null)
  const [showEditDate, setShowEditDate] = React.useState(false)
  const [isDatePickerVisible, setDatePickerVisibility] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(true)
  const [invoicesStatus, setInvoicesStatus] = React.useState("")
  const [invoices, setInvoices] = React.useState([])
  const [topups, setTopUps] = React.useState([])
  const [showInvoices, setShowInvoices] = React.useState(false);

  const [info, setInfo] = React.useState({})

  const [presetManager, setPresetManager] = React.useState('')
  const [managersHasChanged, setManagersHasChanged] = React.useState(false)

  // view range from date 1 to date 2

  const [rangeBegin, setRangeBegin] = React.useState(null)
  const [rangeEnd, setRangeEnd] = React.useState(null)

  // product inventories

  const [inventories, setInventories] = React.useState({})

  const load = async (checkThreshold = false) => {
    setIsLoading(true)
    setInventory([])

    try {
      const res = await API.get('/admin/inventory', {identifier: route.params.identifier, line: line, rangeBegin, rangeEnd});
      const invoicesReq = await API.get('/admin/invoices', {distributor: route.params.identifier})

      if (res.isError || invoicesReq.isError) throw 'error';

      setInventory(res.data._i)
      setLines(res.data._l)
      setLine(res.data._line)
      setProgressLog(res.data._progressLog)
      setNotes(null)
      setLineProducts(res.data._line_products)
      setInfo(res.data._info)
      setProjections(res.data._projections)

      setInventories(res.data._line_products.reduce((o, key) => ({ ...o, [`${res.data._line}_${key}`]: 0}), {}))

      if (res.data._info.dist_lanes === 0) {
        layoutSheetRef.current?.setModalVisible(true)
      }

      // TODO:  needs treshold

      setInvoices(invoicesReq.data.invoices);
      setTopUps(invoicesReq.data.topups)

      let due = invoicesReq.data.invoices.filter(i => i.dueDays < 1 && !i.paid);
      let pending = invoicesReq.data.invoices.filter(i => i.dueDays > 0 && !i.paid);
      let statusArr = []
      if (due.length > 0) {
        statusArr.push(`${due.length} Due`)
      }
      if (pending.length > 0) {
        statusArr.push(`${pending.length} Pending`)
      }
      setInvoicesStatus(statusArr.join(', '))

      // find invoices rundown

      setIsLoading(false)

      console.log(invoicesReq.data.invoices)

    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  const onUpdate = async () => {

    setIsLoading(true);

    try {
      const res = await API.post('/admin/inventory', {editMode: editMode, editID: editID, editDate: editDate, identifier: route.params.identifier, line, isDelivery, ...inventories, note: notes});

      if (res.isError) throw 'error';

      setInventories(lineProducts.reduce((o, key) => ({ ...o, [`${line}_${key}`]: 0}), {}))
      setNotes(null)
      setEditID(null)
      setEditMode(false)
      load(true)

      setTimeout(() => {
        actionSheetRef.current?.setModalVisible(false)
      }, 1000)

    } catch (e) {
      setIsLoading(false)
    }
  }

  const onUpdateLayout = async () => {
    setIsLoading(true);

    try {
      const res = await API.post('/admin/distributors/layout', {line: line, distributorId: route.params.identifier, ...info});

      if (res.isError) throw 'error';

      layoutSheetRef.current?.setModalVisible(false)
      setInventories(res.data._line_products.reduce((o, key) => ({ ...o, [`${line}_${key}`]: 0}), {}))

      setNotes(null)
      setEditID(null)
      setEditMode(false)
      load(true)

    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onEdit = (lin) => {
    setEditID(lin.id)
    setEditMode(true)
    setNotes(lin.note)
    setEditDate(moment(lin.date_raw).toDate())
    setInventories(prevState => {
      let log = {}
      lineProducts.forEach((product, i) => {
        let key = line + "_" + product
        log[key] = lin[key]
      });

      return {
        ...prevState,
        ...log
      }
    })

    actionSheetRef.current?.setModalVisible(true)
  }

  const FormatRouteNumber = (l) => {
    if (l === 1) return '1st'

    if (l === 2) return '2nd'

    if (l === 3) return '3rd'

    return l + 'th'
  }

  const FormatRouteLetter = (l) => {

    if (l === 'A') {
      return 'Chicago'
    }
    if (l === 'B') {
      return 'Waukegan'
    }
    if (l === 'C') {
      return 'Joliet'
    }
    if (l === 'D') {
      return 'Elgin'
    }
    if (l === 'E') {
      return 'Aurora'
    }
    if (l === 'F') {
      return 'Evergreen'
    }
    if (l === 'G') {
      return 'Northside'
    }

    if (l == 'H') {
      return 'New York TBD'
    }

    return l
  }

  const onDataPointClick = (point) => {

    if (rangeBegin !== null && rangeEnd !== null) {
      setRangeEnd(null)
      setRangeBegin(null)
      return;
    }

    if (rangeBegin === null) {
      setRangeBegin(point.index)
      return;
    }

    if (point.index > rangeBegin) {
      setRangeEnd(point.index)
    } else {
      setRangeBegin(point.index)
    }
  }

  const CalculateDelivered = (key, lin,  idx) => {
    let previousQuantity = idx < inventory.length - 1 ? inventory[idx + 1][key] : 0

    let added = lin[key] - previousQuantity

    if (added === 0) {
      return '';
    }

    return `(+${added})`
  }

  const UpdateInventories = (key, minus = false) => {
    setInventories(prevState => {
      let newState = {...prevState}

      if (minus) {
        newState[key] = prevState[key] == 0 ? 0 : prevState[key] - 1
      } else {
        newState[key] = prevState[key] + 1
      }

      return newState
    })
  }

  const UpdateInfo = (key_suffix, value) => {
    setInfo(prevState => {
      let newState = {...prevState}

      newState[`${line}_${key_suffix}`] = value

      return  newState
    })
  }

  const onManagersUpdate = async () => {
    setIsLoading(true);

    try {
      const res = await API.post('/admin/distributors/managers', {distributorId: route.params.identifier, managers: info?.managers?.join(',')});

      if (res.isError) throw 'error';

      managersUpkeepActionsheetRef.current?.setModalVisible(false)
      setManagersHasChanged(false)
      setIsLoading(false)
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const loadInvoices = async () => {
    try {
      const res = await API.get('/admin/invoices', {distributor: route.params.identifier});
      if (!res) throw 'error'

      setInvoices(res.data._invoices)
    } catch (e) {
      onCreateIntent()
    }
  }

  const onCreateIntent = async () => {
    let created = await SheetManager.show('New-Invoice-Sheet', {
      payload: {
        client: route.params.identifier
      }
    })

    if (created) {
      loadInvoice(created)
    }
  }

  const loadInvoice = async (identifier) => {
    try {
      const res = await API.get('/admin/invoice', {identifier: identifier});
      if (!res) throw 'error'

      SheetManager.show('Invoice-Sheet', {
        payload: {
          invoice: res.data._invoice,
          delivered: res.data.topped,
          created: true
        }
      })
    } catch (e) {
      onCreateIntent()
    }
  }

  const onLinePick = async (line) => {
    setLine(line)
    setMenuVisible(false)
  }

  React.useEffect(() => {
    if (!rangeBegin && !rangeEnd) {
      load()
    } else if (rangeEnd) {
      load()
    }
  }, [rangeEnd, line])

  React.useEffect(() => {
    if (menuVisible) {
      setShowInvoices(false)
    }
  }, [menuVisible])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={[styles.defaultTabHeader, {backgroundColor: stylesheet.Secondary}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          underlayColor='#fff'>
          <Feather name="chevron-left" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        {
          route.params.company.length > 30 &&
          <Text style={[styles.baseText, styles.bold, styles.primary]}>{route.params.company.slice(0, 30)}...</Text>
        }
        {
          route.params.company.length <= 30 &&
          <Text style={[styles.baseText, styles.bold, styles.primary]}>Inventory for {route.params.company}</Text>
        }
        <View style={styles.spacer}></View>
        {
          !menuVisible &&
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            underlayColor='#fff'
            style={{marginRight: 10}}>
            <Feather name="menu" size={24} color={stylesheet.Primary} />
          </TouchableOpacity>
        }
      </View>
      <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'center', justifyContent: 'flex-start', width: '100%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={"white"} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          (isLoading || inventory.length < 1) &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
              }}
              source={require('../assets/loading-leaf.json')}
            />
        }
        {
          !isLoading && menuVisible &&
          <View style={[styles.defaultRowContainer, styles.fullHeight, styles.fullWidth, {flexWrap: 'wrap', justifyContent: 'space-around', paddingTop: 15}]}>
            <TouchableOpacity onPress={() => infoSheetRef.current?.setModalVisible(true)}>
              <View style={[{width: 150, height: 200, margin: 5, marginBottom: 20, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={require('../assets/desc-icon.png')} />
                <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>Description</Text>
                <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{route.params.identifier}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => managersUpkeepActionsheetRef.current?.setModalVisible(true)}>
              <View style={[{width: 150, height: 200, margin: 5, marginBottom: 20, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={require('../assets/team-icon.png')} />
                <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>Staff</Text>
                <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{info?.managers.join(',')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setMenuVisible(false); setShowInvoices(true)}}>
              <View style={[{width: 150, height: 200, margin: 5, marginBottom: 20, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={require('../assets/invoice-icon.png')} />
                <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>Invoices</Text>
                <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{invoicesStatus}</Text>
              </View>
            </TouchableOpacity>
            {
              lines.includes('herencia') &&
              <TouchableOpacity onPress={() => onLinePick('herencia')}>
                <View style={[{width: 150, height: 200, margin: 5, marginBottom: 20, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                  <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1616525507/characters/abuelo.png`}} />
                  <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>{FormatSerieName('herencia')}</Text>
                  <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{info.herencia_displays || 0} Displays</Text>
                </View>
              </TouchableOpacity>
            }
            {
              lines.includes('moon') &&
              <TouchableOpacity onPress={() => onLinePick('moon')}>
                <View style={[{width: 150, height: 200, margin: 5, marginBottom: 20, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                  <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1616525507/characters/rabbit.png`}} />
                  <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>{FormatSerieName('moon')}</Text>
                  <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{info.moon_displays || 0} Displays</Text>
                </View>
              </TouchableOpacity>
            }
            {
              lines.includes('edgybear') &&
              <TouchableOpacity onPress={() => onLinePick('edgybear')}>
                <View style={[{width: 150, height: 200, backgroundColor: 'white', borderRadius: 4, padding: 10}, styles.elevated, styles.center, styles.defaultColumnContainer]}>
                  <Image style={{height: 100, width: 100, margin: 4, resizeMode: 'contain'}} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1616525507/characters/edgybear.png`}} />
                  <Text style={[styles.tinyText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15}]}>{FormatSerieName('edgybear')}</Text>
                  <Text style={[styles.miniText, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 2}]}>{info.edgybear_displays || 0} Displays</Text>
                </View>
              </TouchableOpacity>
            }
          </View>
        }
        {
          !isLoading && !menuVisible && showInvoices && invoices.map((invoice) => {
            return (
              <InvoiceModel key={invoice.identifier} topups={topups} data={invoice} />
            )
          })
        }
        {
          !isLoading && !menuVisible && !showInvoices && inventory.length > 0 &&
          <>
            {
              inventory.length > 1 &&
              <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>{FormatSerieName(line)} Timelapse</Text>
            }
            {
              inventory.length > 1 &&
              <LineChart
                data={{
                  labels: inventory.map(lin => lin.date).reverse().slice(-5),
                  datasets: [
                    {
                      data: inventory.map(lin => lin.totalCount).reverse().slice(-5)
                    }
                  ]
                }}
                getDotColor={(dataPoint, dataPointIndex) => {

                  if (rangeBegin === dataPointIndex || rangeEnd === dataPointIndex) return stylesheet.Primary

                  return "#000"
                }}
                onDataPointClick={onDataPointClick}
                width={Dimensions.get("window").width * 0.98} // from react-native
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={1} // optional, defaults to 1
                withShadow={false}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={true}
                withHorizontalLines={true}
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  fillShadowGradientFrom: "blue",
                  fillShadowGradientTo: "red",
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 1,
                  fillShadowGradientFromOpacity: 0,
                  fillShadowGradientToOpacity: 1,
                  propsForBackgroundLines: [{
                    fillOpacity: 0.7,
                  }],
                  decimalPlaces: 0, // optional, defaults to 2dp
                  color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                }}
                bezier
                style={{
                  padding: 0,
                  margin: 0,
                  marginTop: 40,
                  left: -20
                }}
              />
            }

            {
              projections && inventory.length > 0 &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>{FormatSerieName(line)} Projections</Text>
                <LineChart
                  data={{
                    labels: ["", moment(projections[7].date).format('MM/DD'), moment(projections[14].date).format('MM/DD'), moment(projections[21].date).format('MM/DD')],
                    datasets: [
                      {
                        data: [inventory[0].totalCount, projections[7].amount, projections[14].amount, projections[21].amount]
                      }
                    ]
                  }}
                  getDotColor="#000"
                  width={Dimensions.get("window").width * 0.98} // from react-native
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  yAxisInterval={1} // optional, defaults to 1
                  withShadow={false}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLines={true}
                  withHorizontalLines={true}
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    fillShadowGradientFrom: "blue",
                    fillShadowGradientTo: "red",
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientToOpacity: 1,
                    fillShadowGradientFromOpacity: 0,
                    fillShadowGradientToOpacity: 1,
                    propsForBackgroundLines: [{
                      fillOpacity: 0.7,
                    }],
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: (opacity = 1) => stylesheet.Primary,
                    labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                  }}
                  bezier
                  style={{
                    padding: 0,
                    margin: 0,
                    marginTop: 40,
                    left: -20
                  }}
                />
              </>
            }

            {
              progressLog && ((inventory.length > 0 && inventory[1].totalCount - inventory[0].totalCount >= 0) || rangeBegin) &&
              <>
                {
                  rangeBegin !== null && rangeEnd !== null &&
                  <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Progress From {inventory.slice().reverse()[rangeBegin].date} to {inventory.slice().reverse()[rangeEnd].date}</Text>
                }
                {
                  (rangeBegin == null || rangeEnd == null) &&
                  <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Progress Since Previous Log ({progressLog.date})</Text>
                }
                <ProgressChart
                  data={{
                    labels: progressLog.labels.map(label => FormatProductName(line + "_" + label, true)), // optional
                    data: progressLog.data
                  }}
                  width={Dimensions.get("window").width * 0.98}
                  height={220}
                  style={{left: -20}}
                  strokeWidth={16}
                  radius={32}
                  chartConfig={{
                    backgroundColor: "#FFF",
                    backgroundGradientFrom: "#FFF",
                    backgroundGradientTo: "#FFF",
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: (opacity = 1) => `rgba(0, 158, 96, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 158, 96, ${opacity})`
                  }}
                  hideLegend={false}
                />

                {
                  progressLog.labels.map(label => {
                    return (
                      <View style={[styles.statCardM, {flex: 1}]}>
                        <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[progressLog.labels.indexOf(label)]}</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>{FormatProductName(line+"_"+label, true).pluralize()}</Text>
                        <View style={styles.spacer}></View>
                      </View>
                    )
                  })
                }
                {
                  rangeBegin !== null && rangeEnd !== null &&
                  <View style={[styles.statCardM, {width: '98%'}]}>
                    <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>-{inventory.slice().reverse()[rangeBegin].totalCount - inventory.slice().reverse()[rangeEnd].totalCount} ({((1 - (inventory.slice().reverse()[rangeEnd].totalCount / inventory.slice().reverse()[rangeBegin].totalCount)) * 100).toFixed(2)})%</Text>
                    <View style={styles.spacer}></View>
                    <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Total Product Change</Text>
                    <View style={styles.spacer}></View>
                  </View>
                }
                {
                  (!rangeBegin || !rangeEnd) &&
                  <View style={[styles.statCardM, {width: '98%'}]}>
                    <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>-{inventory[1].totalCount - inventory[0].totalCount} ({((1 - (inventory[0].totalCount / inventory[1].totalCount)) * 100).toFixed(2)})%</Text>
                    <View style={styles.spacer}></View>
                    <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Total Product Change</Text>
                    <View style={styles.spacer}></View>
                  </View>
                }
              </>
            }

            <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 55}]}>{FormatSerieName(line)} Logs</Text>
            {
              inventory.slice(0, 5).map((lin, idx) => {
                return (
                  <TouchableOpacity style={[styles.statCard, {width: '98%'}]} onPress={() => onEdit(lin)}>
                    <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{lin.date} {lin.isDelivery ? "(Delivery)" : ""}</Text>
                    {
                      lineProducts.map(identifier => {
                        let key = `${line}_${identifier}`
                        return (
                          <View style={[styles.baseText, styles.fullWidth, styles.tertiary, styles.center, styles.defaultRowContainer, {marginTop: 10}]}>
                            <Text>{FormatProductName(key, true)}: {lin[key]}</Text>
                            <View style={styles.spacer}></View>
                            <Text style={[styles.primary, styles.bold]}>{lin.isDelivery ? CalculateDelivered(key, lin, idx) : ''}</Text>
                          </View>
                        )
                      })
                    }
                    {
                      typeof lin.note === "string" && lin.note !== ""  &&
                      <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>{lin.note}</Text>
                    }
                  </TouchableOpacity>
                )
              })
            }
          </>
        }
      </ScrollView>

      {
        !menuVisible && !showInvoices && line !== "" &&
        <>
          <TouchableOpacity onPress={() => layoutSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab, {bottom: 80}]}>
            <Feather name="layout" size={22} color={stylesheet.SecondaryTint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => actionSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
            <Feather name="sliders" size={22} color={stylesheet.SecondaryTint} />
          </TouchableOpacity>
        </>
      }
      {
        !menuVisible && showInvoices &&
        <>
          <TouchableOpacity onPress={onCreateIntent} style={[styles.center, styles.fab]}>
            <Feather name="file-plus" size={22} color={stylesheet.SecondaryTint} />
          </TouchableOpacity>
        </>
      }


      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View style={{marginBottom: 30}}>
          <View style={[styles.defaultColumnContainer, styles.fullWidth]}>
            <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Notes</Text>
            <TextInput
              placeholderTextColor="#888"
              multiline={true}
              style={[{marginTop: 5,  marginBottom: 20}, styles.baseInput]}
              placeholder="Enter notes here"
              numberOfLines={1}
              value={notes}
              onChangeText={(text) => setNotes(text)}
            />
            {
              editMode &&
              <View style={{width: 140, marginBottom: 20}}>
                <Pressable onPress={() => setDatePickerVisibility(true)}>
                  <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>{editDate?.toLocaleDateString()}</Text>
                </Pressable>
                {
                  isDatePickerVisible &&
                  <DateTimePickerModal
                    display="spinner"
                    buttonTextColorIOS={stylesheet.Primary}
                    textColor={stylesheet.Primary}
                    accentColor={stylesheet.Primary}
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={(e) => {setEditDate(e);setDatePickerVisibility(false)}}
                    onCancel={(e) => {setDatePickerVisibility(false)}}
                  />
                }
              </View>
            }
            <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Tap Box to Add Product Count</Text>

            {
              lineProducts.map(product => {
                let key = line + "_" + product

                return (
                  <View style={[styles.defaultInventoryCardAddon, styles.defaultRowContainer, styles.center]}>
                    <TouchableOpacity onPress={() => UpdateInventories(key, true)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'red', marginLeft: 10, width: 30, height: 30, borderRadius: 15}]}>
                      <Text style={[styles.secondary, {fontSize: 20}]}>-</Text>
                    </TouchableOpacity>
                    <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                      <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{inventories[key]}</Text>
                      <Text style={[styles.baseText, styles.primary, styles.bold, styles.center]}>{FormatProductName(key)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => UpdateInventories(key)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'green', marginRight: 10, width: 30, height: 30, borderRadius: 15}]}>
                      <Text style={[styles.secondary, {fontSize: 20}]}>+</Text>
                    </TouchableOpacity>
                  </View>
                )
              })
            }
            <TouchableOpacity onPress={() => setIsDelivery(!isDelivery)} style={[styles.defaultRowContainer, styles.actionListItem, {padding: 20, marginTop: 30,  marginBottom: 30}]}>
              <Text style={[styles.spacer, styles.baseText, styles.bold, styles.tertiary]}>Tap to Mark as Delivery</Text>
              {
                isDelivery &&
                <Ionicons name="md-checkmark" size={22} color={stylesheet.Tertiary} style={styles.bold} />
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={onUpdate} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%'}]}>
              <Text style={styles.secondary}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={infoSheetRef}>
        <View style={{padding: 20}}>
          <Text selectable={true} style={[styles.baseText, styles.primary, styles.bold, styles.centerText]}>{route.params.identifier}</Text>
          <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>{route.params.company} is the <Text selectable={true} style={[styles.primary, styles.bold]}>{FormatRouteNumber(info?.routeNumeration)}</Text> place to visit in the <Text selectable style={[styles.primary, styles.bold]}>{FormatRouteLetter(info?.routeLetter)}</Text> route, located at <Text selectable={true} style={[styles.primary, styles.bold]}>{info?.address}</Text></Text>
          {
            info.managers &&
            <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>When visiting, if necessary, check in with <Text selectable={true} style={[styles.primary, styles.bold]}>{info?.managers.join(' or ')}</Text></Text>
          }
          <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>This location offers <Text style={[styles.primary, styles.bold]} selectable={true}>{lines.map(l => FormatSerieName(l)).join(' and ')}</Text></Text>
          <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>There should be a total of <Text style={[styles.primary, styles.bold]} selectable={true}>{info[`${line}_displays`]}</Text> {FormatSerieName(line)} displays at this location</Text>
          <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 10}]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('DistributorDepth', {identifier: route.params.identifier, company: route.params.company, line})}
              underlayColor='#fff'
              style={[{marginLeft: 10, marginRight: 10}, styles.center]}>
              <Feather name="bar-chart-2" size={26} color={stylesheet.Primary} />
              <Text style={{marginTop: 5, fontSize: 12, color: stylesheet.Primary}}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={layoutSheetRef}>
        <View style={{padding: 20}}>
          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>{FormatSerieName(line)} Displays</Text>
          <TextInput
            placeholderTextColor="#888"
            style={[{marginTop: 10,  marginBottom: 10}, styles.baseInput]}
            placeholder="Enter amount..."
            value={info[`${line}_displays`]?.toString()}
            keyboardType={"numeric"}
            onChangeText={(text) => UpdateInfo('displays', text)}
          />

          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>How Visible are the Displays?</Text>

          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => UpdateInfo('visibility', 5)}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info[`${line}_visibility`] == 5 ? 0.2 : 1}]}>Next to Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => UpdateInfo('visibility', 4)}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info[`${line}_visibility`] == 4 ? 0.2 : 1}]}>By Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => UpdateInfo('visibility', 3)}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info[`${line}_visibility`] == 3 ? 0.2 : 1}]}>In Lane</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => UpdateInfo('visibility', 2)}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info[`${line}_visibility`] == 2 ? 0.2 : 1}]}>Close to Lane</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => UpdateInfo('visibility', 1)}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info[`${line}_visibility`] == 1 ? 0.2 : 1}]}>Stored Away</Text>
          </TouchableOpacity>

          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>How many lanes are there in total?</Text>

          <TextInput
            placeholderTextColor="#888"
            style={[{marginTop: 10,  marginBottom: 10}, styles.baseInput]}
            placeholder="Enter amount..."
            value={info?.dist_lanes?.toString()}
            keyboardType={"numeric"}
            onChangeText={(text) => setInfo({...info, dist_lanes: text})}
          />


          {
            info[`${line}_displays`] && info[`${line}_visibility`] &&
            <TouchableOpacity onPress={onUpdateLayout} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 20, marginBottom: 20}]}>
              <Text style={styles.secondary}>Update</Text>
            </TouchableOpacity>
          }
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={managersUpkeepActionsheetRef}>
        <View style={{padding: 20}}>
          <Text style={[styles.baseText, styles.bold, styles.centerText, styles.marginWidth, styles.tertiary, {marginBottom: 5}]}>Edit Managers</Text>
          <Text style={[styles.baseText, styles.centerText, styles.marginWidth, styles.tertiary, {marginBottom: 20}]}>Press 'Next' on keyboard to add manager</Text>

          {
            info?.managers?.map((manager, idx) => {
              return (
                <View style={[styles.defaultRowContainer, styles.marginWidth]}>
                  <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>{manager}</Text>
                  <View style={styles.spacer}></View>
                  <TouchableOpacity
                    onPress={() => setInfo(info => {
                      info.managers.splice(idx, 1)
                      setManagersHasChanged(true)

                      return {
                        ...info,
                        managers: info.managers
                      }
                    })}
                    underlayColor='#fff' style={[{marginLeft: 10, marginRight: 10}, styles.center]}>
                    <Feather name="x" size={24} color={'red'} />
                  </TouchableOpacity>
                </View>
              )
            })
          }

          <TextInput
            placeholderTextColor="#888"
            style={[{marginTop: 10,  marginBottom: 30}, styles.baseInput]}
            placeholder="Enter manager name..."
            value={presetManager}
            keyboardType={"default"}
            returnKeyType="next"
            onChangeText={(text) => setPresetManager(text)}
            onSubmitEditing={() => {
              setInfo(info => {
                let updatedManagers = [...info.managers, presetManager]
                setManagersHasChanged(true)
                setPresetManager('')
                return {
                  ...info,
                  managers: updatedManagers
                }
              })
            }}
          />

          {
            info?.managers?.length > 0 && presetManager == "" && managersHasChanged &&
            <TouchableOpacity onPress={onManagersUpdate} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 10, marginBottom: 20}]}>
              <Text style={styles.secondary}>Update</Text>
            </TouchableOpacity>
          }
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
