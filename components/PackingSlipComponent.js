import * as React from 'react';
import { Linking, Platform, ScrollView, Share, TextInput, Image, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
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

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const slipsActionSheetRef = React.createRef();

export default function PackingSlip({navigation}) {
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    sort: 'nearest'
  });
  const [slips, setSlips] = React.useState([])
  const [distributors, setDistributors] = React.useState([])
  const [slipOwner, setSlipOwner] = React.useState(null)
  const [slipOwnerName, setSlipOwnerName] = React.useState(null)

  const [slipLine, setSlipLine] = React.useState([])
  const [slipProductName, setSlipProductName] = React.useState('')
  const [slipProductId, setSlipProductId] = React.useState('')
  const [slipProductQty, setSlipProductQty] = React.useState('1')
  const [slipProductNote, setSlipProductNote] = React.useState('')

  const [distributorSearch, setDistributorSearch] = React.useState('')

  const [products, setProducts] = React.useState([])
  const [slipProducts, setSlipProducts] = React.useState([])

  const load = async () => {
    setIsLoading(true)
    setSlips([])

    try {
      const res = await API.get('/admin/slips', {});

      if (res.isError) throw 'error';

      setSlips(res.data.slips);
      setDistributors(res.data.distributors);
      setProducts(res.data.products)
      setIsLoading(false);
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const GetPrintableURI = async (id) => {
    try {
      const res = await API.get('/admin/slip/printable', {id: id});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-slip_${id}.pdf`;
      const buff = Buffer.from(res.data._f, 'utf-8')
      let pdf = buff.toString('utf-8')

      await Print.printAsync({
        html: pdf
      });
    } catch (e) {
      console.log(e)
    }
  }

  const GetShareableURI = async (id) => {
    try {
      const res = await API.get('/admin/slip/printable', {id: id});

      if (res.isError) throw 'error';

      const fileUri = FileSystem.documentDirectory + `salud_organica-slip_${id}.html`;
      const buff = Buffer.from(res.data._f, 'utf-8')
      let pdf = buff.toString('utf-8')

      await FileSystem.writeAsStringAsync(fileUri, pdf, { encoding: FileSystem.EncodingType.UTF8 });

      const uuid = await SecureStore.getItemAsync('SSPK');

      await Sharing.shareAsync(fileUri);
    } catch (e) {
      console.log(e)
    }
  }

  const onAddLineItem = () => {
    let product = products.find(p => p.id === slipProductId);

    setSlipProducts([...slipProducts, {
      name: FormatProductName(product.identifier),
      quantity: slipProductQty,
      quickbooksId: product.quickbooksId,
      note: slipProductNote,
      product: product.id
    }])

    setSlipProductNote('')
    setSlipProductQty('1')
  }

  const onCreateSlip = async () => {
    slipsActionSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      const res = await API.post('/admin/slip', {slipOwnerId: slipOwner, slipOwnerName: slipOwnerName, products: slipProducts});

      if (res.isError) throw 'error';

      load();

      setSlipProducts([])
      setSlipOwner(null)
      setSlipOwnerName(null)
      slipsActionSheetRef.current?.setModalVisible(true)
    } catch (e) {
      setIsLoading(false)
      slipsActionSheetRef.current?.setModalVisible(false)
      console.log(e)
    }
  }

  const FormatProductName = (identifier) => {

    if (identifier === 'rollon_gel') return "Herencia del Abuelo Roll-on";
    if (identifier === 'artis_rubbing' || identifier === 'rubbing') return "Herencia del Abuelo Alcohol";

    if (identifier === 'topical_cream' || identifier == "cream") return "Herencia del Abuelo Cream";

    return identifier;
  }

  React.useEffect(() => {
    load()
  }, [])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <TouchableOpacity
          onPress={() => actionSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'>
          <MaterialIcons name="sort" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Packing Slips {slips.length > 0 ? `(${slips.length})` : ''}</Text>
        <View style={styles.spacer}></View>
        <TouchableOpacity
          onPress={() => slipsActionSheetRef.current?.setModalVisible(true)}
          style={{marginRight: 5}}
          underlayColor='#fff'>
          <Feather name="file-plus" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('InboxInvoices')}
          underlayColor='#fff'>
          <Feather name="dollar-sign" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
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
          slips.length === 0 &&
          <View style={[styles.defaultColumnContainer, styles.center, styles.fullWidth, styles.fullHeight]}>
            <TouchableOpacity
              onPress={() => slipsActionSheetRef.current?.setModalVisible(true)}
              style={{margin: 20}}
              underlayColor='#fff'>
              <Feather name="file-plus" size={36} color={stylesheet.Primary} />
            </TouchableOpacity>
            <Text style={[styles.baseText, styles.bold, styles.tertiary]}>No Pending Packing Slips</Text>
          </View>
        }
        {
          slips.map((slip) => {
            return (
              <View style={[styles.fullInvoice]}>
                <View style={[styles.defaultRowContainer, styles.fullWidth, {padding: 10}]}>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.3}]}>Prepare For</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slip.distributor.name} ({slip.distributor.routeLetter} - {slip.distributor.routeNumeration})</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slip.distributor.address.split(", ")[0]}</Text>
                    <Text style={[styles.tinyText, styles.tertiary, {marginTop: 2, opacity: 0.5}]}>{slip.distributor.address.split(", ").slice(1).join(', ')}</Text>
                  </View>
                  <View style={[styles.spacer]}></View>
                  <Image  style={{height: 60,  width: 60, resizeMode: 'contain', marginRight: 10}} source={{uri: 'https://res.cloudinary.com/cbd-salud-sativa/image/upload/v1649685403/salud-organica-logicon.png'}}></Image>
                </View>
                <View style={[styles.defaultColumnContainer, styles.fullWidth, {marginTop: 20, marginBottom: 15, padding: 10}]}>
                  {
                    slip.products.map(product => {
                      return (
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <View style={[styles.defaultColumnContainer]}>
                            <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{FormatProductName(product.product.identifier)}</Text>
                            {
                              typeof product.note == "string" && product.note !== "" &&
                              <Text style={[styles.tinyText, styles.nunitoText, styles.opaque, styles.tertiary]}>{product.note}</Text>
                            }
                          </View>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary]}>{product.quantity}</Text>
                        </View>
                      )
                    })
                  }
                </View>
                <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                  <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.bold, styles.tertiary, {marginBottom: 2}]}>{slip.products.reduce((total, next) => total += next.quantity, 0)} Products</Text>
                    </View>
                    <View style={styles.spacer}></View>
                    <View style={[styles.defaultColumnContainer]}>
                      <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>{slip.date}</Text>
                    </View>
                  </View>
                  <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                    <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>#{slip.identifier.toString().slice(-4)}</Text>
                  </View>
                  <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, marginTop: 10}]}>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetPrintableURI(slip.id)}>
                      <Feather name="printer" size={28} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => GetShareableURI(slip.id)}>
                      <Feather name="share" size={28} color="black" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          })
        }

      </ScrollView>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={slipsActionSheetRef}>
        <View>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            <View style={styles.spacer}></View>
            <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => {setSlipOwner(null); setSlipOwnerName(null)}}>
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Packing Slip {slipOwner ? `for ${slipOwnerName}`: ''}</Text>
            </TouchableOpacity>
            <View style={styles.spacer}></View>
          </View>
          {
            slipOwner &&
            <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 10}]}>
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onAddLineItem()} disabled={!slipProductId}>
                <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Add Item</Text>
              </TouchableOpacity>
              <View style={styles.spacer}></View>
              {
                slipProducts.length > 0 &&
                <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onCreateSlip()} disabled={slipProducts.length === 0}>
                  <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Create Slip</Text>
                </TouchableOpacity>
              }
            </View>
          }
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            {
              !slipOwner &&
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
                        <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setSlipOwner(distributor.identifier); setSlipOwnerName(distributor.company)}}>
                          <Text style={[styles.baseText, styles.tertiary]}>{distributor.company}</Text>
                        </TouchableOpacity>
                      )
                    })
                  }
                </ScrollView>
              </>
            }

            {
              slipOwner &&
              <>
                {
                  slipProducts.length > 0 &&
                  <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Items</Text>
                }
                {
                  slipProducts.map((slipProduct) => {
                    return (
                      <>
                        <View style={[styles.defaultRowContainer, styles.fullWidth, {marginTop: 5, marginBottom: 5}]}>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{slipProduct.name}</Text>
                          <View style={styles.spacer}></View>
                          <Text style={[styles.baseText, styles.nunitoText, styles.tertiary]}>{slipProduct.quantity}</Text>
                        </View>
                      </>
                    )
                  })
                }

                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 40}]}>Quantity</Text>
                <TextInput
                  style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter quantity..."
                  keyboardType="numeric"
                  value={slipProductQty}
                  onChangeText={(text) => {
                    setSlipProductQty(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 40}]}>Note</Text>
                <TextInput
                  style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter note..."
                  keyboardType="default"
                  value={slipProductNote}
                  onChangeText={(text) => {
                    setSlipProductNote(text)
                  }}
                />

                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Product</Text>
                <Picker
                  style={{marginTop: 0, paddingTop: 0, marginBottom: 20}}
                  selectedValue={slipProductId}
                  onValueChange={(itemValue, itemIndex) =>
                    {
                      setSlipProductId(itemValue)
                    }
                  }>
                  <Picker.Item label="Select one..." value={null} />
                  {
                    products.map(product => {
                      return (
                        <Picker.Item label={FormatProductName(product.name)} value={product.id} />
                      )
                    })
                  }
                </Picker>
              </>
            }
          </View>
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
