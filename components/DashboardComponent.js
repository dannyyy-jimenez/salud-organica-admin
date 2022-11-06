import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Pressable, Dimensions, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather, Entypo, AntDesign } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import * as WebBrowser from 'expo-web-browser';
import {
  LineChart,
  ProgressChart
} from "react-native-chart-kit";
import Api from '../Api'
import moment from 'moment';
moment().format();
import { FormatProductNameLong } from './Globals'
import InvoiceModel from './Invoice.model'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();

export default function DashboardComponent({navigation}) {
  const animationRef = React.useRef(null)
  const [permissions, setPermissions] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [adminName, setAdminName] = React.useState(null);
  const [dailyQuote, setDailyQuote] = React.useState({
    quote: '',
    author: ''
  });
  const [websiteSales, setWebsiteSales] = React.useState(0)
  const [physicalSales, setPhysicalSales] = React.useState(0)
  const [distributors, setDistributors] = React.useState(0)
  const [spotifyAuth, setSpotifyAuth] = React.useState({
    uri: '',
    authenticated: false
  });

  const [campaigns, setCampaigns] = React.useState([])

  const [trends, setTrends] = React.useState({})
  const [trendChanges, setTrendChanges] = React.useState({})
  const [pendingOrders, setPendingOrders] = React.useState([])
  const [pendingDeliveries, setPendingDeliveries] = React.useState([])
  const [overdueInvoices, setOverdueInvoices] = React.useState([])
  const [distributorsNeedingAttention, setDistributorsNeedingAttention] = React.useState([])
  const [topups, setTopUps] = React.useState([])

  const load = async () => {
    setIsLoading(true)

    try {
      const res = await Api.get('/admin/home', {});

      if (res.isError) throw res;

      setAdminName(res.data._a.split(" ")[0])
      setDailyQuote(res.data._q)

      setDistributors(res.data._d.length)
      setDistributorsNeedingAttention(res.data._d.filter(d => d.status > 21))

      setWebsiteSales(res.data._o.map(o => parseInt(o.total)).reduce((total, next) => total + next, 0))
      setPendingOrders(res.data._o.filter(o => !o.fulfilled))

      setTopUps(res.data._t)
      setPhysicalSales(res.data._i.map(i => i.total).reduce((total, next) => total + next, 0))
      setPendingDeliveries(res.data._i.filter(i => !res.data._t.includes(i.identifier)))
      setOverdueInvoices(res.data._i.filter(i => !i.paid && res.data._t.includes(i.identifier) && moment().diff(moment(i.due, "MM/DD/YY")) >= 0))
      setPermissions(res.data._p)
      setTrends(res.data._trends)

      setSpotifyAuth(res.data._spotify)

      let trendChangesObj = {}
      if (res.data._trends.google && Object.keys(res.data._trends.google).length > 2) {
        let gTrendValues = Object.values(res.data._trends.google)
        let gTrendValuesSize = Object.values(res.data._trends.google).length
        trendChangesObj['google'] = parseInt(((gTrendValues[gTrendValuesSize - 1] / gTrendValues[gTrendValuesSize - 2]) - 1) * 100)
      }

      if (res.data._trends.visits) {
        let sites = Object.keys(res.data._trends.visits);
        trendChangesObj['visits'] = {}

        for (let site of sites) {
          if (Object.keys(res.data._trends.visits[site]).length > 2) {
            let vTrendValues = Object.values(res.data._trends.visits[site])
            let vTrendValuesSize = Object.values(res.data._trends.visits[site]).length
            trendChangesObj['visits'][site] = parseInt(((vTrendValues[vTrendValuesSize - 1] / vTrendValues[vTrendValuesSize - 2]) - 1) * 100)
          }
        }
      }

      setTrendChanges(trendChangesObj)

      if (res.data._spotify.authenticated) {
        await loadSpotifyCampaigns()
      }

      setIsLoading(false)
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onAuthSpotify = async () => {
    await WebBrowser.openAuthSessionAsync(spotifyAuth.uri);

    //loadSpotifyCampaigns()
  }

  const loadSpotifyCampaigns =  async () => {
    try {
      const res = await Api.get('/admin/campaigns/spotify', {});

      if (res.isError) throw res;

      setSpotifyAuth(res.data.spotify)
    } catch (e) {
      setSpotifyAuth({
        ...spotifyAuth,
        authenticated: false
      })
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.defaultTabContainer}>
        <View style={styles.defaultTabHeader}>
          <View style={styles.spacer}></View>
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Hi, {adminName || 'Admin'}!</Text>
          <View style={styles.spacer}></View>
        </View>
        <View style={[styles.defaultColumnContainer, styles.center, {height: '100%', width: '100%'}]}>
          <LottieView
              ref={animationRef}
              style={{
                width: '60%',
                backgroundColor: '#fff',
              }}
              loop
              autoPlay
              source={require('../assets/loading-leaf.json')}
              // OR find more Lottie files @ https://lottiefiles.com/featured
              // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
            />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Hi, {adminName || 'Admin'}!</Text>
        <View style={styles.spacer}></View>
      </View>
      <ScrollView style={[styles.defaultTabScrollContent]} contentContainerStyle={{alignItems: 'center', justifyContent: 'center', width: '90%', marginLeft: '5%', paddingBottom: 100}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        <View style={[styles.defaultRowContainer, styles.fullWidth, styles.justifyCenter, {marginTop: 20, height: 'auto'}]}>
          <View style={[styles.analyticCardF, styles.elevated, styles.center, styles.centerText, {height: 'auto', paddingBottom: 60, paddingTop: 30, backgroundColor: '#F9F9F9'}]}>
            <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.tertiary]}>"{dailyQuote.quote}"</Text>
            <Text style={[styles.baseText, styles.opaque, styles.bold, styles.paddedWidth, styles.tertiary, {position: 'absolute', bottom: 20}]}>- {dailyQuote.author}</Text>
          </View>
        </View>

        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.fullWidth, styles.justifyCenter, {marginTop: 20, marginBottom: 20, height: 'auto'}]} contentContainerStyle={{flexGrow: 1}}>
          {
            permissions.includes("STATS") &&
            <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#20AF7E'}]}>
              <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>YTD Website Sales</Text>

              <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${websiteSales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
              </View>

              <TouchableOpacity onPress={() => {navigation.navigate('Orders')}} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#40BA91"}]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
              </TouchableOpacity>
            </View>
          }
          {
            permissions.includes("STATS") &&
            <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#40BA91'}]}>
              <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>YTD Physical Sales</Text>

              <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${physicalSales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
              </View>

              <TouchableOpacity onPress={() => {navigation.navigate('Orders')}} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#60C6A3"}]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
              </TouchableOpacity>
            </View>
          }
          {
            <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#60C6A3'}]}>
              <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Retail Distributors</Text>

              <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>{distributors}</Text>
              </View>

              <TouchableOpacity onPress={() => {navigation.navigate('Orders')}} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#80D1B5"}]}>
                <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
              </TouchableOpacity>
            </View>
          }
        </ScrollView>

        {
          pendingOrders.length > 0 &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Pending Online Orders ({pendingOrders.length})</Text>
            <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[{marginTop: 0, marginBottom: 50, flex: 1, height: 'auto'}]}>
              {
                pendingOrders.map((order) => {
                  return (
                    <TouchableOpacity activeOpacity={order.fulfilled ? 0.3 : 1} key={order.identifier} onPress={() => navigation.navigate("OrderView", {identifier: order.identifier})} style={[styles.fullStoreCard, order.fulfilled ? styles.disabled : {}, styles.elevated]}>
                      <View style={[styles.fullSCImage, styles.flexible, styles.center, {height: 230}]}>
                        <Image style={styles.fullSCImage} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto/${order.products[0]?.product.shots[0]}`}} />
                      </View>
                      <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                        <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                          <View style={[styles.defaultColumnContainer]}>
                            <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.tertiary, {marginBottom: 2}]}>{order.buyer.fullname}</Text>
                          </View>
                          <View style={styles.spacer}></View>
                          <View style={[styles.defaultColumnContainer]}>
                            <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>{order.products.length} {(order.products.map(p => p.quantity)).reduce((total, next) => total + next, 0) > 1 ? 'Products' : 'Product'} - ${order.total}</Text>
                          </View>
                        </View>
                        <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                          <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.address.line1}</Text>
                          <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.address.line2}</Text>
                        </View>
                        <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                          <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{order.date}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })
              }
            </ScrollView>
          </>
        }
        {
          pendingDeliveries.length > 0 &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Pending Deliveries ({pendingDeliveries.length})</Text>
            <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[{marginTop: 0, marginBottom: 50, flex: 1, height: 'auto'}]}>
              {
                pendingDeliveries.map(invoice => {
                  return (
                    <InvoiceModel topups={topups} data={invoice} />
                  )
                })
              }
            </ScrollView>
          </>
        }
        {
          overdueInvoices.length > 0 &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Overdue Invoices ({overdueInvoices.length})</Text>
            <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.fullWidth, {marginTop: 0, marginBottom: 50, width: 'auto', height: 'auto'}]}>
              {
                overdueInvoices.map(invoice => {
                  return (
                    <InvoiceModel topups={topups} data={invoice} />
                  )
                })
              }
            </ScrollView>
          </>
        }
        {
          distributorsNeedingAttention.length > 0 &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Distributors Needing Attention ({distributorsNeedingAttention.length})</Text>
            <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.fullWidth, {marginTop: 0, marginBottom: 50, width: 'auto', height: 'auto'}]}>
              {
                distributorsNeedingAttention.map((distributor, idx) => {
                  return (
                    <>
                      <TouchableOpacity activeOpacity={distributor.fulfilled ? 0.3 : 1} key={distributor.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: distributor.identifier, company: distributor.company})} style={[styles.fullStoreCard, styles.elevated]}>
                        <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {backgroundColor: "#FCFCFC"}]}>
                          <Text style={[styles.tinyText, styles.bold, {opacity: 0.5}, styles.center]}>{distributor.address}</Text>
                          <Text numberOfLines={1} style={[styles.subHeaderText, styles.nunitoText, styles.tertiary, {marginTop: 20, marginBottom: 20}]}>{distributor.company}</Text>
                        </View>
                        <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: "#FF3131"}}>
                          <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>Last Visited {moment().subtract(distributor.status, 'd').format("MM/DD")}</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )
                })
              }
            </ScrollView>
          </>
        }

        {/* {
          (campaigns.length > 0 || !spotifyAuth.authenticated) &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Active Campaigns</Text>
            {
              !spotifyAuth.authenticated &&
              <Pressable onPress={() => onAuthSpotify()} style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAFAFA'}, styles.center]}>
                <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.fullWidth, styles.tertiary]}>
                  <Entypo name="spotify" size={64} color="black" />
                </Text>
                <Text style={[styles.subHeaderText, styles.bold, styles.fullWidth, styles.centerText, styles.tertiary, {marginTop: 5, marginBottom: 5}]}>Spotify Campaigns</Text>
                <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, styles.centerText, {marginTop: 5, marginBottom: 5}]}>Tap to Authenticate</Text>
              </Pressable>
            }
          </>
        } */}

        {
          Object.keys(trends).length > 0 &&
          <>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary]}>Online Presence</Text>
            <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.fullWidth, {marginTop: 0, marginBottom: 50, width: 'auto', height: 'auto'}]}>
              {
                trends?.google && Object.keys(trends.google).length > 2 &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAFAFA'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, {position: 'absolute', right: 10, top: 10}, trendChanges.google > 0 ? styles.primary : {color: '#FF3131'}]}>{trendChanges.google}%</Text>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>Google Search Trends</Text>
                  <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>La Herencia del Abuelo</Text>

                  <LineChart
                    data={{
                      labels: Object.keys(trends.google),
                      datasets: [
                        {
                          data: Object.values(trends.google)
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width * 0.94 > 600 ? 600 : Dimensions.get("window").width * 0.94} // from react-native
                    height={170}
                    yAxisLabel=""
                    yAxisSuffix=""
                    yAxisInterval={1} // optional, defaults to 1
                    withShadow={false}
                    withInnerLines={false}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={false}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      backgroundGradientFromOpacity: 0,
                      backgroundGradientToOpacity: 0,
                      fillShadowGradientFromOpacity: 0,
                      fillShadowGradientToOpacity: 1,
                      propsForBackgroundLines: [{
                        fillOpacity: 1,
                      }],
                      decimalPlaces: 0, // optional, defaults to 2dp
                      color: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`
                    }}
                    formatYLabel={(c) => {
                      return parseFloat(c).toLocaleString()
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: -40
                    }}
                  />
                </View>
              }

              {
                trends?.visits && Object.keys(trends.visits).map((site) => {
                  if (Object.keys(trends.visits[site]).length > 2) {
                    return (
                      <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAFAFA'}]}>
                        {
                          trendChanges.visits && trendChanges.visits[site] &&
                          <Text style={[styles.subHeaderText, styles.bold, {position: 'absolute', right: 10, top: 10}, trendChanges?.visits[site] > 0 ? styles.primary : {color: '#FF3131'}]}>{trendChanges?.visits[site] > 0 ? "+" : ""}{trendChanges?.visits[site]}%</Text>
                        }
                        <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>Website Visits Trend</Text>
                        <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{site}</Text>

                        <LineChart
                          data={{
                            labels: Object.keys(trends.visits[site]),
                            datasets: [
                              {
                                data: Object.values(trends.visits[site])
                              }
                            ]
                          }}
                          width={Dimensions.get("window").width * 0.94 > 600 ? 600 : Dimensions.get("window").width * 0.94} // from react-native
                          height={170}
                          yAxisLabel=""
                          yAxisSuffix=""
                          yAxisInterval={1} // optional, defaults to 1
                          withShadow={false}
                          withInnerLines={false}
                          withOuterLines={true}
                          withVerticalLines={false}
                          withHorizontalLines={false}
                          withHorizontalLabels={false}
                          chartConfig={{
                            backgroundGradientFrom: "#fff",
                            backgroundGradientTo: "#fff",
                            backgroundGradientFromOpacity: 0,
                            backgroundGradientToOpacity: 0,
                            fillShadowGradientFromOpacity: 0,
                            fillShadowGradientToOpacity: 1,
                            propsForBackgroundLines: [{
                              fillOpacity: 1,
                            }],
                            decimalPlaces: 0, // optional, defaults to 2dp
                            color: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`
                          }}
                          formatYLabel={(c) => {
                            return parseFloat(c).toLocaleString()
                          }}
                          bezier
                          style={{
                            padding: 0,
                            margin: 0,
                            marginTop: 10,
                            left: -40
                          }}
                        />
                      </View>
                    )
                  }
                })
              }
            </ScrollView>
          </>
        }
      </ScrollView>
    </SafeAreaView>
  );
}
