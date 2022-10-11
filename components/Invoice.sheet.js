import React from 'react'
import ActionSheet from "react-native-actions-sheet";
import { Linking, Platform, ScrollView, Dimensions, Switch, Pressable, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { FormatProductNameLong } from './Globals'
import { Feather } from '@expo/vector-icons';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

export default function InvoiceSheet(props) {
  const [showInvoiceReminders, setShowInvoiceReminders] = React.useState(false)
  const [confirmInvoiceDeleteMode, setConfirmInvoiceDeleteMode] = React.useState(false)
  const [invoicePaymentMode, setInvoicePaymentMode] = React.useState(false)
  const [invoiceRemindersSection, setInvoiceRemindersSection] = React.useState("PRINT")

  if (!props.payload?.invoice) {
    return (
      <>

      </>
    )
  }

  return (
    <ActionSheet headerAlwaysVisible  animated id={props.sheetId} containerStyle={{backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} onClose={() => {setConfirmInvoiceDeleteMode(false); setInvoicePaymentMode(false); setShowInvoiceReminders(false); setInvoiceRemindersSection("PRINT")}}>
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
