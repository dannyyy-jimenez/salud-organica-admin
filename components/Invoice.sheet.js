import React from 'react'
import ActionSheet from "react-native-actions-sheet";
import { Linking, Platform, ScrollView, Dimensions, Switch, Pressable, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { FormatProductNameLong, FormatIdentifier } from './Globals'
import { Feather } from '@expo/vector-icons';
import API from '../Api'
import * as Print from 'expo-print';
import {Buffer} from "buffer";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Distributor } from './Globals'
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarCodeScanner } from 'expo-barcode-scanner';
import LottieView from 'lottie-react-native';
import {SheetManager} from 'react-native-actions-sheet';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

export function NewInvoiceSheet(props) {
  const [invoiceOwnerIdentifier, setInvoiceOwnerIdentifier] = React.useState('')
  const [nearestDist, setNearestDist] = React.useState(null)
  const [distributorSearch, setDistributorSearch] = React.useState('')
  const [distributors, setDistributors] = React.useState([])
  const [products, setProducts] = React.useState([])
  const [invoiceAddMode, setInvoiceAddMode] = React.useState(false)
  const [location, setLocation] = React.useState(null);

  const [invoiceLine, setInvoiceLine] = React.useState([])
  const [invoiceLineItemRefIdentifier, setInvoiceLineItemRefIdentifier] = React.useState('')
  const [invoiceLineItemRefQty, setInvoiceLineItemRefQty] = React.useState('')
  const [invoiceLineItemRefCost, setInvoiceLineItemRefCost] = React.useState('')
  const [invoiceLineItemRefLot, setInvoiceLineItemRefLot] = React.useState('')
  const [invoiceLineItemRefAmount, setInvoiceLineItemRefAmount] = React.useState('')
  const [invoiceRec, setInvoiceRec] = React.useState({})
  const [invoiceAddScanMode, setInvoiceAddScanMode] = React.useState(false)
  const [invoiceAddSearchMode, setInvoiceAddSearchMode] = React.useState(false)
  const [recentBatchNumber, setRecentBatchNumber] = React.useState('')

  const [isLoading, setIsLoading] = React.useState(true)

  const load = async () => {
    try {
      const res = await API.get('/admin/distributors', {});
      if (res.isError) throw 'error';

      let dists = res.data._d.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, location?.coords))
      setDistributors(dists)
      setProducts(res.data.products);
      let closest = dists.sort((a, b) => a.distance - b.distance)[0]
      if (closest.distance < 0.008) {
        setNearestDist(closest)
      }
      if (props.payload?.client) {
        setInvoiceOwnerIdentifier(props.payload?.client)
      }
      if (props.payload?.editMode) {
        loadEditorMode(props.payload?.editing)
      }
      setIsLoading(false)
    } catch (e) {
      setIsLoading(false)
      console.log('e', e)
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

  const onCreateInvoice = async () => {
    setIsLoading(true)

    try {
      const res = await API.post('/admin/distributor/invoice', {ownerIdentifier: invoiceOwnerIdentifier, line: invoiceLine});

      if (res.isError) throw 'error';

      await SheetManager.hide('New-Invoice-Sheet', {
        payload: res.data._identifier
      })
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onUpdateInvoice = async () => {
    setIsLoading(true)

    try {
      const res = await API.post('/admin/invoice/actions/edit', {identifier: props.payload?.editing.identifier, ownerIdentifier: invoiceOwnerIdentifier, line: invoiceLine});

      if (res.isError) throw 'error';

      await SheetManager.hide('New-Invoice-Sheet')

      setTimeout(() => {
        SheetManager.show('Invoice-Sheet', {
          payload: {
            invoice: res.data._invoice,
            delivered: false,
            created: false
          }
        })
      }, 500)
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
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

  const onInvoiceLineRemove = async (idx) => {
    let copied = invoiceLine.slice();
    copied.splice(idx, 1)
    setInvoiceLine(copied)
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

  const loadEditorMode = (invoice) => {
    setInvoiceOwnerIdentifier(invoice.distributor.identifier)
    let line = []
    for (let item of invoice.line) {
      line.push({
        identifier: item.product.identifier,
        quantity: item.quantity,
        cost: (item.rate / 1000).toFixed(2),
        lot: item.lot,
        amount: item.amount / 1000
      })
    }
    setInvoiceLine(line)
  }

  React.useEffect(() => {
    if (!location) return;

    load()
  }, [location])

  React.useEffect(() => {
    if (invoiceLineItemRefIdentifier == "" || invoiceLineItemRefCost !== "") return;

    setInvoiceLineItemRefCost(products.find(p => p.identifier === invoiceLineItemRefIdentifier).distributorPrice.toFixed(2))
    setInvoiceLineItemRefAmount(products.find(p => p.identifier === invoiceLineItemRefIdentifier).distributorPrice * parseInt(invoiceLineItemRefQty))
    getRecentBatch(invoiceLineItemRefIdentifier).then(lot => {
      setRecentBatchNumber(lot)
    })

  }, [invoiceLineItemRefIdentifier])

  React.useEffect(() => {
    (async () => {
      await BarCodeScanner.requestPermissionsAsync();
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync();
      console.log("LOC", location)
      setLocation(location);
    })();
  }, [])

  React.useEffect(() => {
    if (invoiceOwnerIdentifier == "") return;

    loadInvoiceRec()
  }, [invoiceOwnerIdentifier])

  return (
    <ActionSheet id={props.sheetId} headerAlwaysVisible={true} containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} onClose={() => {setInvoiceAddMode(false); setInvoiceOwnerIdentifier("")}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true}>
      <ScrollView scrollable={false} style={{paddingBottom: 40}}>
        <View style={[styles.defaultRowContainer, styles.fullWidth]}>
          <View style={styles.spacer}></View>
          <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => {setInvoiceOwnerIdentifier("")}}>
            {
              !props.payload?.editMode &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>New Invoice <Text style={styles.primary}>{invoiceOwnerIdentifier && distributors.find(d => d.identifier === invoiceOwnerIdentifier) ? `for ${distributors.find(d => d.identifier === invoiceOwnerIdentifier).company}`: ''}</Text></Text>
            }
            {
              props.payload?.editMode &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Editing Invoice <Text style={styles.primary}>#{props.payload?.editing.identifier}</Text></Text>
            }
          </TouchableOpacity>
          <View style={styles.spacer}></View>
        </View>
        <View style={styles.line}></View>
        <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
          {
            invoiceOwnerIdentifier === "" && nearestDist && distributors.length > 0 &&
            <>
              <Text style={[styles.subHeaderText, styles.bold, styles.tertiary, styles.centerText]}>Create invoice for nearest retailer?</Text>

              <Text style={[styles.baseText, styles.bold, styles.tertiary, styles.centerText, {marginTop: 40}]}>You're very close to {nearestDist.company}</Text>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 10}]}>
                <TouchableOpacity
                  onPress={() => setPromptInvoiceForNearestDist(false)}
                  underlayColor='#fff'
                  style={{marginLeft: 15, marginRight: 15}}>
                  <Feather name="x" size={32} color={stylesheet.Primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setInvoiceOwnerIdentifier(nearestDist.identifier)}
                  underlayColor='#fff'
                  style={{marginLeft: 15, marginRight: 15}}>
                  <Feather name="check" size={32} color={stylesheet.Primary} />
                </TouchableOpacity>
              </View>
            </>
          }

          {
            invoiceOwnerIdentifier === "" && !nearestDist && isLoading &&
            <>
              <LottieView
                  style={{
                    backgroundColor: '#fff',
                    width: '50%',
                    marginTop: 20,
                    marginLeft: '12%',
                    marginBottom: 40
                  }}
                  autoPlay
                  loop
                  source={require('../assets/loading-leaf.json')}
                  // OR find more Lottie files @ https://lottiefiles.com/featured
                  // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
                />
            </>
          }

          {
            invoiceOwnerIdentifier === "" && !nearestDist && !isLoading &&
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
                invoiceLine.length > 0 && !isLoading && !props.payload?.editMode &&
                <TouchableOpacity onPress={() => onCreateInvoice()} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 20}]}>
                  <Text style={[styles.secondary, styles.bold]}>Create Invoice</Text>
                </TouchableOpacity>
              }
              {
                invoiceLine.length > 0 && !isLoading && props.payload?.editMode &&
                <TouchableOpacity onPress={() => onUpdateInvoice()} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 20}]}>
                  <Text style={[styles.secondary, styles.bold]}>Update Invoice</Text>
                </TouchableOpacity>
              }
              {
                invoiceLine.length > 0 && isLoading &&
                <LottieView
                    style={{
                      backgroundColor: '#fff',
                      width: '50%',
                      marginTop: 20,
                      marginLeft: '12%',
                      marginBottom: 40
                    }}
                    autoPlay
                    loop
                    source={require('../assets/loading-wait.json')}
                    // OR find more Lottie files @ https://lottiefiles.com/featured
                    // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
                  />
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
                  <ScrollView style={{maxHeight: 700, marginTop: 10}} contentContainerStyle={[styles.defaultRowContainer, {flexWrap: 'wrap', justifyContent: 'space-around'}]}>
                    {
                      products.filter(p => p.sku).map(product => {
                        return (
                          <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setInvoiceLineItemRefIdentifier(product.identifier);}}>
                            <Image style={{ width: 80, height: 80, backgroundColor: product.identifier === invoiceLineItemRefIdentifier ? stylesheet.Primary : 'white'}} resizeMode="contain" source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto,w_100/' + product.shot}}></Image>
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
  )
}

export function InvoiceSheet(props) {
  const [showInvoiceReminders, setShowInvoiceReminders] = React.useState(props.payload?.created)
  const [confirmInvoiceDeleteMode, setConfirmInvoiceDeleteMode] = React.useState(false)
  const [invoicePaymentMode, setInvoicePaymentMode] = React.useState(false)
  const [invoiceRemindersSection, setInvoiceRemindersSection] = React.useState("PRINT")
  const [isLoading, setIsLoading] = React.useState(false)

  if (!props.payload?.invoice) {
    return (
      <>

      </>
    )
  }

  const onEditIntent = async () => {
    await SheetManager.hide('Invoice-Sheet', {
      payload: {

      }
    })

    setTimeout(() => {
      SheetManager.show('New-Invoice-Sheet', {
        payload: {
          editMode: true,
          editing: props.payload?.invoice
        }
      })
    }, 500)
  }

  const TopUpDelivery = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const res = await API.post('/admin/invoice/actions/topup', {identifier: props.payload?.invoice.distributor.identifier, invoiceId: props.payload?.invoice.identifier});
      if (res.isError) throw 'error';

      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const GetPrintableURI = async () => {
    setIsLoading(true)

    try {
      const res = await API.get('/admin/invoice/actions/printable', {id: props.payload?.invoice.identifier});
      if (res.isError) throw 'error';

      const buff = Buffer.from(res.data._f, 'utf-8')
      let pdf = buff.toString('utf-8')

      setIsLoading(false)

      await Print.printAsync({
        html: pdf
      });
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  return (
    <ActionSheet id={props.sheetId} containerStyle={{backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} onClose={() => {setConfirmInvoiceDeleteMode(false); setInvoicePaymentMode(false); setShowInvoiceReminders(false); setInvoiceRemindersSection("PRINT")}}>
      {
        showInvoiceReminders && invoiceRemindersSection === "PRINT" &&
        <View style={{padding: 15, marginBottom: 40}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
            <View style={styles.spacer}></View>
          </View>

          <TouchableOpacity onPress={() => GetPrintableURI(props.payload?.invoice.identifier)} style={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
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
        showInvoiceReminders && invoiceRemindersSection === "DELIVERY" &&
        <View style={{padding: 15, marginBottom: 40}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
            <View style={styles.spacer}></View>
          </View>

          <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center]}>
            <Feather name="truck" size={36} color="black" />
          </View>
          <Text style={[styles.subHeaderText, styles.bold, styles.centerText, styles.tertiary]}>Don't forget to mark as delivered</Text>

          <TouchableOpacity onPress={() => {TopUpDelivery(props.payload?.invoice); setInvoiceRemindersSection("PICTURE")}} style={[styles.roundedButton, styles.filled, {marginLeft: '7.5%', marginTop: 30}]}>
            <Text style={[styles.secondary, styles.bold]}>Delivered!</Text>
          </TouchableOpacity>
        </View>
      }
      {
        showInvoiceReminders && invoiceRemindersSection === "PICTURE" &&
        <View style={{padding: 15, marginBottom: 40}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth, {marginBottom: 40}]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
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
        !showInvoiceReminders && !confirmInvoiceDeleteMode && !invoicePaymentMode &&
        <View style={{padding: 15}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
            <View style={styles.spacer}></View>
          </View>
          {
            props.payload?.invoice.paid &&
            <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>PAID</Text>
          }
          {
            !props.payload?.invoice.paid && props.payload?.invoice.dueDays > 1 &&
            <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>Due in {props.payload?.invoice.dueDays} days</Text>
          }
          {
            !props.payload?.invoice.paid && props.payload?.invoice.dueDays == 1 &&
            <Text style={[styles.baseText, styles.primary, styles.bold, styles.center, {marginTop: 10}]}>Due in {props.payload?.invoice.dueDays} day</Text>
          }
          {
            !props.payload?.invoice.paid && props.payload?.invoice.dueDays == 0 &&
            <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Due Today</Text>
          }
          {
            !props.payload?.invoice.paid && props.payload?.invoice.dueDays == -1 &&
            <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Overdue {props.payload?.invoice.dueDays * -1} day</Text>
          }
          {
            !props.payload?.invoice.paid && props.payload?.invoice.dueDays < -1 &&
            <Text style={[styles.baseText, styles.bold, styles.center, {color: 'red', marginTop: 10}]}>Overdue {props.payload?.invoice.dueDays * -1} days</Text>
          }
          <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 25}]}>
            <View style={[styles.defaultColumnContainer]}>
              <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Bill To</Text>
              <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{props.payload?.invoice.distributor.managers.join(' or ')}</Text>
              <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{props.payload?.invoice.distributor.company}</Text>
              <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{props.payload?.invoice.distributor.address.line1}</Text>
              <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{props.payload?.invoice.distributor.address.rest}</Text>
            </View>
            <View style={[styles.spacer]}></View>
            <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
          </View>
          <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 5}]}>
            {
              props.payload?.invoice.line.map(line => {
                return (
                  <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                    <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatProductNameLong(line.product)} (#{line.lot})</Text>
                    <View style={styles.spacer}></View>
                    {
                      line.rate === 0 &&
                      <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x FREE</Text>
                    }
                    {
                      line.rate != 0 && line.rate.toString().includes(".") &&
                      <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x ${line.rate}</Text>
                    }
                    {
                      line.rate != 0 && !line.rate.toString().includes(".") &&
                      <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x ${line.rate / 1000}</Text>
                    }
                  </View>
                )
              })
            }
          </View>
          {
            props.payload?.invoice.payments && props.payload?.invoice.payments.length > 0 &&
            <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginBottom: 40}]}>
              {
                props.payload?.invoice.payments.map(payment => {
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
                <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${props.payload?.invoice.balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
              </View>
              <View style={styles.spacer}></View>
              <View style={[styles.defaultColumnContainer]}>
                <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>Due: {props.payload?.invoice.due}</Text>
              </View>
            </View>
            <View style={[styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
              <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${props.payload?.invoice.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
            </View>
            <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30, marginBottom: 20}]}>
              {
                !props.payload?.delivered && props.payload?.topup &&
                <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => props.payload?.topup()}>
                  <Feather name="truck" size={28} color="black" />
                  <Text style={{marginTop: 5, fontSize: 12}}>Delivered</Text>
                </TouchableOpacity>
              }
              {
                !props.payload?.delivered &&
                <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={onEditIntent}>
                  <Feather name="edit" size={28} color="black" />
                  <Text style={{marginTop: 5, fontSize: 12}}>Edit</Text>
                </TouchableOpacity>
              }
              {/* {
                !props.payload?.invoice.paid &&
                <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => setInvoicePaymentMode(true)}>
                  <Feather name="dollar-sign" size={28} color="black" />
                  <Text style={{marginTop: 5, fontSize: 12}}>Payment</Text>
                </TouchableOpacity>
              } */}
              <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => setConfirmInvoiceDeleteMode(true)}>
                <Feather name="trash-2" size={28} color="red" />
                <Text style={{marginTop: 5, fontSize: 12, color: "red"}}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
      {
        invoicePaymentMode &&
        <View style={{padding: 15, paddingBottom: 45}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
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
              <View style={[styles.defaultRowContainer, styles.marginWidth]}>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>
                  Amount Paid
                </Text>
                <View style={[styles.spacer]}></View>
                <Pressable onPress={() => setInvoicePaymentAmount(props.payload?.invoice.balance.toFixed(2))}>
                  <Text style={[styles.baseText, styles.bold, styles.primary]}>FULL ${props.payload?.invoice.balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                </Pressable>
              </View>
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

              <Text style={[styles.baseText, styles.bold, styles.marginWidth, styles.tertiary, {marginTop: 20}]}>Pending Balance: ${(props.payload?.invoice.balance - (isNaN(parseFloat(invoicePaymentAmount)) ? 0 : parseFloat(invoicePaymentAmount))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>

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
        confirmInvoiceDeleteMode &&
        <View style={{padding: 15}}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary]}>Invoice #{props.payload?.invoice.identifier}</Text>
            <View style={styles.spacer}></View>
          </View>
          <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 25, marginBottom: 10}]}>Are you sure you want to delete this invoice?</Text>
          <Text style={[styles.tinyText, styles.centerText, styles.tertiary, styles.bold, styles.opaque, {marginBottom: 20}]}>Press trash icon to confirm</Text>
          <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {backgroundColor: 'white', paddingBottom: 0}}>
            <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 10}]}>
              <TouchableOpacity style={{marginLeft: 15, marginRight: 15, marginBottom: 20}} onPress={() => props.payload.delete()}>
                <Feather name="trash-2" size={40} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
    </ActionSheet>
  )
}
