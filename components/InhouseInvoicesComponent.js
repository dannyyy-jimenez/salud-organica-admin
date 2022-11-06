import * as React from 'react';
import { Linking, Platform, ScrollView, Dimensions, Switch, Pressable, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import API from '../Api'
import {Picker} from '@react-native-picker/picker';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import {Buffer} from "buffer";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { BarCodeScanner } from 'expo-barcode-scanner';
import moment from 'moment';
moment().format();
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import {
  LineChart,
  ProgressChart
} from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormatProductNameLong, FormatIdentifier } from './Globals'
import InvoiceModel from './Invoice.model'
import {SheetManager} from 'react-native-actions-sheet';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const productLotSearchActionSheetRef = React.createRef();
const quickbooksAuthenticateActionSheetRef = React.createRef();

export default function InvoicesComponent({navigation, route}) {
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [defaultInvoices, setDefaultInvoices] = React.useState([])
  const [invoices, setInvoices] = React.useState([])
  const [topups, setTopUps] = React.useState([])
  const [search, setSearch] = React.useState("")

  // invoice creating
  const [authenticatedQuickbooks, setAuthenticatedQuickbooks] = React.useState(false)

  const [invoicePaymentIsCash, setInvoicePaymentIsCash] = React.useState(false)
  const [invoicePaymentAmount, setInvoicePaymentAmount] = React.useState('')
  const [invoicePaymentMemo, setInvoicePaymentMemo] = React.useState('')
  const [invoicePaymentRef, setInvoicePaymentRef] = React.useState('')

  const [productSearchIden, setProductSearchIden] = React.useState('')
  const [productSearchLot, setProductSearchLot] = React.useState('')

  // stats

  const goals = [4000, 16000, 192000]
  const [dailySales, setDailySales] = React.useState(0);
  const [weeklySales, setWeelySales] = React.useState(0);
  const [monthlySales, setMonthySales] = React.useState(0);

  const [overdue, setOverdue] = React.useState([])
  const [pending, setPending] = React.useState([])
  const [paid, setPaid] = React.useState([])

  const [invoicesProgress, setInvoicesProgress] = React.useState({
    labels: [],
    data: []
  })

  const load = async (scopify = null) => {
    setIsLoading(true)
    setInvoices([])
    setDefaultInvoices([])

    try {
      const res = await API.get('/admin/invoices', {});

      if (res.isError) throw 'error';

      setInvoices(res.data.invoices);
      setDefaultInvoices(res.data.invoices)

      setTopUps(res.data.topups)
      AnalyzeInvoices(res.data.invoices)

      let prevSearch = search;

      setAuthenticatedQuickbooks(res.data.quickbooksAuthSetup)
      if (!res.data.quickbooksAuthSetup) {
        quickbooksAuthenticateActionSheetRef.current?.setModalVisible(true)
      }
      setSearch('')
      setSearch(prevSearch)
      setIsLoading(false);

      if (scopify) {
        let scopified = res.data.invoices.find(i => i.identifier == scopify)

        SheetManager.show('Invoice-Sheet', {
          payload: {
            invoice: scopified,
            delivered: false,
            created: true
          }
        })
      }
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const AnalyzeInvoices = (data) => {
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    let daysFormat = {
      "-1": "Sun",
      "0": "Mon",
      "1": "Tue",
      "2": "Wed",
      "3": "Thu",
      "4": "Fri",
      "5": "Sat"
    }
    let days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    let weeks = [1, 2, 3, 4, 5]
    let today = moment()
    let weekOfMonth = (today.week() - ((today.month() + 1) * 4))
    let weeklyLabels = weeks.slice(0, weekOfMonth)
    let dailyLabels = days.slice(0, today.day())
    let monthlyLabels = months.slice(0, today.month() + 1)
    let weekly = Array(weeklyLabels.length).fill(0)
    let daily = Array(dailyLabels.length).fill(0)
    let monthly = Array(monthlyLabels.length).fill(0)
    let overdue = []
    let pending = []
    let paid = []

    for (let invoice of data.slice().reverse()) {

      if (moment(invoice.created).isSame(today, 'week')) {
        daily[dailyLabels.indexOf(daysFormat[moment(invoice.created).day() - 1])] += invoice.total
      }


      if (moment(invoice.created).isSame(today, 'month')) {
        let invoiceWeekOfMonth = moment(invoice.created).week() - ((today.month() + 1) * 4)
        weekly[invoiceWeekOfMonth - 1] += invoice.total
      }

      if (moment(invoice.created).isSame(today, 'year')) {
        monthly[moment(invoice.created).month()] += invoice.total
      }

      if (invoice.paid) {
        paid.push(invoice.total)
      }

      if (!invoice.paid && moment().diff(moment(invoice.due, 'MM/DD/YY')) >= 0) {
        overdue.push(invoice.total)
      }

      if (!invoice.paid && moment().diff(moment(invoice.due, 'MM/DD/YY')) < 0) {
        pending.push(invoice.total)
      }

    }
    setDailySales(daily.reduce((total, next) => total += next, 0))
    setWeelySales(weekly.reduce((total, next) => total += next, 0))
    setMonthySales(monthly.reduce((total, next) => total += next, 0))

    setInvoicesProgress({
      "labels": {
        daily: dailyLabels,
        weekly: weeklyLabels,
        monthly: monthlyLabels
      },
      "data": {
        daily: daily,
        weekly: weekly,
        monthly: monthly
      }
    })

    setPending(pending)
    setOverdue(overdue)
    setPaid(paid)
  }

  React.useEffect(() => {
    (async () => {
      await BarCodeScanner.requestPermissionsAsync();
    })();
    load()
  }, []);

  const InvoiceFilter = (invoice) => {
    if (invoice.identifier === search.trim()) {
      return true;
    }

    if (invoice.total.toFixed(2).includes(search)) {
      return true;
    }

    if (invoice.distributor.company.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, "").includes(search.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, ""))) {
      return true;
    }

    return false;
  }

  React.useEffect(() => {
    if (search === "") {
      setInvoices(defaultInvoices)
      return;
    }
    if (search.includes("LOT*")) {
      let parts = search.split("*")
      let lot = parts[2]
      let iden = parts[1]
      let productLotNIden = `${FormatIdentifier(iden)}*${lot}`

      setInvoices(defaultInvoices.filter(invoice => {
        let productLotNIdens = invoice.line.map(p => `${p.product.identifier}*${p.lot}`)

        return productLotNIdens.includes(productLotNIden)
      }))
      return;
    }
    if (search === "OVRD") {
      setInvoices(defaultInvoices.filter(invoice => !invoice.paid && moment().diff(moment(invoice.due, 'MM/DD/YY')) >= 0))
      return;
    }
    if (search === "PNDNG") {
      setInvoices(defaultInvoices.filter(invoice => !invoice.paid && moment().diff(moment(invoice.due, 'MM/DD/YY')) < 0))
      return;
    }
    if (search === "PAID") {
      setInvoices(defaultInvoices.filter(invoice => invoice.paid))
      return;
    }
    setInvoices(defaultInvoices.filter(invoice => InvoiceFilter(invoice)))
  }, [search])

  const onCreateIntent = async () => {
    let scopified = await SheetManager.show('New-Invoice-Sheet')

    if (scopified) {
      load(scopified)
    }
  }

  // edit invoice

  const onProductLotScan = (data) => {
    if (data.includes("*")) {
      let lot = data.split("*")[1]
      let iden = data.split("*")[0]

      setProductSearchLot(lot)
      setProductSearchIden(iden)
      productLotSearchActionSheetRef.current?.setModalVisible(false);
    } else {
      // is sku
      // let prod = products.find(p => "0"+ p.sku.toString() === data)
      // if (prod) {
      //   setProductSearchIden(prod.identifier)
      // }
    }
  }

  const QuickbooksAuthSetup = async () => {
    try {
      const res = await API.get('/admin/auth/quickbooks', {});

      if (res.isError) throw 'error';

      let result = await WebBrowser.openAuthSessionAsync(res.data.authUri);
      VerifyQuickbooksAuth();
    } catch (e) {
      console.log(e)
    }
  }

  const VerifyQuickbooksAuth = async () => {
    try {
      const res = await API.get('/admin/auth/quickbooks/verify', {});

      if (res.isError || !res.data.valid) throw 'error';

      setAuthenticatedQuickbooks(true)
    } catch (e) {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (productSearchLot !== "" && productSearchIden !== "") {
      setSearch(`LOT*${productSearchIden}*${productSearchLot}`)
    }
  }, [productSearchLot, productSearchIden])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        {/* <TouchableOpacity
          onPress={() => navigation.navigate('InboxSlips')}
          underlayColor='#fff'>
          <Feather name="file-text" size={24} color={stylesheet.Primary} />
        </TouchableOpacity> */}
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Invoices {invoices.length > 0 ? `(${invoices.length})` : ''}</Text>
        <View style={styles.spacer}></View>
        {
          !isLoading &&
          <>
            <TouchableOpacity
              onPress={() => productLotSearchActionSheetRef.current?.setModalVisible(true)}
              underlayColor='#fff'
              style={{marginLeft: 10}}>
              <Feather name="search" size={24} color={stylesheet.Primary} />
            </TouchableOpacity>
          </>
        }
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'center', justifyContent: 'flex-start', width: '100%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={"white"} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
              }}
              autoPlay
              loop
              source={require('../assets/loading-invoices.json')}
              // OR find more Lottie files @ https://lottiefiles.com/featured
              // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
            />
        }

        {
          !isLoading &&
          <>
            <TextInput
              style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
              placeholderTextColor="#888"
              placeholder="Search"
              numberOfLines={1}
              value={search}
              onChangeText={(text) => setSearch(text)}
            />

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.marginWidth, styles.justifyCenter, {marginTop: 20, marginBottom: 20, height: 'auto'}]} contentContainerStyle={{flexGrow: 1}}>
              {
                overdue.length > 0 &&
                <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#FF3131'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Overdue ({overdue.length})</Text>

                  <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${overdue.reduce((total, next) => total + next, 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  </View>

                  <TouchableOpacity onPress={() => setSearch('OVRD')} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#FF6565"}]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
                  </TouchableOpacity>
                </View>
              }

              {
                pending.length > 0 &&
                <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#FF6347'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Pending ({pending.length})</Text>

                  <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${pending.reduce((total, next) => total + next, 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  </View>

                  <TouchableOpacity onPress={() => setSearch('PNDNG')} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#FFA07A"}]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
                  </TouchableOpacity>
                </View>
              }

              {
                paid.length > 0 &&
                <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#20AF7E'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Paid ({paid.length})</Text>

                  <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${paid.reduce((total, next) => total + next, 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  </View>

                  <TouchableOpacity onPress={() => setSearch('PAID')} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#40BA91"}]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
                  </TouchableOpacity>
                </View>
              }
            </ScrollView>

            <ScrollView decelerationRate={0} snapToInterval={Dimensions.get("window").width * 0.94} snapToAlignment={"center"} horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.insetWidth, styles.justifyCenter, {marginTop: 20, marginBottom: 20, height: 'auto'}]} contentContainerStyle={{flexGrow: 1}}>

              {
                invoicesProgress.labels.daily && !invoicesProgress.data.daily.every(item => item === 0) &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>This Week's Progress - ${dailySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  {
                    dailySales >= goals[0] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[0].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Weekly Goal Completed 🥳</Text>
                  }
                  {
                    dailySales < goals[0] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((dailySales / goals[0]) * 100).toFixed(2)}% of the ${goals[0].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} goal</Text>
                  }
                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.daily,
                      datasets: [
                        {
                          data: invoicesProgress.data.daily
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
                      color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                    }}
                    formatYLabel={(c) => {
                      return "$" + c.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: 5
                    }}
                  />
                </View>
              }

              {
                invoicesProgress.labels.weekly && invoicesProgress.labels.weekly.length > 1 && !invoicesProgress.data.weekly.every(item => item === 0) &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>This Month's Progress - ${weeklySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  {
                    weeklySales >= goals[1] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[1].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Monthly Goal Completed 🥳</Text>
                  }
                  {
                    weeklySales < goals[1] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((weeklySales / goals[1]) * 100).toFixed(2)}% of the ${goals[1].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} goal</Text>
                  }
                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.weekly,
                      datasets: [
                        {
                          data: invoicesProgress.data.weekly
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
                      color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                    }}
                    formatYLabel={(c) => {
                      return "$" + c.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: 5
                    }}
                  />
                </View>
              }

              {
                invoicesProgress.labels.monthly && invoicesProgress.labels.monthly.length > 1 && !invoicesProgress.data.monthly.every(item => item === 0) &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>This Year's Progress - ${monthlySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  {
                    monthlySales >= goals[2] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Yearly Goal Completed 🥳</Text>
                  }
                  {
                    monthlySales < goals[2] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((monthlySales / goals[2]) * 100).toFixed(2)}% of the ${goals[2].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} goal</Text>
                  }
                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.monthly,
                      datasets: [
                        {
                          data: invoicesProgress.data.monthly
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width * (0.94 - (0.01 * invoicesProgress.labels.monthly.length)) } // from react-native
                    height={170}
                    yAxisLabel=""
                    yAxisSuffix=""
                    yAxisInterval={1} // optional, defaults to 1
                    withShadow={false}
                    withInnerLines={false}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={false}
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
                      color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`
                    }}
                    formatYLabel={(c) => {
                      return "$" + c.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: 0
                    }}
                  />
                </View>
              }
            </ScrollView>
          </>
        }

        {
          !isLoading && invoices.map((invoice) => {
            return (
              <InvoiceModel key={invoice.identifier} topups={topups} data={invoice} />
            )
          })
        }
      </ScrollView>
      <TouchableOpacity onPress={() => authenticatedQuickbooks ? onCreateIntent() : quickbooksAuthenticateActionSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
        <Feather name="plus" size={32} color={stylesheet.SecondaryTint} />
      </TouchableOpacity>

      <ActionSheet onClose={() => {setProductSearchLot(''); setProductSearchIden('')}} containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={productLotSearchActionSheetRef}>
        <View style={{paddingBottom: 40}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Find Invoice By Product ID & Lot Number</Text>
            <View style={styles.spacer}></View>
          </View>
          <View style={styles.line}></View>
          {
            productSearchLot == "" && productSearchIden == "" &&
            <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
              <Text style={[styles.baseText, styles.bold, styles.opaque, styles.centerText, styles.tertiary, {marginTop: 10}]}>Scan the QR code on the packaging box or the barcode on the product</Text>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 20}]}>
                <AntDesign name="qrcode" size={72} style={{marginLeft: 10, marginRight: 10}} color={stylesheet.Primary} />
                <AntDesign name="barcode" size={72} style={{marginLeft: 10, marginRight: 10}} color={stylesheet.Primary} />
              </View>
              <BarCodeScanner onBarCodeScanned={({type, data}) => {onProductLotScan(data)}} style={{position: 'relative', marginTop: 30, marginiBottom: 10, height: 300, width: '100%'}}/>
            </View>
          }
          {
            !productSearchIden == "" &&
            <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
              <TextInput
                placeholderTextColor="#888"
                style={[{marginTop: 50,  marginBottom: 50, width: '100%'}, styles.baseInput, {fontSize: 40}]}
                placeholder="Enter Lot #"
                keyboardType="numeric"
                value={productSearchLot}
                onChangeText={(text) => setProductSearchLot(text.toString())}
              />
            </View>
          }
        </View>
      </ActionSheet>

      <ActionSheet containerStyle={{backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={quickbooksAuthenticateActionSheetRef}>
        {
          authenticatedQuickbooks &&
          <View style={{paddingTop: 10, paddingBottom: 30}}>
            <LottieView
                ref={animationRef}
                style={{
                  width: '100%',
                  backgroundColor: '#fff',
                }}
                autoPlay
                loop
                source={require('../assets/33886-check-okey-done.json')}
                // OR find more Lottie files @ https://lottiefiles.com/featured
                // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
              />
          </View>
        }
        {
          !authenticatedQuickbooks &&
          <View style={{paddingTop: 10, paddingBottom: 30}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 10}]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Quickbooks Authentication Setup Needed</Text>
              <View style={styles.spacer}></View>
            </View>

            <Text style={[styles.baseText, styles.marginWidth, styles.tertiary]}>In order to create invoices you must first link your Quickbooks account</Text>

            <TouchableOpacity onPress={() => QuickbooksAuthSetup()} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 30}]}>
              <Text style={[styles.secondary, styles.bold]}>Setup</Text>
            </TouchableOpacity>
          </View>
        }
      </ActionSheet>
    </SafeAreaView>
  );
}
