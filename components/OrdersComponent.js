import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import API from '../Api'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const orderActionSheet = React.createRef();

export default function OrdersComponent({navigation}) {
  const [orders, setOrders] = React.useState([])
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [sortBy, setSortBy] = React.useState("newest");
  const [showFulfilled, setShowFulfilled] = React.useState(false);
  const [orderIdentifier, setOrderIdentifier] = React.useState(null)
  const [order, setOrder] = React.useState(null)
  const [isLoadingOrder, setIsLoadingOrder] = React.useState(false)

  const load = async () => {
    setIsLoading(true)
    setOrders([])

    try {
      const res = await API.get('/admin/orders', {sortBy, showFulfilled});

      if (res.isError) throw 'error';

      setOrders(res.data._o)
      setIsLoading(false)
    } catch (e) {
      alert(e)
      console.log(e)
      setIsLoading(false)
    }
  }

  const loadOrder = async () => {
    setIsLoadingOrder(true)

    setOrder({})

    try {
      const res = await API.get('/admin/order', {identifier: orderIdentifier});

      if (res.isError) throw 'error';

      setOrder(res.data._o)
      setIsLoadingOrder(false)
    } catch (e) {
      console.log(e)
      setIsLoadingOrder(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [sortBy, showFulfilled])

  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  React.useEffect(() => {
    if (orderIdentifier) {
      orderActionSheet.current?.setModalVisible(true)
      loadOrder()
    } else {
      setOrder(null)
    }
  }, [orderIdentifier])

  const getType = (t) => {
    if (t.includes('oil')) return 'Oil'
    if (t.includes('tablets')) return 'Tablets'
    if (t.includes('cream')) return 'Cream'
    if (t.includes('rollon')) return 'Rollon'
    if (t.includes('rubbing')) return 'Alcohol'
    if (t === 'gummies-sourapple') return 'Sour Apple Gummies';
    if (t === 'gummies-tropical') return 'Tropical Gummies';
    if (t === 'gummies-berries') return 'Berries Gummies';

    if (t.includes('gummies')) return 'Gummies';
  }

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Orders ({orders.length})</Text>
        <View style={styles.spacer}></View>
        <TouchableOpacity
          onPress={() => actionSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'>
          <MaterialIcons name="sort" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.defaultTabScrollContent]} contentContainerStyle={{alignItems: 'center', justifyContent: 'center', width: '90%', marginLeft: '5%', paddingBottom: 64}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
              }}
              source={require('../assets/17431-package-delivery.json')}
            />
        }
        {
          orders.map((order) => {
            return (
              <TouchableOpacity activeOpacity={order.fulfilled ? 0.3 : 1} key={order.identifier} onPress={() => setOrderIdentifier(order.identifier)} style={[styles.fullStoreCard, order.fulfilled ? styles.disabled : {}, styles.elevated]}>
                <View style={[styles.fullSCImage, styles.flexible, styles.center, {height: 230}]}>
                  <Image style={styles.fullSCImage} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto,w_400/${order.products[0]?.product.shots[0]}`}} />
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
      <ActionSheet containerStyle={{paddingBottom: 20, paddingTop: 10, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View>
          <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 20, marginBottom: 15}]}>Sort By</Text>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            <TouchableOpacity onPress={() => setSortBy('newest')} disabled={sortBy === 'newest'} style={[styles.defaultRowContainer, styles.actionListItem, sortBy === 'newest' ? styles.disabled : {}]}>
              <Text style={[styles.spacer, styles.baseText, styles.tertiary]}>Newest</Text>
              {
                sortBy === 'newest' &&
                <Ionicons name="md-checkmark" size={18} color={stylesheet.Tertiary} />
              }
            </TouchableOpacity>
          </View>
          <Text style={[styles.baseText, styles.marginWidth, styles.bold, styles.tertiary, {marginTop: 10, marginBottom: 15}]}>Show Fulfilled Orders</Text>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            <TouchableOpacity onPress={() => setShowFulfilled(false)} disabled={!showFulfilled} style={[styles.defaultRowContainer, styles.actionListItem, !showFulfilled ? styles.disabled : {}]}>
              <Text style={[styles.spacer, styles.baseText, styles.tertiary]}>No</Text>
              {
                !showFulfilled &&
                <Ionicons name="md-checkmark" size={18} color={stylesheet.Tertiary} />
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFulfilled(true)} disabled={showFulfilled} style={[styles.defaultRowContainer, styles.actionListItem, showFulfilled ? styles.disabled : {}]}>
              <Text style={[styles.spacer, styles.baseText, styles.tertiary]}>Yes</Text>
              {
                showFulfilled &&
                <Ionicons name="md-checkmark" size={18} color={stylesheet.Tertiary} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet onClose={() => setOrderIdentifier(null)} containerStyle={{paddingBottom: 20, paddingTop: 10, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={orderActionSheet}>
        <View style={[styles.marginWidth, {paddingBottom: 30}]}>
          <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10, marginBottom: 20}]}>Order #{orderIdentifier}</Text>
          {
            isLoadingOrder &&
            <LottieView
                ref={animationRef}
                style={{
                  width: '50%',
                  marginLeft: '14%',
                  backgroundColor: '#fff',
                }}
                source={require('../assets/loading-wait.json')}
              />
          }
          {
            !isLoadingOrder && order &&
            <>
              {
                order.fulfilled &&
                <Text style={[styles.baseText, styles.bold, styles.primary, {marginBottom: 20}]}>Order has been fulfilled</Text>
              }
              <View style={[styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginBottom: 10}]}>
                <Text style={[styles.baseText, styles.tertiary, styles.bold, styles.center]}>{order.buyer.fullname}</Text>
                <Text style={[styles.baseText, styles.tertiary, styles.bold, styles.center]}>{order.address.line1}</Text>
                <Text style={[styles.baseText, styles.tertiary, styles.bold, styles.center]}>{order.address.line2}</Text>
              </View>

              <ScrollView contentContainerStyle={{padding: 0, margin: 0}} horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.fullWidth, {marginTop: 0, marginBottom: 50, width: 'auto', height: 'auto'}]}>
                {
                  order.products?.map(product => {
                    return (
                      <TouchableOpacity activeOpacity={1} key={product._id} style={styles.defaultStoreCard}>
                        <View style={[styles.defaultSCImage, styles.flexible, styles.center, {height: 170}]}>
                          <Image style={styles.defaultSCImage} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto,w_300/${product.product.shots[0]}`}} />
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
              </ScrollView>
              <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {marginTop: 30}]}>
                <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => navigation.navigate('OrderView', {identifier: order.identifier})}>
                  <Feather name="info" size={28} />
                </TouchableOpacity>
              </View>
            </>
          }
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
