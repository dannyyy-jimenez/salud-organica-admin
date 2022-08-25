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

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const invoiceActionSheetRef = React.createRef();
const scopeInvoiceActionSheetRef = React.createRef();
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
  const [scopeInvoice, setScopeInvoice] = React.useState(null)
  const [onWiFi, setOnWiFi] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [showInvoiceReminders, setShowInvoiceReminders] = React.useState(false)
  const [invoiceRemindersSection, setInvoiceRemindersSection] = React.useState("PRINT")

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

  const [invoicePaymentMode, setInvoicePaymentMode] = React.useState(false)
  const [confirmInvoiceDeleteMode, setConfirmInvoiceDeleteMode] = React.useState(false)
  const [invoiceAddMode, setInvoiceAddMode] = React.useState(false)
  const [invoiceAddScanMode, setInvoiceAddScanMode] = React.useState(false)
  const [invoiceAddSearchMode, setInvoiceAddSearchMode] = React.useState(false)
  const [promptInvoiceForNearestDist, setPromptInvoiceForNearestDist] = React.useState(false)

  // stats

  const goals = [1000, 4000, 15000]
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
      if (dists[0].distance < 0.160934) {
        setPromptInvoiceForNearestDist(true)
      }
      setProducts(res.data.products);

      setTopUps(res.data.topups)
      AnalyzeInvoices(res.data.invoices)

      if (scopeInvoice) {
        setScopeInvoice(res.data.invoices.find(i => i.identifier == scopeInvoice.identifier))
      }

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
    let weeklyLabels = []
    let dailyLabels = []
    let monthlyLabels = []
    let weekly = []
    let daily = []
    let monthly = []
    let overdue = []
    let pending = []
    let paid = []

    for (let invoice of data.slice().reverse()) {
      if (moment(invoice.created).isSame(new Date(), 'day')) {
        if (dailyLabels.includes(moment(invoice.created).format('HH:MM'))) {
          daily[dailyLabels.indexOf(moment(invoice.created).format('HH:MM'))] += invoice.total
        } else {
          dailyLabels.push(moment(invoice.created).format('HH:MM'))
          daily.push(invoice.total)
        }
      }

      if (moment(invoice.created).isSame(new Date(), 'week')) {
        if (weeklyLabels.includes(moment(invoice.created).format('ddd'))) {
          weekly[weeklyLabels.indexOf(moment(invoice.created).format('ddd'))] += invoice.total
        } else {
          weeklyLabels.push(moment(invoice.created).format('ddd'))
          weekly.push(invoice.total)
        }
      }

      if (moment(invoice.created).isSame(new Date(), 'month')) {
        if (monthlyLabels.includes(moment(invoice.created).date())) {
          monthly[monthlyLabels.indexOf(moment(invoice.created).date())] += invoice.total
        } else {
          monthlyLabels.push(moment(invoice.created).date())
          monthly.push(invoice.total)
        }
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
    setWeelySales(weekly)
    setDailySales(daily)
    setMonthySales(monthly.reduce((total, next) => total + next, 0))

    setInvoicesProgress({
      "labels": {
        daily: dailyLabels,
        weekly: weeklySales,
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
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      Location.watchPositionAsync({}, (location) => {
        setLocation(location);

        load(location, false)
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

  React.useEffect(() => {
    if (scopeInvoice) {
      scopeInvoiceActionSheetRef.current?.setModalVisible(true)
    }
  }, [scopeInvoice])

  React.useEffect(() => {
    if (invoiceLineItemRefIdentifier == "" || invoiceLineItemRefCost !== "") return;

    setInvoiceLineItemRefCost(products.find(p => p.identifier === invoiceLineItemRefIdentifier).distributorPrice.toFixed(2))

  }, [invoiceLineItemRefIdentifier])

  const FormatProductName = (identifier) => {
    if (identifier == 'rubbing') return 'Artisanal Rubbing Alcohol'
    if (identifier == 'cream') return 'Topical Cream'
    if (identifier == 'rollon') return 'Artisanal Alcohol Roll- On'

    return identifier;
  }

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

  const onAddLineItem = () => {
    setInvoiceLine([...invoiceLine, {
      identifier: invoiceLineItemRefIdentifier,
      quantity: invoiceLineItemRefQty,
      cost: invoiceLineItemRefCost,
      lot: invoiceLineItemRefLot,
      amount: invoiceLineItemRefAmount
    }])

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

      setShowInvoiceReminders(true)
      setScopeInvoice(scopified)
      setInvoiceLine([])
      setInvoiceOwnerIdentifier("")
    } catch (e) {
      setIsLoading(false)
      invoiceActionSheetRef.current?.setModalVisible(true)
    }
  }

  const GetShareableURI = async (id) => {
    setIsLoading(true);

    try {
      const res = await API.get('/admin/invoice/actions/shareable', {id: id});

      if (res.isError) throw 'error';

      setIsLoading(false);

      const result = await Share.share({
        message: res.data._txt
      });
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  // edit invoice

  const GetPdfURI = async (id) => {
    setIsLoading(true);

    try {
      const res = await API.get('/admin/invoice/actions/pdf', {id: id});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-invoice_${id}.pdf`;

      const buff = Buffer.from(res.data._f, 'base64')
      let pdf = buff.toString('base64')
      await FileSystem.writeAsStringAsync(fileUri, pdf, { encoding: FileSystem.EncodingType.Base64 });

      setIsLoading(false);

      await Sharing.shareAsync(fileUri);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const GetPrintableURI = async (id) => {
    setIsLoading(true);

    try {
      const res = await API.get('/admin/invoice/actions/printable', {id: id});

      if (res.isError) throw 'error';

      const buff = Buffer.from(res.data._f, 'utf-8')
      let pdf = buff.toString('utf-8')

      setIsLoading(false);

      await Print.printAsync({
        html: pdf
      });
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const TopUpDelivery = async (invoice) => {
    if (isLoading) return;

    setIsLoading(true);

    try {

      let herencia_rollon = 0;
      let herencia_rubbing =  0;
      let herencia_cream = 0;

      invoice.line.forEach((line, i) => {
        if (line.product.identifier === 'rubbing') {
          herencia_rubbing += line.quantity
        } else if (line.product.identifier === 'cream') {
          herencia_cream += line.quantity
        } else if (line.product.identifier === 'rollon') {
          herencia_rollon += line.quantity
        }
      });

      if (herencia_rollon > 0 || herencia_rubbing > 0 || herencia_cream > 0) {
        const res = await API.post('/admin/inventory', {editMode: false, editID: null, identifier: invoice.distributor.identifier, invoiceId: invoice.identifier, line: 'herencia', isDelivery: true, herencia_rubbing: herencia_rubbing, herencia_cream: herencia_cream, herencia_rollon: herencia_rollon, sourappleGummies: 0, tropicalGummies: 0, berriesGummies: 0, sourdieselFlower: 0, sourdieselJoints: 0, oilDefault: 0, spacecandyJoints: 0, spacecandyFlower: 0, godfatherFlower: 0, godfatherJoints: 0, note: 'invoice marked as delivered'});
        if (res.isError) throw 'error';
      }

      setTopUps([topups, ...invoice.identifier])
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const onDeleteInvoice = async (identifier) => {
    if (isLoading) return;

    setIsLoading(true);

    try {

      const res = await API.post('/admin/invoice/actions/delete', {identifier: identifier});

      if (res.isError) throw 'error';

      load()
      scopeInvoiceActionSheetRef.current?.setModalVisible(false)
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const onAddPayment = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const res = await API.post('/admin/invoice/actions/payment', {identifier: scopeInvoice.identifier, amount: invoicePaymentAmount, memo: invoicePaymentMemo, type: invoicePaymentIsCash ? 'CASH' : 'CHECK', ref: invoicePaymentRef});
      console.log(res)
      if (res.isError) throw 'error';

      load()

      setInvoicePaymentRef('')
      setInvoicePaymentMemo('')
      setInvoicePaymentAmount('')
      setInvoicePaymentMode(false)
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

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
      <ScrollView contentOffset={{x: 0, y: 800}} style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'center', justifyContent: 'flex-start', width: '100%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={"white"} colors={[stylesheet.Primary]} onRefresh={load} />}>
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

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.marginWidth, styles.justifyCenter, {marginTop: 40, marginBottom: 40, height: 'auto'}]} contentContainerStyle={{flexGrow: 1}}>
              {
                overdue.length > 0 &&
                <View style={[styles.analyticCard, styles.elevated, {backgroundColor: '#FF3131'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Overdue ({overdue.length})</Text>

                  <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${overdue.reduce((total, next) => total + next, 0).toLocaleString()}</Text>
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
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${pending.reduce((total, next) => total + next, 0).toLocaleString()}</Text>
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
                    <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>${paid.reduce((total, next) => total + next, 0).toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity onPress={() => setSearch('PAID')} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#40BA91"}]}>
                    <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
                  </TouchableOpacity>
                </View>
              }
            </ScrollView>

            <View style={[styles.defaultRowContainer, styles.marginWidth, styles.justifyCenter, {marginTop: 20, height: 'auto'}]}>

              {
                dailySales > 0 && invoicesProgress.labels.daily.length > 1 &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>Daily Progress - ${goals[0].toLocaleString()}</Text>
                  <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((dailySales / goals[0]) * 100).toFixed(2)}% of the way there</Text>

                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.daily,
                      datasets: [
                        {
                          data: invoicesProgress.data.daily
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width * 1} // from react-native
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
                      return parseFloat(c).toLocaleString()
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: -20
                    }}
                  />
                </View>
              }

              {
                weeklySales > 0 && invoicesProgress.labels.weekly.length > 1 &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>Weekly Progress - ${goals[1].toLocaleString()}</Text>
                  <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((weeklySales / goals[1]) * 100).toFixed(2)}% of the way there</Text>

                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.weekly,
                      datasets: [
                        {
                          data: invoicesProgress.data.weekly
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width * 1} // from react-native
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
                      return parseFloat(c).toLocaleString()
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: -20
                    }}
                  />
                </View>
              }

              {
                monthlySales > 0 && invoicesProgress.labels.monthly.length > 1 &&
                <View style={[styles.analyticCardF, styles.elevated, {backgroundColor: '#FAF0E6'}]}>
                  <Text style={[styles.subHeaderText, styles.bold, styles.tertiary]}>Monthly Progress - ${goals[2].toLocaleString()}</Text>
                  <Text style={[styles.tinyText, styles.bold, styles.tertiary, styles.opaque, {marginTop: 5, marginBottom: 5}]}>{((monthlySales / goals[2]) * 100).toFixed(2)}% of the way there</Text>

                  <LineChart
                    data={{
                      labels: invoicesProgress.labels.monthly.map(w => 'Day ' + w),
                      datasets: [
                        {
                          data: invoicesProgress.data.monthly
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width * 1} // from react-native
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
                      return parseFloat(c).toLocaleString()
                    }}
                    bezier
                    style={{
                      padding: 0,
                      margin: 0,
                      marginTop: 10,
                      left: -20
                    }}
                  />
                </View>
              }
            </View>
          </>
        }

        {
          !isLoading && invoices.map((invoice) => {
            return (
              <Pressable onPress={() => setScopeInvoice(invoice)} style={[styles.fullInvoice, styles.elevated]}>
                <View style={[styles.defaultRowContainer, styles.fullWidth, {padding: 10}]}>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Bill To</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.distributor.company}</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.distributor.address.line1}</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.distributor.address.rest}</Text>
                  </View>
                  <View style={[styles.spacer]}></View>
                  <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
                </View>
                <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 15, padding: 10}]}>
                  {
                    invoice.line.map(line => {
                      return (
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatProductName(line.product.identifier)}</Text>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x ${line.rate}</Text>
                        </View>
                      )
                    })
                  }
                </View>
                <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                  <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${invoice.balance.toFixed(2)}</Text>
                    </View>
                    <View style={styles.spacer}></View>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}></Text>
                    </View>
                  </View>
                  <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                    <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${invoice.total.toFixed(2)}</Text>
                    {
                      !invoice.paid && invoice.dueDays > 1 &&
                      <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center, {marginTop: 5}]}>Due in {invoice.dueDays} days</Text>
                    }
                    {
                      !invoice.paid && invoice.dueDays == 1 &&
                      <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center, {marginTop: 5}]}>Due in {invoice.dueDays} day</Text>
                    }
                  </View>
                  {
                    !invoice.paid && invoice.dueDays < 1 &&
                    <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: invoice.dueDays > 0 || invoice.paid ? stylesheet.Primary : 'red'}}>
                      {
                        invoice.dueDays == 0 &&
                        <Text style={[styles.tinyText, styles.bold, styles.center, {color: 'white', marginTop: 2}]}>Due Today</Text>
                      }
                      {
                        invoice.dueDays == -1 &&
                        <Text style={[styles.tinyText, styles.bold, styles.center, {color: 'white', marginTop: 2}]}>Overdue {invoice.dueDays * -1} day</Text>
                      }
                      {
                        invoice.dueDays < -1 &&
                        <Text style={[styles.tinyText, styles.bold, styles.center, {color: 'white', marginTop: 2}]}>Overdue {invoice.dueDays * -1} days</Text>
                      }
                    </View>
                  }
                  {
                    invoice.paid &&
                    <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: stylesheet.Primary}}>
                      <Text style={[styles.tinyText, styles.bold, styles.center, {color: 'white', marginTop: 2}]}>PAID {invoice.payments[0].date}</Text>
                    </View>
                  }
                  <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: invoice.dueDays > 0 || invoice.paid ? stylesheet.Primary : 'red'}}>
                    <Text style={[styles.tinyText, styles.secondary, styles.bold, {marginTop: 2}]}>
                      #{invoice.identifier}
                    </Text>
                  </View>
                  <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, marginTop: 10, marginBottom: 20}]}>
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => GetPrintableURI(invoice.identifier)}>
                      <Feather name="printer" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => GetPdfURI(invoice.identifier)}>
                      <AntDesign name="pdffile1" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Share</Text>
                    </TouchableOpacity>
                    {/* <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetShareableURI(invoice.identifier)}>
                      <Feather name="type" size={28} color="black" />
                    </TouchableOpacity> */}
                    {
                      !topups.includes(invoice.identifier) &&
                      <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => TopUpDelivery(invoice)}>
                        <Feather name="truck" size={28} color="black" />
                        <Text style={{marginTop: 5, fontSize: 12}}>Delivered</Text>
                      </TouchableOpacity>
                    }
                  </View>
                </View>
              </Pressable>
            )
          })
        }
      </ScrollView>
      <TouchableOpacity onPress={() => authenticatedQuickbooks ? invoiceActionSheetRef.current?.setModalVisible(true) : quickbooksAuthenticateActionSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
        <Feather name="plus" size={32} color={stylesheet.SecondaryTint} />
      </TouchableOpacity>
      <ActionSheet containerStyle={{backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} onClose={() => {setScopeInvoice(null); setConfirmInvoiceDeleteMode(false); setInvoicePaymentMode(false); setShowInvoiceReminders(false); setInvoiceRemindersSection("PRINT")}} ref={scopeInvoiceActionSheetRef}>
        {
          scopeInvoice && showInvoiceReminders && invoiceRemindersSection === "PRINT" &&
          <View style={{padding: 15, marginBottom: 40}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>

            <TouchableOpacity onPress={() => GetPrintableURI(scopeInvoice.identifier)} style={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
              <Feather name="printer" size={36} color={stylesheet.Primary} />
            </TouchableOpacity>

            <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.tertiary]}>You might want to print the invoice</Text>

            <View style={[styles.defaultColumnContainer, styles.marginWidth, styles.center, {marginTop: 30}]}>
              <Text style={[styles.base, styles.bold, styles.fullWidth, styles.tertiary, {marginBottom: 10}]}>Steps to Print On the Go</Text>
              <Text style={[styles.base, styles.bold, styles.marginWidth, styles.tertiary]}>1. Tap printer icon</Text>
              <Text style={[styles.base, styles.bold, styles.marginWidth, styles.tertiary]}>2. Select "Print"</Text>
              <Text style={[styles.base, styles.bold, styles.marginWidth, styles.tertiary]}>3. Share to or Open with Paperrang App</Text>
              <Text style={[styles.base, styles.bold, styles.marginWidth, styles.tertiary]}>4. Print!</Text>
            </View>

            <TouchableOpacity onPress={() => {setInvoiceRemindersSection("DELIVERY")}} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 30}]}>
              <Text style={[styles.secondary, styles.bold]}>Finished</Text>
            </TouchableOpacity>
          </View>
        }
        {
          scopeInvoice && showInvoiceReminders && invoiceRemindersSection === "DELIVERY" &&
          <View style={{padding: 15, marginBottom: 40}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>

            <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
              <Feather name="truck" size={36} color="black" />
            </View>
            <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.tertiary]}>Don't forget to mark as delivered</Text>

            <TouchableOpacity onPress={() => {TopUpDelivery(scopeInvoice); setInvoiceRemindersSection("PICTURE")}} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 30}]}>
              <Text style={[styles.secondary, styles.bold]}>Delivered!</Text>
            </TouchableOpacity>
          </View>
        }
        {
          scopeInvoice && showInvoiceReminders && invoiceRemindersSection === "PICTURE" &&
          <View style={{padding: 15, marginBottom: 40}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>

            <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
              <Feather name="camera" size={36} color="black" />
            </View>
            <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.tertiary]}>Don't forget to take pictures of product placement</Text>

            <TouchableOpacity onPress={() => {setShowInvoiceReminders(false);setInvoiceRemindersSection('PRINT')}} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 30}]}>
              <Text style={[styles.secondary, styles.bold]}>Done!</Text>
            </TouchableOpacity>
          </View>
        }
        {
          scopeInvoice && !showInvoiceReminders && !confirmInvoiceDeleteMode && !invoicePaymentMode &&
          <View style={{padding: 15}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>
            {
              scopeInvoice.paid &&
              <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>PAID</Text>
            }
            {
              !scopeInvoice.paid && scopeInvoice.dueDays > 1 &&
              <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>Due in {scopeInvoice.dueDays} days</Text>
            }
            {
              !scopeInvoice.paid && scopeInvoice.dueDays == 1 &&
              <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>Due in {scopeInvoice.dueDays} day</Text>
            }
            {
              !scopeInvoice.paid && scopeInvoice.dueDays == 0 &&
              <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Due Today</Text>
            }
            {
              !scopeInvoice.paid && scopeInvoice.dueDays == -1 &&
              <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Overdue {scopeInvoice.dueDays * -1} day</Text>
            }
            {
              !scopeInvoice.paid && scopeInvoice.dueDays < -1 &&
              <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Overdue {scopeInvoice.dueDays * -1} days</Text>
            }
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 25}]}>
              <View style={[styles.defaultColumnContainer]}>
                <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Bill To</Text>
                <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{scopeInvoice.distributor.managers.join(' or ')}</Text>
                <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{scopeInvoice.distributor.company}</Text>
                <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{scopeInvoice.distributor.address.line1}</Text>
                <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{scopeInvoice.distributor.address.rest}</Text>
              </View>
              <View style={[styles.spacer]}></View>
              <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
            </View>
            <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 5}]}>
              {
                scopeInvoice.line.map(line => {
                  return (
                    <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                      <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatProductName(line.product.identifier)} (#{line.lot})</Text>
                      <View style={styles.spacer}></View>
                      <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x ${line.rate}</Text>
                    </View>
                  )
                })
              }
            </View>
            {
              scopeInvoice.payments && scopeInvoice.payments.length > 0 &&
              <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginBottom: 40}]}>
                {
                  scopeInvoice.payments.map(payment => {
                    return (
                      <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 5}]}>
                        <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.primary]}>{payment.date} Payment Recieved</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.primary]}>- ${payment.amount.toFixed(2)}</Text>
                      </View>
                    )
                  })
                }
              </View>
            }
            <View style={styles.defaultColumnContainer, styles.fullWidth, {backgroundColor: 'white'}}>
              <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                <View style={[styles.defaultColumnContainer]}>
                  <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${scopeInvoice.balance.toFixed(2)}</Text>
                </View>
                <View style={styles.spacer}></View>
                <View style={[styles.defaultColumnContainer]}>
                  <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>Due: {scopeInvoice.due}</Text>
                </View>
              </View>
              <View style={[styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${scopeInvoice.total.toFixed(2)}</Text>
              </View>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 20}]}>
                {
                  !topups.includes(scopeInvoice.identifier) &&
                  <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => TopUpDelivery(scopeInvoice)}>
                    <Feather name="truck" size={28} color="black" />
                    <Text style={{marginTop: 5, fontSize: 12}}>Delivered</Text>
                  </TouchableOpacity>
                }
                {
                  !scopeInvoice.paid &&
                  <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => setInvoicePaymentMode(true)}>
                    <Feather name="dollar-sign" size={28} color="black" />
                    <Text style={{marginTop: 5, fontSize: 12}}>Payment</Text>
                  </TouchableOpacity>
                }
                <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => setConfirmInvoiceDeleteMode(true)}>
                  <Feather name="trash-2" size={28} color="red" />
                  <Text style={{marginTop: 5, fontSize: 12, color: "red"}}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        {
          scopeInvoice && invoicePaymentMode &&
          <View style={{padding: 15, paddingBottom: 45}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>
            {
              isLoading &&
              <View styles={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
                <LottieView
                    ref={animationRef}
                    style={{
                      backgroundColor: '#fff',
                      width: '50%',
                      marginTop: 20,
                      marginLeft: '12%',
                      marginBottom: 40
                    }}
                    autoPlay
                    loop
                    source={require('../assets/loading-bank.json')}
                    // OR find more Lottie files @ https://lottiefiles.com/featured
                    // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
                  />
              </View>
            }

            {
              !isLoading &&
              <>
                <View style={[styles.defaultRowContainer, styles.marginWidth, {marginTop: 30, marginBottom: 30}, styles.center, styles.switchable]}>
                  <Pressable onPress={() => setInvoicePaymentIsCash(true)} style={[styles.switchie, invoicePaymentIsCash ? styles.switchieOn : '']}>
                    <Text style={[styles.baseText, styles.bold, invoicePaymentIsCash ? styles.secondary : styles.tertiary]}>Cash</Text>
                  </Pressable>
                  <Pressable onPress={() => setInvoicePaymentIsCash(false)} style={[styles.switchie, !invoicePaymentIsCash ? styles.switchieOn : '']}>
                    <Text style={[styles.baseText, styles.bold, !invoicePaymentIsCash ? styles.secondary : styles.tertiary]}>Check</Text>
                  </Pressable>
                </View>
                <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary]}>Amount Paid</Text>
                <TextInput
                  placeholderTextColor="#888"
                  style={[{marginTop: 25,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter amount..."
                  keyboardType="numeric"
                  value={invoicePaymentAmount}
                  onChangeText={(text) => {
                    setInvoicePaymentAmount(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15}]}>Memo / Note</Text>
                <TextInput
                  placeholderTextColor="#888"
                  style={[{marginTop: 25,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter memo / note"
                  keyboardType="default"
                  value={invoicePaymentMemo}
                  onChangeText={(text) => {
                    setInvoicePaymentMemo(text)
                  }}
                />

                {
                  !invoicePaymentIsCash &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 15}]}>Check Reference Number</Text>
                    <TextInput
                      placeholderTextColor="#888"
                      style={[{marginTop: 25,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                      placeholder="Enter check #"
                      keyboardType="numeric"
                      value={invoicePaymentRef}
                      onChangeText={(text) => {
                        setInvoicePaymentRef(text)
                      }}
                    />
                  </>
                }

                <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 20}]}>Pending Balance: ${(scopeInvoice.balance - (isNaN(parseFloat(invoicePaymentAmount)) ? 0 : parseFloat(invoicePaymentAmount))).toLocaleString()}</Text>

                {
                  invoicePaymentAmount !== "" && (invoicePaymentIsCash || (!invoicePaymentIsCash && invoicePaymentRef !== "")) &&
                  <TouchableOpacity onPress={onAddPayment} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 40}]}>
                    <Text style={[styles.secondary, styles.bold]}>Add Payment</Text>
                  </TouchableOpacity>
                }
              </>
            }
          </View>
        }
        {
          scopeInvoice && confirmInvoiceDeleteMode &&
          <View style={{padding: 15}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth]}>
              <View style={styles.spacer}></View>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{scopeInvoice.identifier}</Text>
              <View style={styles.spacer}></View>
            </View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 25, marginBottom: 10}]}>Are you sure you want to delete this invoice?</Text>
            <Text style={[styles.tinyText, styles.centerText, styles.tertiary, styles.bold, styles.opaque, {marginBottom: 20}]}>Press trash icon to confirm</Text>
            <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {backgroundColor: 'white', paddingBottom: 0}}>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 10}]}>
                <TouchableOpacity style={{marginLeft: 15, marginRight: 15, marginBottom: 20}} onPress={() => onDeleteInvoice(scopeInvoice.identifier)}>
                  <Feather name="trash-2" size={40} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} onClose={() => {setInvoiceAddMode(false); setInvoiceOwnerIdentifier("")}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={invoiceActionSheetRef}>
        <View style={{marginBottom: 40}}>
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
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{FormatProductName(invoiceLineItem.identifier)}</Text>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{invoiceLineItem.quantity} x ${invoiceLineItem.cost.toLocaleString()}</Text>
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
                  invoiceRec[invoiceLineItemRefIdentifier] &&
                  <Text style={[styles.baseText, styles.bold, styles.centerText, styles.opaque, styles.tertiary, {marginBottom: 20}]}>Based on previous inventory data the <Text style={styles.primary}>recommended delivery quantity is {invoiceRec[invoiceLineItemRefIdentifier]}</Text></Text>
                }
                {
                  invoiceLineItemRefIdentifier != "" && !invoiceAddScanMode && !invoiceAddSearchMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                    <Text style={[{marginTop: 10}, styles.baseText, styles.tertiary]}>{FormatProductName(products.find(p => p.identifier === invoiceLineItemRefIdentifier).identifier)}</Text>
                    <Image style={{ marginTop: 20, width: 120, height: 120}} resizeMode="contain" source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto/' + products.find(p => p.identifier === invoiceLineItemRefIdentifier).shot}}></Image>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 20}]}>Lot Number</Text>
                    <Text style={[styles.baseText, styles.tertiary, {marginBottom: 20}]}>#{invoiceLineItemRefLot}</Text>
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

                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Cost</Text>
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
                  invoiceLineItemRefIdentifier == "" && !invoiceAddScanMode && !invoiceAddSearchMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                    <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 10}]}>
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
                 invoiceAddScanMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Scan Product Container</Text>
                    <BarCodeScanner barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]} onBarCodeScanned={({type, data}) => {onProductContainerScan(data)}} style={{position: 'relative', marginTop: 30, marginiBottom: 10, height: 300, width: '100%'}}/>
                  </>
                }
                {
                  invoiceAddSearchMode &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Lot Number #</Text>
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
                            <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setInvoiceLineItemRefIdentifier(product.identifier)}}>
                              <Image style={{ width: 120, height: 120, backgroundColor: product.identifier === invoiceLineItemRefIdentifier ? stylesheet.Primary : 'white'}} resizeMode="contain" source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto/' + product.shot}}></Image>
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
        </View>
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
