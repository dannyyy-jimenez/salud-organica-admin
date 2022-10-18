import * as React from 'react';
import { Linking, Platform, ScrollView, Dimensions, Switch, Pressable, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import API from '../Api'
import * as Location from 'expo-location';
import haversine from 'haversine-distance'
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
import * as Network from 'expo-network';
import {
  LineChart,
  ProgressChart
} from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormatProductNameLong } from './Globals'
import InvoiceModel from './Invoice.model'
import {SheetManager} from 'react-native-actions-sheet';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const invoiceActionSheetRef = React.createRef();
const productLotSearchActionSheetRef = React.createRef();
const quickbooksAuthenticateActionSheetRef = React.createRef();

class Distributor {
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
      lat: this.location.latitude,
      lng: this.location.longitude
    }

    return haversine(coords, user) / 3961 // returns distance in km
  }

}

export default function InvoicesComponent({navigation, route}) {
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [defaultInvoices, setDefaultInvoices] = React.useState([])
  const [invoices, setInvoices] = React.useState([])
  const [distributors, setDistributors] = React.useState([])
  const [distributorSearch, setDistributorSearch] = React.useState('')
  const [products, setProducts] = React.useState([])
  const [topups, setTopUps] = React.useState([])
  const [location, setLocation] = React.useState(null);
  const [onWiFi, setOnWiFi] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // invoice creating
  const [authenticatedQuickbooks, setAuthenticatedQuickbooks] = React.useState(false)

  const [invoiceOwnerIdentifier, setInvoiceOwnerIdentifier] = React.useState('')
  const [invoiceLine, setInvoiceLine] = React.useState([])
  const [invoiceLineItemRefIdentifier, setInvoiceLineItemRefIdentifier] = React.useState('')
  const [invoiceLineItemRefQty, setInvoiceLineItemRefQty] = React.useState('')
  const [invoiceLineItemRefCost, setInvoiceLineItemRefCost] = React.useState('')
  const [invoiceLineItemRefLot, setInvoiceLineItemRefLot] = React.useState('')
  const [invoiceLineItemRefAmount, setInvoiceLineItemRefAmount] = React.useState('')

  const [invoicePaymentIsCash, setInvoicePaymentIsCash] = React.useState(false)
  const [invoicePaymentAmount, setInvoicePaymentAmount] = React.useState('')
  const [invoicePaymentMemo, setInvoicePaymentMemo] = React.useState('')
  const [invoicePaymentRef, setInvoicePaymentRef] = React.useState('')
  const [invoiceRec, setInvoiceRec] = React.useState({})

  const [productSearchIden, setProductSearchIden] = React.useState('')
  const [productSearchLot, setProductSearchLot] = React.useState('')

  const [invoiceAddMode, setInvoiceAddMode] = React.useState(false)
  const [invoiceAddScanMode, setInvoiceAddScanMode] = React.useState(false)
  const [invoiceAddSearchMode, setInvoiceAddSearchMode] = React.useState(false)
  const [promptInvoiceForNearestDist, setPromptInvoiceForNearestDist] = React.useState(false)
  const [recentBatchNumber, setRecentBatchNumber] = React.useState('')

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

  const load = async (loc = null, scopify = null) => {
    setIsLoading(true)
    setInvoices([])
    setDefaultInvoices([])

    try {
      const res = await API.get('/admin/distributors/invoices', {});

      if (res.isError) throw 'error';

      let dists = res.data.distributors.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, loc ? loc.coords : location.coords)).sort((a, b) => {
        let letterA = a.route.split("")[0]
        let letterB = b.route.split("")[0]

        if (letterA  === letterB) {
          if (parseInt(a.route.slice(1)) > parseInt(b.route.slice(1))) return 1
          if (parseInt(a.route.slice(1)) < parseInt(b.route.slice(1))) return -1

          return 0
        } else  {
          if (letterA > letterB) return 1
          if (letterA  < letterB) return -1

          return 0
        }
        return 0
      })

      setInvoices(res.data.invoices);
      setDefaultInvoices(res.data.invoices)
      setDistributors(dists);
      if (dists[0].distance < 1) {
        setPromptInvoiceForNearestDist(true)
      }
      setProducts(res.data.products);

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
        return res.data.invoices.find(i => i.identifier == scopify)
      }
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const loadInvoiceRec = async () => {
    try {
      const res = await API.get('/admin/distributors/recommendation', {identifier: invoiceOwnerIdentifier});

      if (res.isError) throw 'error';

      setInvoiceRec(res.data._rec)
    } catch (e) {
      console.log(e)
      setInvoiceRec({})
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
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      Location.watchPositionAsync({distanceInterval: 1600}, (location) => {
        setLocation(location);

        let dists = distributors.slice().map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, location.coords)).sort((a, b) => {
          let letterA = a.route.split("")[0]
          let letterB = b.route.split("")[0]

          if (letterA  === letterB) {
            if (parseInt(a.route.slice(1)) > parseInt(b.route.slice(1))) return 1
            if (parseInt(a.route.slice(1)) < parseInt(b.route.slice(1))) return -1

            return 0
          } else  {
            if (letterA > letterB) return 1
            if (letterA  < letterB) return -1

            return 0
          }
          return 0
        })

        if (dists.length > 0) {
          if (dists[0].distance < 0.16) {
            setPromptInvoiceForNearestDist(true)
          }
        }
      });
    })();

    (async () => {
      let networkState = await Network.getNetworkStateAsync();
      if (networkState.type === 'WIFI') {
        setOnWiFi(true)
      }
    })();
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

  const getRecentBatch = async (identifier) => {
    try {
      const recent = await AsyncStorage.getItem(`LOT_NUM_${identifier}`)
      if (recent !== null) {
        return recent;
      }
      return ''
    } catch (e) {
      return ''
    }
  }

  React.useEffect(() => {
    if (invoiceLineItemRefIdentifier == "" || invoiceLineItemRefCost !== "") return;

    setInvoiceLineItemRefCost(products.find(p => p.identifier === invoiceLineItemRefIdentifier).distributorPrice.toFixed(2))
    setInvoiceLineItemRefAmount(products.find(p => p.identifier === invoiceLineItemRefIdentifier).distributorPrice * parseInt(invoiceLineItemRefQty))
    getRecentBatch(invoiceLineItemRefIdentifier).then(lot => {
      setRecentBatchNumber(lot)
    })

  }, [invoiceLineItemRefIdentifier])

  const FormatIdentifier = (identifier) => {
    if (identifier == 'topical_cream') return 'cream'

    return identifier;
  }

  const onProductContainerScan = (data) => {
    let parts = data.split('*');

    if (parts.length < 2) return;

    let productIden = FormatIdentifier(parts[0]);
    let lotNum = parts[1];
    let scannedProduct = products.find(p => p.identifier === productIden)
    if  (scannedProduct) {
        setInvoiceLineItemRefIdentifier(scannedProduct.identifier)
        setInvoiceLineItemRefLot(lotNum)
        setInvoiceAddScanMode(false)
    }
  }

  const onAddLineItem = async () => {
    setInvoiceLine([...invoiceLine, {
      identifier: invoiceLineItemRefIdentifier,
      quantity: invoiceLineItemRefQty,
      cost: invoiceLineItemRefCost,
      lot: invoiceLineItemRefLot,
      amount: invoiceLineItemRefAmount
    }])

    await AsyncStorage.setItem(`LOT_NUM_${invoiceLineItemRefIdentifier}`, invoiceLineItemRefLot)

    setInvoiceAddMode(false)
    setInvoiceLineItemRefIdentifier('')
    setInvoiceLineItemRefQty('')
    setInvoiceLineItemRefCost('')
    setInvoiceLineItemRefLot('')
    setInvoiceLineItemRefAmount('')
  }

  const onCreateInvoice = async () => {
    invoiceActionSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      const res = await API.post('/admin/distributor/invoice', {ownerIdentifier: invoiceOwnerIdentifier, line: invoiceLine});

      if (res.isError) throw 'error';

      let scopified = await load(false, res.data._identifier);

      SheetManager.show('Invoice-Sheet', {
        payload: {
          invoice: scopified,
          delivered: false,
          created: true
        }
      })
      setInvoiceLine([])
      setInvoiceOwnerIdentifier("")
    } catch (e) {
      console.log(e)
      setIsLoading(false)
      invoiceActionSheetRef.current?.setModalVisible(true)
    }
  }

  // edit invoice

  const onInvoiceLineRemove = async (idx) => {
    let copied = invoiceLine.slice();
    copied.splice(idx, 1)
    setInvoiceLine(copied)
  }

  const onProductLotScan = (data) => {
    if (data.includes("*")) {
      let lot = data.split("*")[1]
      let iden = data.split("*")[0]

      setProductSearchLot(lot)
      setProductSearchIden(iden)
      productLotSearchActionSheetRef.current?.setModalVisible(false);
    } else {
      // is sku
      let prod = products.find(p => "0"+ p.sku.toString() === data)
      if (prod) {
        setProductSearchIden(prod.identifier)
      }
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

  React.useEffect(() => {
    if (invoiceOwnerIdentifier == "") return;

    loadInvoiceRec()
  }, [invoiceOwnerIdentifier])

  React.useEffect(() => {
    if (!location) return;
    if (distributors.length > 0) return;

    load()
  }, [location])

  React.useEffect(() => {
    if (route.params && route.params.invoiceOwnerIdentifier && typeof route.params.invoiceOwnerIdentifier == "string" && route.params.invoiceOwnerIdentifier !== "") {
      (async () => {
        if (!distributors.find(d => d.identifier === invoiceOwnerIdentifier)) {
          await load()
        }
        setInvoiceOwnerIdentifier(route.params.invoiceOwnerIdentifier)
        setTimeout(() => {
          invoiceActionSheetRef.current?.setModalVisible(true)
        }, 500)
      })()
    } else {
      setInvoiceOwnerIdentifier("")
    }
  }, [route.params])

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
      <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'center', justifyContent: 'flex-start', width: '100%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={"white"} colors={[stylesheet.Primary]} onRefresh={load} />}>
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
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[0].toLocaleString()} Weekly Goal Completed 🥳</Text>
                  }
                  {
                    dailySales < goals[0] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((dailySales / goals[0]) * 100).toFixed(2)}% of the ${goals[0].toLocaleString()} goal</Text>
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
                    width={Dimensions.get("window").width * 0.94} // from react-native
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

              {
                invoicesProgress.labels.weekly && invoicesProgress.labels.weekly.length > 1 && !invoicesProgress.data.weekly.every(item => item === 0) &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>This Month's Progress - ${weeklySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  {
                    weeklySales >= goals[1] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[1].toLocaleString()} Monthly Goal Completed 🥳</Text>
                  }
                  {
                    weeklySales < goals[1] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((weeklySales / goals[1]) * 100).toFixed(2)}% of the ${goals[1].toLocaleString()} goal</Text>
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
                    width={Dimensions.get("window").width * 0.94} // from react-native
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

              {
                invoicesProgress.labels.monthly && invoicesProgress.labels.monthly.length > 1 && !invoicesProgress.data.monthly.every(item => item === 0) &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>This Year's Progress - ${monthlySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  {
                    monthlySales >= goals[2] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>${goals[2].toLocaleString()} Yearly Goal Completed 🥳</Text>
                  }
                  {
                    monthlySales < goals[2] &&
                    <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((monthlySales / goals[2]) * 100).toFixed(2)}% of the ${goals[2].toLocaleString()} goal</Text>
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
                    width={Dimensions.get("window").width * (1 - (0.01 * invoicesProgress.labels.monthly.length))} // from react-native
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
                      left: -10
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
      <TouchableOpacity onPress={() => authenticatedQuickbooks ? invoiceActionSheetRef.current?.setModalVisible(true) : quickbooksAuthenticateActionSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
        <Feather name="plus" size={32} color={stylesheet.SecondaryTint} />
      </TouchableOpacity>

      <ActionSheet headerAlwaysVisible={true} containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} onClose={() => {setInvoiceAddMode(false); setInvoiceOwnerIdentifier("")}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={invoiceActionSheetRef}>
        <ScrollView scrollable={false} style={{paddingBottom: 40}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => {setInvoiceOwnerIdentifier("")}}>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>New Invoice <Text style={styles.primary}>{invoiceOwnerIdentifier && distributors.find(d => d.identifier === invoiceOwnerIdentifier) ? `for ${distributors.find(d => d.identifier === invoiceOwnerIdentifier).company}`: ''}</Text></Text>
            </TouchableOpacity>
            <View style={styles.spacer}></View>
          </View>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            {
              invoiceOwnerIdentifier === "" && promptInvoiceForNearestDist && distributors.length > 0 &&
              <>
                <Text style={[styles.subHeaderText, styles.bold, styles.tertiary, styles.centerText]}>Create invoice for nearest retailer?</Text>

                <Text style={[styles.baseText, styles.bold, styles.tertiary, styles.centerText, {marginTop: 40}]}>You're very close to {distributors[0].company}</Text>
                <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 10}]}>
                  <TouchableOpacity
                    onPress={() => setPromptInvoiceForNearestDist(false)}
                    underlayColor='#fff'
                    style={{marginLeft: 15, marginRight: 15}}>
                    <Feather name="x" size={32} color={stylesheet.Primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setInvoiceOwnerIdentifier(distributors[0].identifier)}
                    underlayColor='#fff'
                    style={{marginLeft: 15, marginRight: 15}}>
                    <Feather name="check" size={32} color={stylesheet.Primary} />
                  </TouchableOpacity>
                </View>
              </>
            }

            {
              invoiceOwnerIdentifier === "" && !promptInvoiceForNearestDist &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Retailer</Text>
                <TextInput
                  placeholderTextColor="#888"
                  style={[{marginTop: 25,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Find retailer..."
                  keyboardType="default"
                  value={distributorSearch}
                  onChangeText={(text) => {
                    setDistributorSearch(text)
                  }}
                />
                <ScrollView style={{height: 200}}>
                  {
                    distributors.filter(dist => dist.company.toLowerCase().replace(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, "").includes(distributorSearch.toLowerCase().replace(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, ""))).map(distributor => {
                      return (
                        <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setInvoiceOwnerIdentifier(distributor.identifier)}}>
                          <Text style={[styles.baseText, styles.tertiary]}>{distributor.company} - {distributor.managers.join(', ')}</Text>
                        </TouchableOpacity>
                      )
                    })
                  }
                </ScrollView>
              </>
            }

            {
              invoiceOwnerIdentifier !== "" && !invoiceAddMode &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Products</Text>
                {
                  invoiceLine.map((invoiceLineItem, idx) => {
                    return (
                      <>
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{FormatProductNameLong(products.find(p => p.identifier === invoiceLineItem.identifier))}</Text>
                          <View style={styles.spacer}></View>
                          {
                            invoiceLineItem.cost == 0 &&
                            <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{invoiceLineItem.quantity} x FREE</Text>
                          }
                          {
                            invoiceLineItem.cost != 0 &&
                            <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{invoiceLineItem.quantity} x ${invoiceLineItem.cost.toLocaleString()}</Text>
                          }
                          <Pressable onPress={() => onInvoiceLineRemove(idx)} style={{bottom: 2, marginLeft: 10}}>
                            <Feather name="x" size={24} color='red' />
                          </Pressable>
                        </View>
                      </>
                    )
                  })
                }
                <TouchableOpacity onPress={() => setInvoiceAddMode(true)} style={[{marginLeft: '7.5%', marginBottom: 50, marginTop: 10}]}>
                  <Text style={[styles.primary, styles.bold, {fontSize: 18}]}>Add Product</Text>
                </TouchableOpacity>


                {
                  invoiceLine.length > 0 &&
                  <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Total: ${(invoiceLine.reduce((total, next) => total += next.amount, 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                }
                {
                  invoiceLine.length > 0 &&
                  <TouchableOpacity onPress={() => onCreateInvoice()} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 20}]}>
                    <Text style={[styles.secondary, styles.bold]}>Create Invoice</Text>
                  </TouchableOpacity>
                }
              </>
            }

            {
              invoiceOwnerIdentifier !== "" && invoiceAddMode &&
              <>
                {
                  invoiceRec[invoiceLineItemRefIdentifier] > 0 &&
                  <Text style={[styles.baseText, styles.bold, styles.centerText, styles.opaque, styles.tertiary, {marginBottom: 20}]}>Based on previous inventory data the <Text style={styles.primary}>recommended delivery quantity is {invoiceRec[invoiceLineItemRefIdentifier]}</Text></Text>
                }
                {
                  invoiceLineItemRefIdentifier != "" && !invoiceAddScanMode && !invoiceAddSearchMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                    <Text style={[{marginTop: 10}, styles.baseText, styles.tertiary]}>{FormatProductNameLong(products.find(p => p.identifier === invoiceLineItemRefIdentifier))}</Text>
                    <Image style={{ marginTop: 20, width: 120, height: 120}} resizeMode="contain" source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto,w_100/' + products.find(p => p.identifier === invoiceLineItemRefIdentifier).shot}}></Image>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 20}]}>Lot Number</Text>
                    <Text style={[styles.baseText, styles.tertiary, {marginBottom: 20}]}>#{invoiceLineItemRefLot}</Text>
                  </>
                }

                {
                  invoiceLineItemRefIdentifier == "" && !invoiceAddScanMode && !invoiceAddSearchMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                    <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 10, marginBottom: 10}]}>
                      <TouchableOpacity
                        onPress={() => setInvoiceAddScanMode(true)}
                        underlayColor='#fff'
                        style={[{marginLeft: 15, marginRight: 15}, styles.center]}>
                        <Feather name="maximize" size={26} color={stylesheet.Primary} />
                        <Text style={{marginTop: 5, fontSize: 12, color: stylesheet.Primary}}>Scan Product</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setInvoiceAddSearchMode(true)}
                        underlayColor='#fff'
                        style={[{marginLeft: 15, marginRight: 15}, styles.center]}>
                        <Feather name="edit" size={26} color={stylesheet.Primary} />
                        <Text style={{marginTop: 5, fontSize: 12, color: stylesheet.Primary}}>Pick Item</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                }

                {
                  !invoiceAddScanMode && !invoiceAddSearchMode &&
                  <>

                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Quantity</Text>
                    <TextInput
                      placeholderTextColor="#888"
                      style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                      placeholder="Enter quantity..."
                      keyboardType="numeric"
                      value={invoiceLineItemRefQty}
                      onChangeText={(text) => {
                        setInvoiceLineItemRefQty(text)
                        setInvoiceLineItemRefAmount(parseFloat(invoiceLineItemRefCost) * parseInt(text))
                      }}
                    />

                    <View style={[styles.fullWidth, styles.defaultRowContainer]}>
                      <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Cost</Text>
                      <View style={styles.spacer}></View>
                      <Pressable onPress={() => {setInvoiceLineItemRefCost("0"); setInvoiceLineItemRefAmount(0)}}>
                        <Text style={[styles.baseText, styles.bold, styles.primary]}>FREE</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      placeholderTextColor="#888"
                      style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                      placeholder="Enter cost..."
                      keyboardType="numeric"
                      value={invoiceLineItemRefCost}
                      onChangeText={(text) => {
                        setInvoiceLineItemRefCost(text);
                        setInvoiceLineItemRefAmount(parseFloat(text) * parseInt(invoiceLineItemRefQty))
                      }}
                    />
                  </>
                }

                {
                 invoiceAddScanMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Scan Product Container</Text>
                    <BarCodeScanner barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]} onBarCodeScanned={({type, data}) => {onProductContainerScan(data)}} style={{position: 'relative', marginTop: 30, marginiBottom: 10, height: 300, width: '100%'}}/>
                    <Pressable style={[styles.fullWidth, styles.center]} onPress={(() => setInvoiceAddScanMode(false))}>
                      <Text style={[styles.baseText, styles.bold, styles.fullWidth, styles.primary, styles.centerText, {marginTop: 30}]}>Back</Text>
                    </Pressable>
                  </>
                }
                {
                  invoiceAddSearchMode &&
                  <>
                    <View style={[styles.fullWidth, styles.defaultRowContainer]}>
                      <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Lot Number #</Text>
                      <View style={styles.spacer}></View>
                      {
                        recentBatchNumber !== "" &&
                        <Pressable onPress={() => {setInvoiceLineItemRefLot(recentBatchNumber); setRecentBatchNumber('')}}>
                          <Text style={[styles.baseText, styles.bold, styles.primary]}>{recentBatchNumber}</Text>
                        </Pressable>
                      }
                    </View>
                    <TextInput
                      placeholderTextColor="#888"
                      style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                      placeholder="Enter lot number..."
                      keyboardType="numeric"
                      value={invoiceLineItemRefLot}
                      onChangeText={(text) => {
                        setInvoiceLineItemRefLot(text.toString());
                      }}
                    />
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                    <ScrollView style={{height: 280, marginTop: 10}} contentContainerStyle={[styles.defaultRowContainer, {flexWrap: 'wrap', justifyContent: 'space-around'}]}>
                      {
                        products.filter(p => p.sku).map(product => {
                          return (
                            <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setInvoiceLineItemRefIdentifier(product.identifier);}}>
                              <Image style={{ width: 120, height: 120, backgroundColor: product.identifier === invoiceLineItemRefIdentifier ? stylesheet.Primary : 'white'}} resizeMode="contain" source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto,w_100/' + product.shot}}></Image>
                            </TouchableOpacity>
                          )
                        })
                      }
                    </ScrollView>

                    {
                      invoiceLineItemRefLot !== "" && invoiceLineItemRefIdentifier !== "" &&
                      <TouchableOpacity onPress={() => setInvoiceAddSearchMode(false)} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 40}]}>
                        <Text style={[styles.secondary, styles.bold]}>Add Product Reference</Text>
                      </TouchableOpacity>
                    }
                  </>
                }

                {
                  invoiceLineItemRefIdentifier !== "" && invoiceLineItemRefQty !== "" && parseInt(invoiceLineItemRefQty) > 0 && invoiceLineItemRefCost !== "" && invoiceLineItemRefLot !== "" && !invoiceAddSearchMode &&
                  <TouchableOpacity onPress={onAddLineItem} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 40}]}>
                    <Text style={[styles.secondary, styles.bold]}>Add Line Item</Text>
                  </TouchableOpacity>
                }
              </>
            }
          </View>
        </ScrollView>
      </ActionSheet>
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
