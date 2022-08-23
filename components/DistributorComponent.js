import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Alert, Text, TextInput, View, Dimensions, Image, TouchableOpacity, SafeAreaView } from 'react-native';
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

import API from '../Api'
import moment from 'moment'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const infoSheetRef = React.createRef();
const herenciaUpkeepSheetRef = React.createRef();

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

  const [info, setInfo] = React.useState({})

  // view range from date 1 to date 2

  const [rangeBegin, setRangeBegin] = React.useState(null)
  const [rangeEnd, setRangeEnd] = React.useState(null)

  // product inventories

  const [alcohol, setAlcohol] = React.useState(0)
  const [creams, setCreams] = React.useState(0)
  const [rollons, setRollons] = React.useState(0)

  // edgybear

  const [tropicalGummies, setTropicalGummies] = React.useState(0)
  const [sourappleGummies, setSourappleGummies] = React.useState(0)
  const [berriesGummies, setBerriesGummies] = React.useState(0)
  const [godfatherJoints, setGodfatherJoints] = React.useState(0)
  const [sourdieselJoints, setSourdieselJoints] = React.useState(0)
  const [spacecandyJoints, setSpacecandyJoints] = React.useState(0)
  const [godfatherFlower, setGodfatherFlower] = React.useState(0)
  const [sourdieselFlower, setSourdieselFlower] = React.useState(0)
  const [spacecandyFlower, setSpacecandyFlower] = React.useState(0)
  const [oilDefault, setOilDefault] = React.useState(0)

  const load = async (checkThreshold = false) => {
    setIsLoading(true)
    setInventory([])

    try {
      const res = await API.get('/admin/inventory', {identifier: route.params.identifier, line: line, rangeBegin, rangeEnd});

      if (res.isError) throw 'error';

      setInventory(res.data._i)
      setLines(res.data._l)
      setLine(res.data._line)
      setProgressLog(res.data._progressLog)
      setNotes(null)
      setInfo(res.data._info)
      setIsLoading(false)
      setProjections(res.data._projections)

      if (res.data._info.dist_lanes === 0) {
        herenciaUpkeepSheetRef.current?.setModalVisible(true)
      }

      if (line === 'herencia' && !isDelivery) {
        let maxes = {
          alcohols: info?.herencia_displays * 8,
          creams: info?.herencia_displays * 8
        }

        if (inventory[0].herencia_rubbing < maxes.alcohols * 0.9 && inventory[0].herencia_cream < maxes.creams * 0.9) {
          Alert.alert(
            'Product Amount Low',
            `Talk to ${info.managers.join(' or  ')} about re-uping on product`,
            [],
            {
              cancelable: true,
              onDismiss: () => {}
            }
          );
        } else if (inventory[0].herencia_cream < maxes.creams * 0.9) {
          Alert.alert(
            'Alcohol Amount Low',
            `Talk to ${info.managers.join(' or  ')} about re-uping on alcohol`,
            [],
            {
              cancelable: true,
              onDismiss: () => {}
            }
          );
        } else if (inventory[0].herencia_rubbing < maxes.alcohols * 0.9) {
          Alert.alert(
            'Cream Amount Low',
            `Talk to ${info.managers.join(' or  ')} about re-uping on creams`,
            [],
            {
              cancelable: true,
              onDismiss: () => {}
            }
          );
        }
      }
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [])


  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  const onUpdate = async () => {
    setIsLoading(true);

    try {
      const res = await API.post('/admin/inventory', {editMode: editMode, editID: editID, identifier: route.params.identifier, line, isDelivery, herencia_rubbing: alcohol, herencia_cream: creams, herencia_rollon: rollons, sourappleGummies, tropicalGummies, berriesGummies, sourdieselFlower, sourdieselJoints, oilDefault, spacecandyJoints, spacecandyFlower, godfatherFlower, godfatherJoints, note: notes});

      if (res.isError) throw 'error';

      actionSheetRef.current?.setModalVisible(false)
      setAlcohol(0)
      setCreams(0)
      setRollons(0)
      setNotes(null)
      setEditID(null)
      setEditMode(false)
      load(true)

      console.log(res)

    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onUpdateHerenciaUpkeep = async () => {
    setIsLoading(true);

    try {
      const res = await API.post('/admin/distributors/herencia', {distributorId: route.params.identifier, herencia_displays: info?.herencia_displays, herencia_visibility: info?.herencia_visibility, dist_lanes: info?.dist_lanes});

      console.log(res)
      if (res.isError) throw 'error';

      actionSheetRef.current?.setModalVisible(false)
      setAlcohol(0)
      setCreams(0)
      setRollons(0)
      setNotes(null)
      setEditID(null)
      setEditMode(false)
      load(true)

      console.log(res)

    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onEdit = (lin) => {
    setEditID(lin.id)
    setEditMode(true)
    if (line === 'herencia') {
      setNotes(lin.note)
      setRollons(lin.herencia_rollon)
      setAlcohol(lin.herencia_rubbing)
      setCreams(lin.herencia_cream)
    }
    actionSheetRef.current?.setModalVisible(true)
  }

  const FormatLine = (l) => {
    if (l === 'herencia') return "La Herencia del Abuelo"
    if (l === 'edgybear') return "La Herencia del Abuelo"

    return l
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

  React.useEffect(() => {
    if (!rangeBegin && !rangeEnd) {
      load()
    } else if (rangeEnd) {
      load()
    }
  }, [rangeEnd])

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
        <TouchableOpacity
          onPress={() => infoSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'
          style={{marginRight: 10}}>
          <Feather name="info" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.defaultTabScrollContent]} contentContainerStyle={{alignItems: 'center', width: '98%', marginLeft: '1%', paddingBottom: Platform.OS === 'android' ? 100 : 60, justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap'}} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
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
          !isLoading &&
          <>
            <View style={styles.defaultRowContainer, styles.fullWidth}>
              {
                lines.includes('herencia') && lines.length > 1 &&
                <Image style={{height: 80, opacity: line === 'herencia' ? 0.8 : 0.2, margin: 4, resizeMode: 'contain'}} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1616525507/characters/abuelo.png`}} />
              }
              {
                lines.includes('edgybear') && lines.length > 1 &&
                <Image style={{height: 80, opacity: line === 'edgybear' ? 0.8 : 0.2, margin: 4, resizeMode: 'contain'}} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1616525507/characters/edgybear.png`}} />
              }
            </View>

            <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Timelapse of Inventory</Text>
            <LineChart
              data={{
                labels: projections ? [...inventory.map(lin => lin.date).reverse().slice(-4), moment(projections[14].date).format("MM/DD")] : inventory.map(lin => lin.date).reverse().slice(-5),
                datasets: [
                  {
                    data: projections ? [...inventory.map(lin => lin.totalCount).reverse().slice(-4), projections[14].amount] : inventory.map(lin => lin.totalCount).reverse().slice(-5)
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
                    labels: progressLog.labels, // optional
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
                  line === "herencia" &&
                  <>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[0]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Alcohol(s)</Text>
                      <View style={styles.spacer}></View>
                    </View>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[1]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Rollon(s)</Text>
                      <View style={styles.spacer}></View>
                    </View>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[2]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Cream(s)</Text>
                      <View style={styles.spacer}></View>
                    </View>
                  </>
                }
                {
                  line === "edgybear" &&
                  <>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[0]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Gummies</Text>
                      <View style={styles.spacer}></View>
                    </View>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[1]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Joints</Text>
                      <View style={styles.spacer}></View>
                    </View>
                    <View style={[styles.statCardM]}>
                      <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{progressLog.changes[2]}</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.fullWidth, styles.centerText, styles.tertiary]}>Flower</Text>
                      <View style={styles.spacer}></View>
                    </View>
                  </>
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

            <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 55}]}>Most Recent Logs</Text>
            {
              inventory.slice(0, 5).map((lin, idx) => {
                if (lin.line === 'herencia') {
                  return (
                    <TouchableOpacity style={[styles.statCard, {width: '98%'}]} onPress={() => onEdit(lin)}>
                      <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{lin.date} {lin.isDelivery ? "(Delivery)" : ""}</Text>
                      <View style={[styles.baseText, styles.fullWidth, styles.tertiary, styles.center, styles.defaultRowContainer, {marginTop: 10}]}>
                        <Text>Alcohols: {lin.herencia_rubbing}</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.primary, styles.bold]}>{lin.isDelivery ? CalculateDelivered('herencia_rubbing', lin, idx) : ''}</Text>
                      </View>
                      <View style={[styles.baseText, styles.fullWidth, styles.tertiary, styles.center, styles.defaultRowContainer, {marginTop: 10}]}>
                        <Text>Rollons: {lin.herencia_rollon}</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.primary, styles.bold]}>{lin.isDelivery ? CalculateDelivered('herencia_rollon', lin, idx) : ''}</Text>
                      </View>
                      <View style={[styles.baseText, styles.fullWidth, styles.tertiary, styles.center, styles.defaultRowContainer, {marginTop: 10}]}>
                        <Text>Creams: {lin.herencia_cream}</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.primary, styles.bold]}>{lin.isDelivery ? CalculateDelivered('herencia_cream', lin, idx) : ''}</Text>
                      </View>
                      {
                        typeof lin.note === "string" && lin.note !== ""  &&
                        <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>{lin.note}</Text>
                      }
                    </TouchableOpacity>
                  )
                }

                if (lin.line === 'edgybear') {
                  return (
                    <View style={[styles.statCard, {width: '98%'}]}>
                      <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary]}>{lin.date} {lin.isDelivery ? "(Delivery)" : ""}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Sour Apple Gummies: {lin.edgybear_sour_apple}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Berries Gummies: {lin.edgybear_berries}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Tropical Gummies: {lin.edgybear_tropical}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Godfather Joints: {lin.edgybear_godfather}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Sour Diesel Joints: {lin.edgybear_sour_diesel}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Space Candy Joints: {lin.edgybear_space_candy}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Sour Diesel Flower: {lin.edgybear_sour_diesel_flower}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Godfather Flower: {lin.edgybear_godfather_flower}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Space Candy Flower: {lin.edgybear_space_candy_flower}</Text>
                      <Text style={[styles.baseText, styles.fullWidth, styles.tertiary, {marginTop: 10}]}>Default Oil: {lin.edgybear_oil}</Text>
                      {
                        typeof lin.note === "string" && lin.note !== ""  &&
                        <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>{lin.note}</Text>
                      }
                    </View>
                  )
                }
                return (
                  <></>
                )
              })
            }
          </>
        }
      </ScrollView>

      <TouchableOpacity onPress={() => actionSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
        <Feather name="sliders" size={22} color={stylesheet.SecondaryTint} />
      </TouchableOpacity>

      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View style={{marginBottom: 30}}>
          {
            line === 'herencia' &&
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
              <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Tap Box to Add Product Count</Text>
              <View style={[styles.defaultInventoryCardAddon, styles.defaultRowContainer, styles.center]}>
                <TouchableOpacity onPress={() => alcohol !== 0 ? setAlcohol(alcohol - 1) : setAlcohol(0)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'red', marginLeft: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>-</Text>
                </TouchableOpacity>
                <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                  <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{alcohol}</Text>
                  <Text style={[styles.baseText, styles.primary, styles.bold, styles.center]}>Alcohols</Text>
                </View>
                <TouchableOpacity onPress={() => setAlcohol(alcohol + 1)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'green', marginRight: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.defaultInventoryCardAddon, styles.defaultRowContainer, styles.center]}>
                <TouchableOpacity onPress={() => creams !== 0 ? setCreams(creams - 1) : setCreams(0)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'red', marginLeft: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>-</Text>
                </TouchableOpacity>
                <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                  <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{creams}</Text>
                  <Text style={[styles.baseText, styles.primary, styles.bold, styles.center]}>Creams</Text>
                </View>
                <TouchableOpacity onPress={() => setCreams(creams + 1)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'green', marginRight: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.defaultInventoryCardAddon, styles.defaultRowContainer, styles.center]}>
                <TouchableOpacity onPress={() => rollons !== 0 ? setRollons(rollons - 1) : setRollons(0)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'red', marginLeft: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>-</Text>
                </TouchableOpacity>
                <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                  <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{rollons}</Text>
                  <Text style={[styles.baseText, styles.primary, styles.bold, styles.center]}>Roll-Ons</Text>
                </View>
                <TouchableOpacity onPress={() => setRollons(rollons + 1)} style={[styles.defaultRowContainer, styles.center, {backgroundColor: 'green', marginRight: 10, width: 30, height: 30, borderRadius: 15}]}>
                  <Text style={[styles.secondary, {fontSize: 20}]}>+</Text>
                </TouchableOpacity>
              </View>
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
          }
          {
            line === 'edgybear' &&
            <View style={[styles.defaultColumnContainer, styles.fullWidth]}>
              <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Notes</Text>
              <TextInput
                placeholderTextColor="#888"
                multiline={true}
                style={[{marginTop: 10,  marginBottom: 40}, styles.baseInput]}
                placeholder="Enter notes here"
                numberOfLines={5}
                value={notes}
                onChangeText={(text) => setNotes(text)}
              />
              <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Tap Box to Add Product Count</Text>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {flexWrap: 'wrap'}]}>
                <TouchableOpacity onPress={() => setTropicalGummies(tropicalGummies + 1)} onLongPress={() => tropicalGummies !== 0 ? setTropicalGummies(tropicalGummies - 1) : setTropicalGummies(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{tropicalGummies}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Tropical Gummies</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSourappleGummies(sourappleGummies + 1)} onLongPress={() => sourappleGummies !== 0 ? setSourappleGummies(sourappleGummies - 1) : setSourappleGummies(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{sourappleGummies}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Sour Apple Gummies</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBerriesGummies(berriesGummies + 1)} onLongPress={() => berriesGummies !== 0 ? setBerriesGummies(berriesGummies - 1) : setBerriesGummies(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{berriesGummies}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Berries Gummies</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSourdieselJoints(sourdieselJoints + 1)} onLongPress={() => sourdieselJoints !== 0 ? setSourdieselJoints(sourdieselJoints - 1) : setSourdieselJoints(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{sourdieselJoints}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Sour Diesel Joints</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSpacecandyJoints(spacecandyJoints + 1)} onLongPress={() => spacecandyJoints !== 0 ? setSpacecandyJoints(spacecandyJoints - 1) : setSpacecandyJoints(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{spacecandyJoints}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Space Candy Joints</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setGodfatherJoints(godfatherJoints + 1)} onLongPress={() => godfatherJoints !== 0 ? setGodfatherJoints(godfatherJoints - 1) : setGodfatherJoints(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{godfatherJoints}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Godfather Joints</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSourdieselFlower(sourdieselFlower + 1)} onLongPress={() => sourdieselFlower !== 0 ? setSourdieselFlower(sourdieselFlower - 1) : setSourdieselFlower(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{sourdieselFlower}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Sour Diesel Flower</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSpacecandyFlower(spacecandyFlower + 1)} onLongPress={() => spacecandyFlower !== 0 ? setSpacecandyFlower(spacecandyFlower - 1) : setSpacecandyFlower(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{spacecandyFlower}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Space Candy Flower</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setGodfatherFlower(godfatherFlower + 1)} onLongPress={() => godfatherFlower !== 0 ? setGodfatherFlower(godfatherFlower - 1) : setGodfatherFlower(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{godfatherFlower}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Godfather Flower</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setOilDefault(oilDefault + 1)} onLongPress={() => oilDefault !== 0 ? setOilDefault(oilDefault - 1) : setOilDefault(0)} style={[styles.defaultInventoryCardAddonSmall, styles.defaultRowContainer, styles.center]}>
                  <View style={[styles.defaultColumnContainer, styles.spacer, styles.center]}>
                    <Text style={[styles.headerText, styles.primary, styles.bold, styles.center]}>{oilDefault}</Text>
                    <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, styles.centerText]}>Oil Default</Text>
                  </View>
                </TouchableOpacity>
              </View>

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
          }
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
          <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>This location offers <Text style={[styles.primary, styles.bold]} selectable={true}>{lines.map(l => FormatLine(l)).join(' and ')}</Text></Text>
          {
            lines.includes('herencia') &&
            <Text selectable={true} style={[styles.baseText, styles.center, {marginTop: 10}]}>There should be a total of <Text style={[styles.primary, styles.bold]} selectable={true}>{info?.herencia_displays}</Text> Herencia del Abuelo displays at this location</Text>
          }
          <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 10}]}>
            {
              line === 'herencia' &&
              <TouchableOpacity
                onPress={() => navigation.navigate('DistributorDepth', {identifier: route.params.identifier, company: route.params.company})}
                underlayColor='#fff'
                style={{marginLeft: 10, marginRight: 10}}>
                <Feather name="bar-chart-2" size={26} color={stylesheet.Primary} />
              </TouchableOpacity>
            }
            <TouchableOpacity
              onPress={() => {infoSheetRef.current?.setModalVisible(false); setTimeout(() => herenciaUpkeepSheetRef.current?.setModalVisible(true), 500)}}
              underlayColor='#fff'>
              <Feather name="layout" size={24} color={stylesheet.Primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={herenciaUpkeepSheetRef}>
        <View style={{padding: 20}}>
          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Herencia del Abuelo Displays</Text>
          <TextInput
            placeholderTextColor="#888"
            style={[{marginTop: 10,  marginBottom: 40}, styles.baseInput]}
            placeholder="Enter amount..."
            value={info?.herencia_displays?.toString()}
            keyboardType={"numeric"}
            onChangeText={(text) => setInfo({...info, herencia_displays: text})}
          />

          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>How Visible are the Displays?</Text>

          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => setInfo({...info, herencia_visibility: 5})}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info?.herencia_visibility == 5 ? 0.2 : 1}]}>Next to Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => setInfo({...info, herencia_visibility: 4})}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info?.herencia_visibility == 4 ? 0.2 : 1}]}>By Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => setInfo({...info, herencia_visibility: 3})}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info?.herencia_visibility == 3 ? 0.2 : 1}]}>In Lane</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => setInfo({...info, herencia_visibility: 2})}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info?.herencia_visibility == 2 ? 0.2 : 1}]}>Close to Lane</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paddedWidth, {marginTop: 10, marginBottom: 10}]} onPress={() => setInfo({...info, herencia_visibility: 1})}>
            <Text style={[styles.baseText, styles.tertiary, {opacity: info?.herencia_visibility == 1 ? 0.2 : 1}]}>Stored Away</Text>
          </TouchableOpacity>

          <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>How many lanes are there in total?</Text>

          <TextInput
            placeholderTextColor="#888"
            style={[{marginTop: 10,  marginBottom: 40}, styles.baseInput]}
            placeholder="Enter amount..."
            value={info?.dist_lanes?.toString()}
            keyboardType={"numeric"}
            onChangeText={(text) => setInfo({...info, dist_lanes: text})}
          />


          {
            info?.herencia_displays && info?.herencia_visibility &&
            <TouchableOpacity onPress={onUpdateHerenciaUpkeep} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 40}]}>
              <Text style={styles.secondary}>Update</Text>
            </TouchableOpacity>
          }
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
