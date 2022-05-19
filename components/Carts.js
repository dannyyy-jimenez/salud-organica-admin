import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import API from '../Api'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();

export default function Carts({navigation}) {
  const [carts, setCarts] = React.useState([])
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    min: '',
    max: '',
    sort: 'newest'
  });
  const [sortBy, setSortBy] = React.useState("newest");

  const load = async () => {
    setCarts([])
    setIsLoading(true)

    try {
      const res = await API.get('/admin/carts');

      if (res.isError) throw 'error';

      setCarts(res.data._c)
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


  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <TouchableOpacity
          onPress={() => actionSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'>
          <MaterialIcons name="sort" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Active Carts ({carts.length})</Text>
        <View style={styles.spacer}></View>
        <MaterialIcons name="sort" size={24} color={stylesheet.Secondary} />
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
              source={require('../assets/53735-cart-icon-loader.json')}
              // OR find more Lottie files @ https://lottiefiles.com/featured
              // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
            />
        }
        {
          carts.map((cart) => {
            return (
              <TouchableOpacity activeOpacity={cart.fulfilled ? 0.3 : 1} key={cart.identifier} onPress={() => navigation.navigate('CartView', {identifier: cart.identifier})} style={[styles.fullStoreCard, cart.fulfilled ? styles.disabled : {}]}>
                {
                  cart.products.length > 0 &&
                  <View style={[styles.fullSCImage, styles.flexible, styles.center, {height: 230}]}>
                    <Image style={styles.fullSCImage} source={{uri: `https://res.cloudinary.com/cbd-salud-sativa/image/upload/f_auto,q_auto/${cart.products[0].product.shots[0]}`}} />
                  </View>
                }
                {
                  cart.products.length === 0 &&
                  <View style={[styles.fullSCImage, styles.flexible, styles.center, {height: 100}]}></View>
                }
                <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                  <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.tertiary, {marginBottom: 2}]}>{cart.buyer.fullname}</Text>
                    </View>
                    <View style={styles.spacer}></View>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>{cart.products.length} {cart.products.length !== 1 ? 'Products' : 'Product'} - ${cart.total}</Text>
                    </View>
                  </View>
                  <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                    <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{cart.address.line1}</Text>
                    <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{cart.address.line2}</Text>
                  </View>
                  <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', bcartTopLeftRadius: 5, bcartBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                    <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{cart.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        }
      </ScrollView>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View>
          <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Sort By</Text>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            <TouchableOpacity onPress={() => setSortBy('newest')} disabled={sortBy === 'newest'} style={[styles.defaultRowContainer, styles.actionListItem, sortBy === 'newest' ? styles.disabled : {}]}>
              <Text style={[styles.spacer, styles.baseText, styles.tertiary]}>Newest</Text>
              {
                sortBy === 'newest' &&
                <Ionicons name="md-checkmark" size={18} color={stylesheet.Tertiary} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
