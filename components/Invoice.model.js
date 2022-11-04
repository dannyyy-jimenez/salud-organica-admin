import React from 'react'
import { Linking, Platform, ScrollView, Dimensions, Switch, Pressable, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import API from '../Api'
import * as Print from 'expo-print';
import {Buffer} from "buffer";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import moment from 'moment';
moment().format();
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormatProductNameLong } from './Globals'
import {SheetManager} from 'react-native-actions-sheet';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const invoiceActionSheetRef = React.createRef();

export default function InvoiceModel(props) {
  const animationRef = React.useRef(null)
  const [invoice, setInvoice] = React.useState(props.data)
  const [delivered, setDelivered] = React.useState(props.topups?.includes(props.data.identifier))
  const [isLoading, setIsLoading] = React.useState(false)
  const [deleted, setDeleted] = React.useState(false)

  React.useEffect(() => {
    if (typeof props.topups == "undefined") return;

    setDelivered(props.topups.includes(invoice.identifier))
  }, [props.topups])

  const openInvoice = () => {
    SheetManager.show('Invoice-Sheet', {
      payload: {
        invoice: invoice,
        delivered: delivered,
        topup: TopUpDelivery,
        delete: onDeleteInvoice
      }
    })
  }

  const GetPrintableURI = async () => {
    setIsLoading(true)

    try {
      const res = await API.get('/admin/invoice/actions/printable', {id: invoice.identifier});

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

  const GetPdfURI = async () => {
    setIsLoading(true)

    try {
      const res = await API.get('/admin/invoice/actions/pdf', {id: invoice.identifier});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-invoice_${invoice.identifier}.pdf`;

      const buff = Buffer.from(res.data._f, 'base64')
      let pdf = buff.toString('base64')
      await FileSystem.writeAsStringAsync(fileUri, pdf, { encoding: FileSystem.EncodingType.Base64 });

      setIsLoading(false)

      await Sharing.shareAsync(fileUri);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const GetShareableUri = async () => {
    setIsLoading(true)

    try {
      const res = await API.get('/admin/invoice/actions/shareable', {id: invoice.identifier});

      if (res.isError) throw 'error';

      const result = await Share.share({
        message: res.data._txt,
      });
      setIsLoading(false)
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const TopUpDelivery = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {

      const res = await API.post('/admin/invoice/actions/topup', {identifier: invoice.distributor.identifier, invoiceId: invoice.identifier});
      if (res.isError) throw 'error';

      setDelivered(true)

      SheetManager.hide('Invoice-Sheet')

      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }

  const onDeleteInvoice = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {

      const res = await API.post('/admin/invoice/actions/delete', {identifier: invoice.identifier});

      if (res.isError) throw 'error';

      setIsLoading(false);
      SheetManager.hide('Invoice-Sheet')
      setDeleted(true);
    } catch (e) {
      setIsLoading(false);
      console.log(e)
    }
  }


  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  if (deleted) {
    return (
      <></>
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.fullInvoice, styles.elevated, styles.center]}>
        <LottieView
            ref={animationRef}
            style={{
              width: '100%',
              backgroundColor: '#fff',
            }}
            loop={true}
            autoPlay
            source={require('../assets/loading-leaf.json')}
          />
      </View>
    )
  }

  return (
    <>
      <Pressable onPress={openInvoice} style={[styles.fullInvoice, styles.elevated]}>
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
        <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.spacer, {marginTop: 20, marginBottom: 15, padding: 10}]}>
          {
            invoice.line.map(line => {
              return (
                <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                  <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatProductNameLong(line.product)}</Text>
                  <View style={styles.spacer}></View>
                  {
                    line.rate === 0 &&
                    <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x FREE</Text>
                  }
                  {
                    line.rate != 0 &&
                    <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{line.quantity} x ${(line.rate / 1000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
                  }
                </View>
              )
            })
          }
        </View>
        <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={[styles.defaultColumnContainer]}>
              <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>Balance: ${invoice.balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
            </View>
            <View style={styles.spacer}></View>
            <View style={[styles.defaultColumnContainer]}>
              <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}></Text>
            </View>
          </View>
          <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
            <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>Total: ${invoice.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Text>
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
              <Text style={[styles.tinyText, styles.bold, styles.center, {color: 'white', marginTop: 2}]}>PAID {invoice.payments.length > 0 ? invoice.payments[0].date : ''}</Text>
            </View>
          }
          <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: invoice.dueDays > 0 || invoice.paid ? stylesheet.Primary : 'red'}}>
            <Text style={[styles.tinyText, styles.secondary, styles.bold, {marginTop: 2}]}>
              #{invoice.identifier}
            </Text>
          </View>
          <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, marginTop: 10, marginBottom: 20}]}>
            <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={GetPrintableURI}>
              <Feather name="printer" size={28} color="black" />
              <Text style={{marginTop: 5, fontSize: 12}}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={GetPdfURI}>
              <AntDesign name="pdffile1" size={28} color="black" />
              <Text style={{marginTop: 5, fontSize: 12}}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={GetShareableUri}>
              <Feather name="type" size={28} color="black" />
              <Text style={{marginTop: 5, fontSize: 12}}>Text</Text>
            </TouchableOpacity>
            {
              !delivered &&
              <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={TopUpDelivery}>
                <Feather name="truck" size={28} color="black" />
                <Text style={{marginTop: 5, fontSize: 12}}>Delivered</Text>
              </TouchableOpacity>
            }
          </View>
        </View>
      </Pressable>
    </>
  )
}
