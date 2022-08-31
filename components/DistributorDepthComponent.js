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
import { FormatProductName } from './Globals'

import API from '../Api'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

export default function DistributorDepthComponent({navigation, route}) {
  const [inventory, setInventory] = React.useState([])
  const [line, setLine] = React.useState(route.params.line)
  const animationRef = React.useRef(null)
  const fulfilledRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDelivery, setIsDelivery] = React.useState(false)
  const [progressLog, setProgressLog] = React.useState(null)
  const [notes, setNotes] = React.useState("")
  const [editMode, setEditMode] = React.useState(false)
  const [editID, setEditID] = React.useState(null)

  const [groupedInventory, setGroupedInventory] = React.useState([])
  const [deliveries, setDeliveries] = React.useState(null)
  const [lineProducts, setLineProducts] = React.useState([])

  const [info, setInfo] = React.useState({})

  const load = async (checkThreshold = false) => {
    setIsLoading(true)
    setInventory([])

    try {
      const res = await API.get('/admin/inventory', {identifier: route.params.identifier, line: line});

      if (res.isError) throw 'error';

      setInventory(res.data._i)
      setProgressLog(res.data._progressLog)
      setNotes(null)
      setInfo(res.data._info)
      setIsLoading(false)
      setLineProducts(res.data._line_products)

      if (res.data._i.length > 6) {
        GroupInventory(res.data._i, res.data._line_products)
      }

      AnalyzeDeliveries(res.data._i)
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const AnalyzeDeliveries = (inven) => {

    let delivs = []
    let uniqueMonths = []
    let groupedDelivs = {}

    inven.forEach((possibleDelivery, idx) => {
      if (!uniqueMonths.includes(possibleDelivery.date.split('/')[0])) {
        uniqueMonths.push(possibleDelivery.date.split('/')[0])
        groupedDelivs[possibleDelivery.date.split('/')[0]] = 0
      }

      if (possibleDelivery.isDelivery) {
        let previousInven = idx < inven.length - 1 ? inven[idx + 1] : false

        delivs.push(previousInven ? possibleDelivery.totalCount - previousInven.totalCount : possibleDelivery.totalCount)

        groupedDelivs[possibleDelivery.date.split('/')[0]] += previousInven ? possibleDelivery.totalCount - previousInven.totalCount : possibleDelivery.totalCount
      }
    })

    let totalCount = delivs.reduce((total, next) => total + next, 0)
    let slope = totalCount / uniqueMonths.length
    let numbers = uniqueMonths.map((month, idx) => (idx + 1) * slope)

    setDeliveries({
      description: `${slope} Products per Month on Average`,
      equation: `y = ${slope}x`,
      slope: slope,
      totalCount: totalCount,
      deliveries: groupedDelivs,
      deliveriesAmount: delivs.length,
      sums: [0, ...numbers],
      months: ['', ...uniqueMonths.slice().reverse()]
    })
  }

  const GroupInventory = (inven, products) => {
    let uniqueGrouper = []
    let grouped = []

    for (let i of inven) {
      if (!uniqueGrouper.includes(i.date.split('/')[0])) {
        uniqueGrouper.push(i.date.split('/')[0])

        let filteredInven = inven.filter(inv => inv.date.split('/')[0] == i.date.split('/')[0]);

        let obj = {
          date: i.date.split('/')[0],
          totalCount: filteredInven.reduce((total, next) => total + next.totalCount, 0)
        }

        products.forEach((product, i) => {
          let key = line + "_" + product
          obj[key] = filteredInven.reduce((total, next) => total + next[key], 0)
        });

        grouped.push(obj)
      }
    }

    setGroupedInventory(grouped)
  }

  const FormatMonth = (month) => {
    let months = {
      '': '',
      '00': '',
      '01': 'Jan',
      '02': 'Feb',
      '03': 'Mar',
      '04': 'Apr',
      '05': 'May',
      '06': 'Jun',
      '07': 'Jul',
      '08': 'Aug',
      '09': 'Sep',
      '10': 'Oct',
      '11': 'Nov',
      '12': 'Dec'
    }
    return months[month]
  }

  const MonthSort = (a, b) => {
    return parseInt(a) - parseInt(b)
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

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={[styles.defaultTabHeader, {backgroundColor: stylesheet.Secondary}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          underlayColor='#fff'>
          <Feather name="chevron-left" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.primary]}>{route.params.company} In-Depth</Text>
        <View style={styles.spacer}></View>
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
              <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 15, marginBottom: 10}]}>Delivery Analysis ({deliveries?.equation})</Text>
              <Text style={[styles.baseText, styles.marginWidth, styles.primary, styles.bold, {marginTop: 15, marginBottom: 15}]}>{deliveries?.description} ~ ${deliveries?.slope * 12}</Text>
              {
                deliveries &&
                <>

                <LineChart
                  data={{
                    labels: deliveries.months.map(month => FormatMonth(month)),
                    datasets: [
                      {
                        data: deliveries.sums,
                        color: () => stylesheet.Primary
                      }
                    ]
                  }}
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
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                  }}
                  style={{
                    padding: 0,
                    margin: 0,
                    marginTop: 2,
                    left: -20
                  }}
                />

                <BarChart
                  style={{
                    padding: 0,
                    margin: 0,
                    marginTop: 2,
                    left: -20
                  }}
                  data={{
                    labels: Object.keys(deliveries.deliveries).sort(MonthSort).map(month => FormatMonth(month)),
                    datasets: [
                      {
                        data: Object.keys(deliveries.deliveries).sort(MonthSort).map(month => deliveries.deliveries[month])
                      }
                    ]
                  }}
                  width={Dimensions.get("window").width * 0.98} // from react-native
                  height={220}
                  fromZero={true}
                  yAxisLabel=""
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                  }}
                  showBarTops={true}
                  showValuesOnTopOfBars={true}
                />
                </>
              }

              <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 50, marginBottom: 10}]}>Product Movement</Text>

              <Text style={[styles.baseText, styles.marginWidth, styles.primary, styles.bold, {marginTop: 15, marginBottom: 15}]}>Distribution of Most Recent Inventory</Text>
              <PieChart
                data={progressLog.labels.map(label => {
                  let key = line + "_" + label
                    return {
                      name: FormatProductName(key),
                      quantity: inventory[0][key],
                      color: `rgba(0, 163, 108, ${inventory[0][key] / inventory[0].totalCount})`,
                      legendFontColor: "#7F7F7F",
                      legendFontSize: 15
                    }
                  })}
                width={Dimensions.get("window").width * 0.98} // from react-native
                height={220}
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0, // optional, defaults to 2dp
                  color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                }}
                accessor={"quantity"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[0, 0]}
              />

              <Text style={[styles.baseText, styles.marginWidth, styles.primary, styles.bold, {marginTop: 15, marginBottom: 15}]}>Total Count</Text>
              <LineChart
                data={{
                  labels: groupedInventory.length > 0 ? groupedInventory.map(lin => lin.date).reverse() : inventory.map(lin => lin.date).reverse(),
                  datasets: [
                    {
                      data: groupedInventory.length > 0 ? groupedInventory.map(lin => lin.totalCount).reverse() : inventory.map(lin => lin.totalCount).reverse(),
                      color: () => stylesheet.Primary
                    }
                  ]
                }}
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
                  decimalPlaces: 0, // optional, defaults to 2dp
                  color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                }}
                bezier
                style={{
                  padding: 0,
                  margin: 0,
                  marginTop: 2,
                  left: -20
                }}
              />

              {
                lineProducts.map(product => {
                  let key = line + "_" + product

                  return (
                    <>
                      <Text style={[styles.baseText, styles.marginWidth, styles.bold, {marginTop: 15, marginBottom: 15, color: 'orange'}]}>{FormatProductName(key)}</Text>
                      <LineChart
                        data={{
                          labels: groupedInventory.length > 0 ? groupedInventory.map(lin => lin.date).reverse() : inventory.map(lin => lin.date).reverse(),
                          datasets: [
                            {
                              data: groupedInventory.length > 0 ? groupedInventory.map(lin => lin[key]).reverse() : inventory.map(lin => lin[key]).reverse(),
                              color: () => 'orange'
                            }
                          ]
                        }}
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
                          decimalPlaces: 0, // optional, defaults to 2dp
                          color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                        }}
                        bezier
                        style={{
                          padding: 0,
                          margin: 0,
                          marginTop: 2,
                          left: -20
                        }}
                      />
                    </>
                  )
                })
              }
            </View>
          </>
        }
      </ScrollView>
    </SafeAreaView>
  );
}
