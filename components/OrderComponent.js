import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";

import API from '../Api'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();

export default function OrderComponent({navigation, route}) {
  const [order, setOrder] = React.useState([])
  const animationRef = React.useRef(null)
  const fulfilledRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const load = async () => {
    setIsLoading(true)
    setOrder({})

    try {
      const res = await API.get('/admin/order', {identifier: route.params.identifier});

      if (res.isError) throw 'error';

      setOrder(res.data._o)
      setIsLoading(false)
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


  const getType = (t) => {
    switch (t) {
      case 'oil':
        return 'Oil'
      case 'gummies':
        return 'Gummies'
      default:
        return ''
    }
  }

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          underlayColor='#fff'>
          <Feather name="chevron-left" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Order #{route.params.identifier}</Text>
        <View style={styles.spacer}></View>
        <Feather name="chevron-left" size={24} color={stylesheet.Secondary} />
      </View>
      <ScrollView style={[styles.defaultTabScrollContent]} contentContainerStyle={{alignItems: 'center', width: '90%', marginLeft: '5%', paddingBottom: 64, justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap'}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
                maxWidth: 150
              }}
              source={require('../assets/loading-leaf.json')}
            />
        }
        {
          !isLoading &&
          <>
            {
              order.fulfilled &&
              <View style={[styles.fullWidth, styles.center]}>
                <LottieView
                  ref={fulfilledRef}
                  style={{
                    justifyContent: 'center',
                    height: 200,
                    backgroundColor: '#fff',
                    maxWidth: 150
                  }}
                  autoPlay={true}
                  loop
                  source={require('../assets/33886-check-okey-done.json')}
                />
              </View>
            }
            <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10, marginBottom: 15}]}>Products</Text>
            {
              order.products.map(product => {
                return (
                  <TouchableOpacity activeOpacity={1} key={product._id} style={styles.defaultStoreCard}>
                    <View style={[styles.defaultSCImage, styles.flexible, styles.center, {height: 170}]}>
                      <Image style={styles.defaultSCImage} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto/${product.product.shots[0]}`}} />
                    </View>
                    <View style={styles.defaultColumnContainer, styles.fullWidth, styles.defaultSCContent}>
                      <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                        <View style={[styles.defaultColumnContainer]}>
                          <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.tertiary, {marginBottom: 2}]}>{getType(product.product.identifier)}</Text>
                        </View>
                      </View>
                      <View style={[styles.spacer, styles.defaultRowContainer, styles.fullWidth, {alignItems: 'center'}]}>
                        <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{product.product.serie.name}</Text>
                      </View>
                      <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                        <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>x {product.quantity}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })
            }
            <View style={[styles.defaultColumnContainer, styles.marginWidth, {alignItems: 'flex-start', marginBottom: 60}]}>
              <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.tertiary, {marginTop: 10, marginBottom: 10}]}>Ship To:</Text>
              <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.buyer.fullname}</Text>
              <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.buyer.email}</Text>
              <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.address.line1}</Text>
              <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{order.address.line2}</Text>
            </View>
            <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>Subtotal: <Text style={styles.primary}>${order.subtotal}</Text></Text>
            <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>Tax: <Text style={styles.primary}>${order.tax}</Text></Text>
            <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>Shipping: <Text style={styles.primary}>${order.shipping}</Text></Text>
            <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10}]}>Total: <Text style={styles.primary}>${order.total}</Text></Text>
          </>
        }
      </ScrollView>
    </SafeAreaView>
  );
}
