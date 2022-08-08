import * as React from 'react';
import { Linking, Platform, ScrollView, Dimensions, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
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
import {
  ProgressChart
} from "react-native-chart-kit";
import moment from 'moment';
moment().format();
import { AnimatedCircularProgress } from 'react-native-circular-progress';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const invoiceActionSheetRef = React.createRef();
const slipScanActionSheetRef = React.createRef();
const slipInvoiceActionSheetRef = React.createRef();

export default function InvoicesComponent({navigation}) {
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    sort: 'nearest'
  });
  const [oathToken, setOathToken] = React.useState(null)
  const [invoices, setInvoices] = React.useState([])
  const [distributors, setDistributors] = React.useState([])
  const [invoiceOwner, setInvoiceOwner] = React.useState(null)
  const [invoiceOwnerName, setInvoiceOwnerName] = React.useState(null)
  const [distributorSearch, setDistributorSearch] = React.useState('')
  const [topups, setTopUps] = React.useState([])

  const [invoiceLine, setInvoiceLine] = React.useState([])
  const [invoiceLineItemAmount, setInvoiceLineItemAmount] = React.useState(0)
  const [invoiceLineItemRefName, setInvoiceLineItemRefName] = React.useState('')
  const [invoiceLineItemRefId, setInvoiceLineItemRefId] = React.useState('')
  const [invoiceLineItemRefCost, setInvoiceLineItemRefCost] = React.useState('10.00')
  const [invoiceLineItemRefQty, setInvoiceLineItemRefQty] = React.useState('1')

  const [lineItems, setLineItems] = React.useState([])
  const [invoiceLineItems, setInvoiceLineItems] = React.useState([])
  const [slipId, setSlipId] = React.useState(null)
  const [slipLineItems, setSlipLineItems] = React.useState([])
  const [slipInvoice, setSlipInvoice] = React.useState(null)
  const [showScanner, setShowScanner] = React.useState(false)

  // stats

  const goals = [1000, 4000, 15000]
  const [dailySales, setDailySales] = React.useState(0);
  const [weeklySales, setWeelySales] = React.useState(0);
  const [monthlySales, setMonthySales] = React.useState(0);

  const [invoicesProgress, setInvoicesProgress] = React.useState({
    labels: [],
    data: []
  })

  const load = async () => {
    if (!oathToken) return;

    setIsLoading(true)
    setInvoices([])

    try {
      const res = await API.get('/admin/quickbooks/invoices', {});

      if (res.isError) throw 'error';

      setInvoices(res.data.invoices);
      setDistributors(res.data.distributors);
      setLineItems(res.data.lineItems.filter(l => l.UnitPrice));

      setInvoiceLineItemRefName(res.data.lineItems.filter(l => l.UnitPrice)[0].Name)
      setInvoiceLineItemRefId(res.data.lineItems.filter(l => l.UnitPrice)[0].Id)
      setInvoiceLineItemRefCost(res.data.lineItems.filter(l => l.UnitPrice)[0].UnitPrice?.toString())
      setTopUps(res.data.topups)

      AnalyzeInvoices(res.data.invoices)

      setIsLoading(false);
    } catch (e) {
      console.log(e)
      setOathToken(null)
      setIsLoading(false)
    }
  }

  const AnalyzeInvoices = (data) => {
    let weekly = 0
    let daily = 0
    let monthly = 0
    for (let invoice of data) {
      if (moment(invoice.TxnDate).isSame(new Date(), 'week')) {
        weekly += invoice.TotalAmt
      }

      if (moment(invoice.TxnDate).isSame(new Date(), 'day')) {
        daily += invoice.TotalAmt
      }

      if (moment(invoice.TxnDate).isSame(new Date(), 'month')) {
        monthly += invoice.TotalAmt
      }
    }
    setWeelySales(weekly)
    setDailySales(daily)
    setMonthySales(monthly)

    let progressLabels = []
    let progressData = []

    if (daily != 0) {
      progressLabels.push("Daily $"+daily.toString())
      progressData.push(daily/goals[0])
    }

    if (weekly != 0) {
      progressLabels.push("Weekly $"+weekly.toString())
      progressData.push(weekly/goals[1])
    }

    if (monthly != 0) {
      progressLabels.push("Monthly $"+monthly.toString())
      progressData.push(monthly/goals[2])
    }

    setInvoicesProgress({
      "labels": progressLabels,
      "data": progressData
    })
  }

  const verify = async () => {
    try {
      const res = await API.get('/admin/quickbooks/verify', {});

      if (res.isError || !res.data.valid) throw 'error';

      setOathToken("TRUE")
      await SecureStore.setItemAsync('QBA', res.data.token.access_token);
    } catch (e) {
      setIsLoading(false);
      setOathToken(null)
      console.log(e)
    }
  }

  const QuickbooksAuth = async () => {
    try {
      const res = await API.get('/admin/quickbooks/auth', {});

      if (res.isError) throw 'error';

      let result = await WebBrowser.openAuthSessionAsync(res.data.authUri);

      verify();
    } catch (e) {
      console.log(e)
    }
  }

  const LoadQuickbooksAuth = async () => {
    let token = await SecureStore.getItemAsync('QBA')
    if (token) {
      setIsLoading(true)
      verify()
    } else {
      setIsLoading(false)
    }
  }

  const GetPrintableURI = async (id) => {
    setIsLoading(true);

    try {
      const res = await API.get('/admin/quickbooks/invoice/printable', {id: id});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-invoice_${id}.pdf`;
      const buff = Buffer.from(res.data.uri, 'base64')
      let pdf = buff.toString('base64')

      setIsLoading(false);

      await FileSystem.writeAsStringAsync(fileUri, pdf, { encoding: FileSystem.EncodingType.Base64 });

      await Print.printAsync({
        uri: fileUri
      });
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const GetShareableURI = async (id) => {
    setIsLoading(true);

    try {
      const res = await API.get('/admin/quickbooks/invoice/printable', {id: id});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-invoice_${id}.pdf`;
      const buff = Buffer.from(res.data.uri, 'base64')
      let pdf = buff.toString('base64')

      setIsLoading(false);

      await FileSystem.writeAsStringAsync(fileUri, pdf, { encoding: FileSystem.EncodingType.Base64 });

      const result = await Share.share({
        message: res.data._txt
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

      invoice.Line.forEach((line, i) => {
        if (line.SalesItemLineDetail?.ItemRef?.name === 'Topical:La Herencia Del Abuelo Artisanal Rubbing Alcohol') {
          herencia_rubbing += line.SalesItemLineDetail?.Qty
        } else if (line.SalesItemLineDetail?.ItemRef?.name === 'Topical:La Herencia Del Abuelo Topical Cream') {
          herencia_cream += line.SalesItemLineDetail?.Qty
        } else if (line.SalesItemLineDetail?.ItemRef?.name === 'Topical:La Herencia Del Abuelo Rubbing Artisanal Alcohol Roll- On') {
          herencia_rollon += line.SalesItemLineDetail?.Qty
        }
      });

      if (herencia_rollon > 0 || herencia_rubbing > 0 || herencia_cream > 0) {
        const res = await API.post('/admin/inventory', {editMode: false, editID: null, identifier: invoice.CustomerRef.value, invoiceId: invoice.Id, line: 'herencia', isDelivery: true, herencia_rubbing: herencia_rubbing, herencia_cream: herencia_cream, herencia_rollon: herencia_rollon, sourappleGummies: 0, tropicalGummies: 0, berriesGummies: 0, sourdieselFlower: 0, sourdieselJoints: 0, oilDefault: 0, spacecandyJoints: 0, spacecandyFlower: 0, godfatherFlower: 0, godfatherJoints: 0, note: 'topped up through quickbooks'});
        if (res.isError) throw 'error';
      }
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const onAddLineItem = async (slips = false) => {

    let item = lineItems.find(l => l.Id === invoiceLineItemRefId);

    setInvoiceLineItems([...invoiceLineItems, {
      Description: item.Description,
      DetailType: "SalesItemLineDetail",
      Amount: invoiceLineItemAmount,
      SalesItemLineDetail: {
        ItemRef: {
          "name": item.Name,
          "value": item.Id,
        },
        "UnitPrice": parseFloat(invoiceLineItemRefCost),
        "Qty": parseInt(invoiceLineItemRefQty)
      }
    }])

    if (slips) {
      let slipies = [...slipLineItems].slice(1)
      setSlipLineItems(slipies)

      let item = lineItems.find(l => l.Id == slipies[0].product.quickbooksId)

      setInvoiceLineItemAmount(slipies[0].quantity * item.UnitPrice)
      setInvoiceLineItemRefName(item.Name)
      setInvoiceLineItemRefId(item.Id)
      setInvoiceLineItemRefCost(item.UnitPrice.toString())
      setInvoiceLineItemRefQty(slipies[0].quantity.toString())
    }
  }

  const onCreateInvoice = async () => {
    invoiceActionSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      const res = await API.post('/admin/quickbooks/invoice', {invoiceOwnerId: invoiceOwner, invoiceOwnerName: invoiceOwnerName, lineItems: invoiceLineItems});

      if (res.isError) throw 'error';

      load();

      setLineItems([])
      setInvoiceOwner(null)
      setInvoiceOwnerName(null)
      setInvoiceLineItems([])
    } catch (e) {
      setIsLoading(false)
      invoiceActionSheetRef.current?.setModalVisible(true)
      console.log(e)
    }
  }

  const onCreateSlipInvoice = async () => {
    slipScanActionSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      const res = await API.post('/admin/slip/invoice', {slipId, invoiceOwnerId: invoiceOwner, invoiceOwnerName: invoiceOwnerName, lineItems: invoiceLineItems});

      if (res.isError) throw 'error';

      load();

      setLineItems([])
      setInvoiceOwner(null)
      setInvoiceOwnerName(null)
      setInvoiceLineItemAmount(0)
      setInvoiceLineItemRefName('')
      setInvoiceLineItemRefId('')
      setInvoiceLineItemRefCost('')
      setInvoiceLineItemRefQty('0')
      setSlipInvoice(res.data._i);
    } catch (e) {
      setIsLoading(false)
      slipScanActionSheetRef.current?.setModalVisible(true)
      console.log(e)
    }
  }

  const FormatLineName = (name) => {

    if (name === 'Topical:La Herencia Del Abuelo Artisanal Rubbing Alcohol') return 'La Herencia Del Abuelo Alcohol'

    if  (name === 'Topical:La Herencia Del Abuelo Topical Cream') return 'La Herencia Del Abuelo Cream'

    if (name === 'Topical:La Herencia Del Abuelo Rubbing Artisanal Alcohol Roll- On') return 'La Herencia Del Abuelo Roll-on'

    return name.split(":").length > 1 ? name.split(":")[1] : name
  }

  const FormatLineItemName = (name) => {
    if (name === 'La Herencia Del Abuelo Artisanal Rubbing Alcohol') return 'Artisanal Rubbing Alcohol'

    if  (name === 'La Herencia Del Abuelo Topical Cream') return 'Topical Cream'

    if (name === 'La Herencia Del Abuelo Rubbing Artisanal Alcohol Roll- On') return 'Artisanal Rubbing Roll-on'

    return name
  }

  React.useEffect(() => {
    if (!slipId) return;

    API.get('/admin/slip', {identifier: slipId}).then(res => {
      if (res.isError) throw 'error';

      setSlipLineItems(res.data._s.products)
      setSlipInvoice(res.data._i ? res.data._i[0] : null)

      if (!res.data._i) {
        let item = lineItems.find(l => l.Id == res.data._s.products[0].product.quickbooksId)

        setInvoiceOwner(res.data._s.distributor.quickbooksId);
        setInvoiceOwnerName(res.data._s.distributor.name);
        setInvoiceLineItemAmount(res.data._s.products[0].quantity * item.UnitPrice)
        setInvoiceLineItemRefName(item.Name)
        setInvoiceLineItemRefId(item.Id)
        setInvoiceLineItemRefCost(item.UnitPrice.toString())
        setInvoiceLineItemRefQty(res.data._s.products[0].quantity.toString())

        slipScanActionSheetRef.current?.setModalVisible(true)
      } else {
        slipInvoiceActionSheetRef.current?.setModalVisible(true)
      }
    }).catch(error => {
      console.log(error)
    })
  }, [slipId])

  React.useEffect(() => {
    if (!slipInvoice) return;

    slipInvoiceActionSheetRef.current?.setModalVisible(true)
  }, [slipInvoice])

  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
    })();
  }, []);

  React.useEffect(() => {
    load()
  }, [oathToken])

  React.useEffect(() => {
    LoadQuickbooksAuth()
  }, [])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        {/* <TouchableOpacity
          onPress={() => navigation.navigate('InboxSlips')}
          underlayColor='#fff'>
          <Feather name="file-text" size={24} color={stylesheet.Primary} />
        </TouchableOpacity> */}
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Invoices {invoices.length > 0 ? `(${invoices.length})` : ''}</Text>
        <View style={styles.spacer}></View>
        {
          invoices.length > 0 &&
          <>
            {/* <TouchableOpacity
              onPress={() => setShowScanner(true)}
              underlayColor='#fff'
              style={{marginLeft: 10}}>
              <Feather name="maximize" size={24} color={stylesheet.Primary} />
            </TouchableOpacity> */}
            <TouchableOpacity
              onPress={() => invoiceActionSheetRef.current?.setModalVisible(true)}
              underlayColor='#fff'
              style={{marginLeft: 10}}>
              <Feather name="plus" size={24} color={stylesheet.Primary} />
            </TouchableOpacity>
          </>
        }
      </View>
      <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'flex-start', justifyContent: 'flex-start', width: '96%', marginLeft: '2%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
              }}
              source={require('..//assets/9511-loading.json')}
              // OR find more Lottie files @ https://lottiefiles.com/featured
              // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
            />
        }

        {
          !oathToken &&
          <TouchableOpacity onPress={() => QuickbooksAuth()} style={[styles.defaultColumnContainer, styles.center, styles.fullWidth]}>
            <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Tap to Authenticate with Quickbooks</Text>
            <Feather name="link" size={36} color="black" style={{marginTop: 30}} />
          </TouchableOpacity>
        }

        {
          !isLoading && invoicesProgress.labels.length > 0 &&
          <>
            <View style={[styles.defaultRowContainer, styles.marginWidth, styles.center, {flexWrap: 'wrap'}]}>

              {
                dailySales > 0 &&
                <AnimatedCircularProgress
                  size={130}
                  width={10}
                  fill={(dailySales / goals[0])*100}
                  tintColor="#90EE90"
                  style={{margin: 10}}
                  backgroundColor="#F0F0F0">
                  {
                    (fill) => (
                      <>
                        <Text style={{color: "#90EE90", fontSize: 20, fontWeight: 'bold'}}>
                          ${ dailySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
                        </Text>
                        <Text>
                          Daily
                        </Text>
                      </>
                    )
                  }
                </AnimatedCircularProgress>
              }
              {
                weeklySales > 0 &&
                <AnimatedCircularProgress
                  size={130}
                  width={10}
                  fill={(weeklySales / goals[1])*100}
                  tintColor="#90EE90"
                  style={{margin: 10}}
                  backgroundColor="#F0F0F0">
                  {
                    (fill) => (
                      <>
                        <Text style={{color: "#90EE90", fontSize: 20, fontWeight: 'bold'}}>
                          ${ weeklySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
                        </Text>
                        <Text>
                          Weekly
                        </Text>
                      </>
                    )
                  }
                </AnimatedCircularProgress>
              }
              {
                monthlySales > 0 &&
                <AnimatedCircularProgress
                  size={130}
                  width={10}
                  fill={(monthlySales / goals[2])*100}
                  tintColor="#90EE90"
                  style={{margin: 10}}
                  backgroundColor="#F0F0F0">
                  {
                    (fill) => (
                      <>
                        <Text style={{color: "#90EE90", fontSize: 20, fontWeight: 'bold'}}>
                          ${ monthlySales.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
                        </Text>
                        <Text>
                          Monthly
                        </Text>
                      </>
                    )
                  }
                </AnimatedCircularProgress>
              }
            </View>
            {/* <ProgressChart
              data={{
                labels: invoicesProgress.labels, // optional
                data: invoicesProgress.data
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
            /> */}
          </>
        }

        {
          !isLoading && invoices.map((invoice) => {
            return (
              <View style={[styles.fullInvoice]}>
                <View style={[styles.defaultRowContainer, styles.fullWidth, {padding: 10}]}>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Bill To</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.CustomerRef.name}</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.ShipAddr?.Line1}</Text>
                    {
                      invoice.ShipAddr?.City &&
                      <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{invoice.ShipAddr?.City}, {invoice.ShipAddr?.CountrySubDivisionCode} {invoice.ShipAddr?.PostalCode}</Text>
                    }
                  </View>
                  <View style={[styles.spacer]}></View>
                  <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
                </View>
                <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 15, padding: 10}]}>
                  {
                    invoice.Line.slice().filter(line => line.DetailType === 'SalesItemLineDetail').map(line => {
                      return (
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatLineName(line.SalesItemLineDetail?.ItemRef?.name)}</Text>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.SalesItemLineDetail?.Qty} x ${line.SalesItemLineDetail?.UnitPrice}</Text>
                        </View>
                      )
                    })
                  }
                </View>
                <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                  <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${invoice.Balance.toFixed(2)}</Text>
                    </View>
                    <View style={styles.spacer}></View>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>Due: {invoice.DueDate}</Text>
                    </View>
                  </View>
                  <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                    <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${invoice.TotalAmt.toFixed(2)}</Text>
                    <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center, {marginTop: 5}]}>{invoice.BillEmail?.Address}</Text>
                  </View>
                  <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                    <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>#{invoice.DocNumber || invoice.Id}</Text>
                  </View>
                  <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, marginTop: 10}]}>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetPrintableURI(invoice.Id)}>
                      <Feather name="printer" size={28} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetShareableURI(invoice.Id)}>
                      <Feather name="share" size={28} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => setSlipInvoice(invoice)}>
                      <Feather name="eye" size={28} color="black" />
                    </TouchableOpacity>
                    {
                      !topups.includes(invoice.Id) &&
                      <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => TopUpDelivery(invoice)}>
                        <Feather name="truck" size={28} color="black" />
                      </TouchableOpacity>
                    }
                  </View>
                </View>
              </View>
            )
          })
        }

      </ScrollView>
      {
        showScanner &&
        <BarCodeScanner barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]} onBarCodeScanned={({type, data}) => {setShowScanner(false); setSlipId(data)}} style={{position: 'absolute', top: '0%', left: 0, height: '110%', width: '100%'}}/>
      }
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={invoiceActionSheetRef}>
        <View>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onAddLineItem()} disabled={!invoiceLineItemRefId}>
              <Feather name="plus" style={{opacity: !invoiceLineItemRefId ? 0.2 : 1}} size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.spacer}></View>
            <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => {setInvoiceOwner(null); setInvoiceOwnerName(null)}}>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>New Invoice {invoiceOwner ? `for ${invoiceOwnerName}`: ''}</Text>
            </TouchableOpacity>
            <View style={styles.spacer}></View>
            {
                invoiceLineItems.length > 0 &&
                <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onCreateInvoice()}>
                  <Feather name="file-plus" size={24} color="black" />
                </TouchableOpacity>
            }
          </View>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            {
              !invoiceOwner &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Distributor</Text>
                <TextInput
                  style={[{marginTop: 25,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Find distributor..."
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
                        <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setInvoiceOwner(distributor.quickbooksId); setInvoiceOwnerName(distributor.company)}}>
                          <Text style={[styles.baseText, styles.tertiary]}>{distributor.company} - {distributor.managers.join(', ')}</Text>
                        </TouchableOpacity>
                      )
                    })
                  }
                </ScrollView>
              </>
            }

            {
              invoiceOwner &&
              <>
                {
                  invoiceLineItems.length > 0 &&
                  <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Items</Text>
                }
                {
                  invoiceLineItems.map((invoiceLineItem) => {
                    return (
                      <>
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{invoiceLineItem.SalesItemLineDetail.ItemRef.name}</Text>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{invoiceLineItem.SalesItemLineDetail.Qty} x ${invoiceLineItem.SalesItemLineDetail.UnitPrice}</Text>
                        </View>
                      </>
                    )
                  })
                }

                {/* NEW LINE ITEM */}
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 40}]}>Quantity</Text>
                <TextInput
                  style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter quantity..."
                  keyboardType="numeric"
                  value={invoiceLineItemRefQty}
                  onChangeText={(text) => {
                    setInvoiceLineItemRefQty(text)
                    setInvoiceLineItemAmount(parseFloat(invoiceLineItemRefCost) * parseInt(text))
                  }}
                />

                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Cost</Text>
                <TextInput
                  style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter cost..."
                  keyboardType="numeric"
                  value={invoiceLineItemRefCost}
                  onChangeText={(text) => {
                    setInvoiceLineItemRefCost(text);
                    setInvoiceLineItemAmount(parseFloat(text) * parseInt(invoiceLineItemRefQty))
                  }}
                />

                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Line Item</Text>
                <Picker
                  style={{marginTop: 0, paddingTop: 0, marginBottom: 20}}
                  selectedValue={invoiceLineItemRefId}
                  onValueChange={(itemValue, itemIndex) =>
                    {
                      setInvoiceLineItemRefId(itemValue)
                      setInvoiceLineItemRefCost(lineItems[itemIndex].UnitPrice.toFixed(2))
                      setInvoiceLineItemAmount(parseFloat(lineItems[itemIndex].UnitPrice) * parseInt(invoiceLineItemRefQty))
                    }
                  }>
                  {
                    lineItems.map(lineItem => {
                      return (
                        <Picker.Item label={FormatLineItemName(lineItem.Name)} value={lineItem.Id} />
                      )
                    })
                  }
                </Picker>
              </>
            }
          </View>
        </View>
      </ActionSheet>
      <ActionSheet onClose={() => setSlipId(null)} containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={slipScanActionSheetRef}>
        <View style={{paddingBottom: 50}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => {}}>
              <Feather name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Create Invoice for Slip #{slipId ? slipId.slice(-4) : ''}</Text>
            <View style={styles.spacer}></View>
            {
              slipLineItems.length >= 1 &&
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onAddLineItem(true)}>
                <Feather name="chevron-right" size={24} color="black" />
              </TouchableOpacity>
            }
          </View>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            {
              slipLineItems.length !== 0 &&
              <>
                <Text style={[styles.baseText, styles.tertiary, styles.centerText, {marginTop: 10}]}>Enter Price for <Text style={styles.bold}>{invoiceLineItemRefQty} {invoiceLineItemRefName}s</Text></Text>
                <Text style={[styles.baseText, styles.tertiary, styles.opaque, styles.centerText, {marginTop: 10}]}>{slipLineItems[0].note}</Text>
                <TextInput
                  style={[styles.baseInput, {marginTop: 5,  marginBottom: 20, fontSize: 30, width: '100%'}]}
                  placeholder="Enter price..."
                  keyboardType="numeric"
                  value={invoiceLineItemRefCost}
                  onChangeText={(text) => {
                    setInvoiceLineItemRefCost(text);
                    setInvoiceLineItemAmount(parseFloat(text) * parseInt(invoiceLineItemRefQty))
                  }}
                />
              </>
            }
            {
                slipLineItems.length == 0 &&
                <>
                  <Text style={[styles.baseText, styles.bold, styles.tertiary, styles.centerText, {marginTop: 10}]}>Invoice Ready to Be Created</Text>
                  <TouchableOpacity onPress={onCreateSlipInvoice} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 20, marginBottom: 20}]}>
                    <Text style={[styles.secondary,  styles.bold]}>Create Invoice</Text>
                  </TouchableOpacity>
                </>
            }
          </View>
        </View>
      </ActionSheet>
      <ActionSheet onClose={() => setSlipInvoice(null)} containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={slipInvoiceActionSheetRef}>
        <View>
          {
            slipInvoice &&
            <>
              <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                <View style={styles.spacer}></View>
                <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Invoice #{slipInvoice.DocNumber || slipInvoice.Id}</Text>
                <View style={styles.spacer}></View>
              </View>
            <View style={styles.line}></View>
              <View style={[styles.defaultRowContainer, styles.fullWidth, {padding: 10}]}>
                <View style={[styles.defaultColumnContainer]}>
                  <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Bill To</Text>
                  <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slipInvoice?.CustomerRef?.name}</Text>
                  <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slipInvoice.ShipAddr?.Line1}</Text>
                  {
                    slipInvoice.ShipAddr?.City &&
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slipInvoice.ShipAddr?.City}, {slipInvoice.ShipAddr?.CountrySubDivisionCode} {slipInvoice.ShipAddr?.PostalCode}</Text>
                  }
                </View>
                <View style={[styles.spacer]}></View>
                <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
              </View>
              <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 15, padding: 10}]}>
                {
                  slipInvoice.Line && slipInvoice.Line.slice().filter(line => line.DetailType === 'SalesItemLineDetail').map(line => {
                    return (
                      <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                        <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatLineName(line.SalesItemLineDetail?.ItemRef?.name)}</Text>
                        <View style={styles.spacer}></View>
                        <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.SalesItemLineDetail?.Qty} x ${line.SalesItemLineDetail?.UnitPrice}</Text>
                      </View>
                    )
                  })
                }
              </View>
              <View style={[styles.defaultColumnContainer, styles.fullWidth, {padding: 10}]}>
                <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${slipInvoice.Balance}</Text>
                  </View>
                  <View style={styles.spacer}></View>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>Due: {slipInvoice.DueDate}</Text>
                  </View>
                </View>
                <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                  <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${slipInvoice.TotalAmt}</Text>
                  <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center, {marginTop: 5}]}>{slipInvoice.BillEmail?.Address}</Text>
                </View>
                <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, marginTop: 10}]}>
                  <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetPrintableURI(slipInvoice.Id)}>
                    <Feather name="printer" size={28} color="black" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetShareableURI(slipInvoice.Id)}>
                    <Feather name="share" size={28} color="black" />
                  </TouchableOpacity>
                  {
                    !topups.includes(slipInvoice.Id) &&
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => TopUpDelivery(slipInvoice)}>
                      <Feather name="truck" size={28} color="black" />
                    </TouchableOpacity>
                  }
                </View>
              </View>
            </>
          }
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
