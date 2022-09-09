import * as React from 'react';
import { Linking, Platform, ScrollView, Share, Pressable, TextInput, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import Api from '../Api'
import * as Location from 'expo-location';
import haversine from 'haversine-distance'
import {Picker} from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import openMap from 'react-native-open-maps';
import { FormatSerieName } from './Globals'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const createSheetRef = React.createRef();

class Distributor {
  constructor(identifier, company, managers, address, lines, lat, lng, status, route, location, issues = []) {
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
    this.issues = issues;
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

export default function Distributors({navigation}) {
  const [permissions, setPermissions] = React.useState([])
  const [defaultDistributors, setDefaultDistributors] = React.useState([])
  const [distributors, setDistributors] = React.useState([])
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    sort: 'nearest'
  });
  const [routeLetter, setRouteLetter] = React.useState("")
  const [location, setLocation] = React.useState(null);
  const [sortBy, setSortBy] = React.useState("default");
  const [nearest, setNearest] = React.useState(null);
  const [search, setSearch] = React.useState("")
  const [needAttention, setNeedAttention] = React.useState([])
  const [routeLetters, setRouteLetters] = React.useState([])
  const [availableLines, setAvailableLines] = React.useState([])

  const [routeMode, setRouteMode] = React.useState({
    active: false,
    total: 0,
    current: 0
  })

  // new dist

  const [newSection, setNewSection] = React.useState(0)
  const [newRouteLetter, setNewRouteLetter] = React.useState('A')

  // section 1
  const [givenName, setGivenName] = React.useState('')
  const [familyName, setFamilyName] = React.useState('')
  const [managers, setManagers] = React.useState("")

  // section 2
  const [companyName, setCompanyName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')

  // section 3
  const [lines, setLines] = React.useState(['herencia'])

  // section 5
  const [autocompletedAddresses, setAutocompletedAddresses] = React.useState([])
  const [addressSearch, setAddressSearch] = React.useState('')
  const [selectedAddressFreeform, setSelectedAddressFreeform] = React.useState('')
  const [addressLat, setAddressLat] = React.useState('')
  const [addressLng, setAddressLng] = React.useState('')

  const load = async (loc = null, loadingPers = true) => {
    if (loadingPers) {
      setIsLoading(true)
    }

    setDistributors([])
    setDefaultDistributors([])
    try {
      const res = await Api.get('/admin/distributors', {route: ''});

      if (res.isError) throw res;

      let dists = []

      if (sortBy === 'default') {
        dists = res.data._d.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, loc ? loc.coords : location ? location.coords : {latitude: 0, longitude: 0}, distributor.issues)).sort((a, b) => {
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
        let uniqueRoutes = [""]
        for (let l of res.data._d.map(d => d.routeLetter).sort()) {
          if (!uniqueRoutes.includes(l)) {
            uniqueRoutes.push(l)
          }
        }
        setRouteLetters(uniqueRoutes)
      } else if (sortBy === 'urgency') {
        dists = res.data._d.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, loc ? loc.coords : location ? location.coords : {latitude: 0, longitude: 0}, distributor.issues)).sort((a, b) => b.status - a.status)
      }

      setDefaultDistributors(dists)

      if (routeLetter !== "") {
        dists = dists.slice().filter(dist => dist.route.includes(routeLetter))
      }

      setAvailableLines(res.data.series)
      setPermissions(res.data._permissions)
      setDistributors(dists)
      setIsLoading(false)
    } catch (e) {
      console.log(e)
      setIsLoading(false)
    }
  }

  const onCreate = async () => {
    createSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      let body = {routeLetter: newRouteLetter, managers, companyName, email, phone, address: selectedAddressFreeform, addressLat, addressLng}
      const res = await Api.post('/admin/distributors/create', body);

      if (res.isError) {
        alert(res.response)
        throw 'error';
      }

      setNewRouteLetter('')
      setManagers('')
      setCompanyName('')
      setEmail('')
      setPhone('')
      setAddressLat('')
      setAddressLng('')
      setSelectedAddressFreeform('')
      setAddressSearch('')
      setAutocompletedAddresses([])
      setLines(['herencia'])
      setNewSection(0)
      load();
    } catch (e) {
      console.log(e)
      setIsLoading(false)
      setTimeout(() => {
        createSheetRef.current?.setModalVisible(true)
      }, 1000)
    }
  }

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      Location.watchPositionAsync({distanceInterval: 50}, (location) => {
        if (search !== "") return;
        setLocation(location);

        load(location, false)
      });
    })();
  }, []);

  const shareMaps = async (dist) => {
    const destination = encodeURIComponent(`${dist.address}`);

    try {
      const result = await Share.share({
        message: dist.address
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      alert(error.message);
    }
  }

  const openMaps = async (dist) => {
    openMap({ latitude: dist.lat, longitude: dist.lng, query: dist.company, end: dist.address });
  }

  const FormatStatus = (status) => {
    if (status < 2) {
      return 'Excellent'
    } else if (status > 21) {
      return `Urgent - ${status}`
    } else if (status > 7) {
      return 'Follow Up'
    } else if (status > 5)  {
      return 'So-So'
    }

    return 'Good'
  }

  const GetUrgencyColor = (status) => {
    if (status < 2) {
      return stylesheet.Primary
    } else if (status > 21) {
      return 'darkred'
    } else if (status > 7) {
      return 'lightseagreen'
    } else if (status > 5)  {
      return 'darkgreen'
    }

    return stylesheet.Primary
  }

  const FormatRouteLetter = (letter) => {
    if (letter == 'A') {
      return 'Chicago'
    } else if (letter == 'B') {
      return 'Waukegan'
    } else if (letter == 'C') {
      return 'Joliet'
    } else if (letter == 'D') {
      return 'Elgin'
    } else if (letter == 'E') {
      return 'Aurora'
    } else if (letter == 'F') {
      return 'Evergreen'
    } else if (letter == 'G') {
      return 'Northside'
    } else if (letter == 'H') {
      return 'New York TBD'
    }


    return 'All';
  }

  React.useEffect(() => {
    load(location)
  }, [sortBy])

  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  React.useEffect(() => {
    if (search === 'OVRD') {
      setDistributors(needAttention)
      return;
    }
    setDistributors(defaultDistributors.filter(dist => dist.company.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, "").includes(search.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, ""))))
  }, [search])

  React.useEffect(() => {
    setNeedAttention(distributors.filter(d => d.status > 21))
    let sortedByDistance = distributors.slice().sort((a, b) => a.distance - b.distance);
    if (sortedByDistance.length > 0 && sortedByDistance[0].distance < 0.0804672) {
      setNearest(sortedByDistance[0])
    } else {
      setNearest(null)
    }
  }, [distributors])

  React.useEffect(() => {
    if (routeLetter === "") {
      setRouteMode({
        active: false,
        current: 0,
        total: 0
      })
      setDistributors(defaultDistributors)
      return;
    }
    setDistributors(defaultDistributors.slice().filter(dist => dist.route.includes(routeLetter)))
  }, [defaultDistributors, routeLetter])

  const ToggleRouteMode = () => {
    if (routeMode.active) {
      setRouteMode({
        active: false,
        current: 0,
        total: 0
      })
    } else {
      setRouteMode({
        active: true,
        current: 0,
        total: distributors.length
      })
    }
  }

  const findNextRoute = () => {
    setRouteMode(prevState => {
      return {
        active: true,
        current: prevState.current + 1,
        total: distributors.length
      }
    })
  }

  React.useEffect(() => {
    if (addressSearch === "") {
      return;
    }

    Api.autocomplete(addressSearch, location ? location.coords.latitude : null, location ? location.coords.longitude : null).then(res => {
      if (!res.data.results) return;

      setAutocompletedAddresses(res.data.results.filter(a => a.type === 'Point Address'))
    }).catch(e => {
      console.log(e)
    })
  }, [addressSearch])

  const onAutocompletedSelect = (address) => {
    setSelectedAddressFreeform(address.address.freeformAddress)
    setAddressLat(address.position.lat)
    setAddressLng(address.position.lon)
  }

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        {
          routeMode.active && routeMode.current < routeMode.total &&
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Route Mode: {FormatRouteLetter(routeLetter)} ({routeMode.current + 1} / {routeMode.total}) </Text>
        }
        {
          routeMode.active && routeMode.current == routeMode.total &&
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Route Mode: {FormatRouteLetter(routeLetter)} FINISHED</Text>
        }
        {
          !routeMode.active &&
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Retailers {routeLetter ? `(Route ${routeLetter})` : ''} ({distributors.length})</Text>
        }
        <View style={styles.spacer}></View>
        {
          routeLetter !== "" &&
          <TouchableOpacity
            onPress={() => ToggleRouteMode()}
            underlayColor='#fff' style={{marginRight: 10}}>
            <Ionicons name="car-sport" size={24} color={stylesheet.Primary} />
          </TouchableOpacity>
        }
        <TouchableOpacity
          onPress={() => navigation.navigate("DistributorsMap", {letter: routeLetter})}
          underlayColor='#fff'>
          <Feather name="map-pin" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
      </View>
        {
          routeMode.active && routeMode.current == routeMode.total &&
          <View style={[styles.defaultTabScrollContent, {alignItems: 'flex-start', justifyContent: 'flex-start', width: '90%', marginLeft: '5%', paddingBottom: 70}]}>
            {
              <LottieView
                  ref={animationRef}
                  style={{
                    width: '100%',
                    backgroundColor: '#fff',
                  }}
                  loop
                  autoPlay
                  source={require('../assets/33886-check-okey-done.json')}
                  // OR find more Lottie files @ https://lottiefiles.com/featured
                  // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
                />
            }
          </View>
        }
        {
          routeMode.active && routeMode.current < routeMode.total &&
          <View style={[styles.defaultTabScrollContent, {alignItems: 'flex-start', justifyContent: 'flex-start', width: '90%', marginLeft: '5%', paddingBottom: 70}]}>
            {
              <TouchableOpacity key={distributors[routeMode.current].identifier} onPress={() => navigation.navigate('DistributorView', {identifier: distributors[routeMode.current].identifier, company: distributors[routeMode.current].company})} style={[styles.fullStoreCard, styles.elevated]}>
                <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {borderBottomRightRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#FCFCFC"}]}>
                  <Text style={[styles.tinyText, styles.bold, {opacity: 0.5}, styles.center]}>{distributors[routeMode.current].address}</Text>
                  <Text numberOfLines={1} style={[styles.subHeaderText, styles.nunitoText, styles.tertiary, {marginTop: 20, marginBottom: 20}]}>{distributors[routeMode.current].company}</Text>
                </View>
                <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, backgroundColor: '#F9F9F9', borderBottomLeftRadius: 10, borderBottomRightRadius: 10}]}>
                  {
                    permissions.includes("DIST_CAR_SHAREABLE") &&
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => shareMaps(distributors[routeMode.current])}>
                      <Feather name="map-pin" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                    </TouchableOpacity>
                  }
                  {
                    !permissions.includes("DIST_CAR_SHAREABLE") &&
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => openMaps(distributors[routeMode.current])}>
                      <Feather name="map-pin" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                    </TouchableOpacity>
                  }
                  <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => findNextRoute()}>
                    <Feather name="check" size={28} color="black" />
                  </TouchableOpacity>
                  {
                    distributors[routeMode.current].status > 5 &&
                    <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: GetUrgencyColor(distributors[routeMode.current].status)}}>
                      <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{FormatStatus(distributors[routeMode.current].status)}</Text>
                    </View>
                  }
                </View>
              </TouchableOpacity>
          }
          {
            distributors.slice(routeMode.current + 1).map((distributor, idx) => {
              return (
                <>
                  <View key={distributor.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: distributor.identifier, company: distributor.company})} style={[styles.fullStoreCard, {opacity: 0.2}]}>
                    <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {borderBottomRightRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#FCFCFC"}]}>
                      <Text style={[styles.tinyText, styles.bold, {opacity: 0.5}, styles.center]}>{distributor.address}</Text>
                      <Text numberOfLines={1} style={[styles.subHeaderText, styles.nunitoText, styles.tertiary, {marginTop: 20, marginBottom: 20}]}>{distributor.company}</Text>
                    </View>
                    <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, backgroundColor: '#F9F9F9', borderBottomLeftRadius: 10, borderBottomRightRadius: 10}]}>
                      {
                        permissions.includes("DIST_CAR_SHAREABLE") &&
                        <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => shareMaps(distributor)}>
                          <Feather name="map-pin" size={28} color="black" />
                          <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                        </TouchableOpacity>
                      }
                      {
                        !permissions.includes("DIST_CAR_SHAREABLE") &&
                        <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => openMaps(distributor)}>
                          <Feather name="map-pin" size={28} color="black" />
                          <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                        </TouchableOpacity>
                      }
                      {
                        distributor.status > 5 &&
                        <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: GetUrgencyColor(distributor.status)}}>
                          <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{FormatStatus(distributor.status)}</Text>
                        </View>
                      }
                    </View>
                  </View>
                </>
              )
            })
          }
        </View>
      }
      {
        !routeMode.active &&
        <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'flex-start', justifyContent: 'flex-start', width: '90%', marginLeft: '5%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
          {
            isLoading &&
            <LottieView
                ref={animationRef}
                style={{
                  width: '100%',
                  backgroundColor: '#fff',
                }}
                source={require('..//assets/loading-leaf.json')}
                // OR find more Lottie files @ https://lottiefiles.com/featured
                // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
              />
          }
          {
            !isLoading &&
            <TextInput
              style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
              placeholder="Search"
              placeholderTextColor={stylesheet.Tertiary}
              numberOfLines={1}
              value={search}
              onChangeText={(text) => setSearch(text)}
            />
          }
          {
            nearest && filters.sort === 'nearest' && !isLoading &&
            <>
              <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Nearest</Text>
              <TouchableOpacity activeOpacity={nearest.fulfilled ? 0.3 : 1} key={nearest.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: nearest.identifier, company: nearest.company})} style={[styles.fullStoreCard, styles.elevated]}>
                <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {borderBottomRightRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#FCFCFC"}]}>
                  <Text style={[styles.tinyText, styles.bold, {opacity: 0.5}, styles.center]}>{nearest.address}</Text>
                  <Text numberOfLines={1} style={[styles.subHeaderText, styles.nunitoText, styles.tertiary, {marginTop: 20, marginBottom: 20}]}>{nearest.company}</Text>
                  {
                    nearest.issues && nearest.issues.length > 0 &&
                    <View style={[styles.fullWidth, {flex: 1}]}>
                      {
                        nearest.issues.filter(issue => issue.type === "INVOICE" && issue.status === "OVERDUE").length > 0 &&
                        <>
                          <View style={[styles.cardAttentive, {backgroundColor: '#FF3131'}]}>
                            <Text style={{color: 'white'}}>{nearest.issues.filter(issue => issue.type === "INVOICE" && issue.status === "OVERDUE").length} Overdue Invoice(s)</Text>
                          </View>
                        </>
                      }
                      {
                        nearest.issues.filter(issue => issue.type === "INVOICE" && issue.status === "PENDING").length > 0 &&
                        <>
                          <View style={[styles.cardAttentive, {backgroundColor: '#FF6347'}]}>
                            <Text style={{color: 'white'}}>{nearest.issues.filter(issue => issue.type === "INVOICE" && issue.status === "PENDING").length} Pending Invoice(s)</Text>
                          </View>
                        </>
                      }
                    </View>
                  }
                </View>
                <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, backgroundColor: '#F9F9F9', borderBottomLeftRadius: 10, borderBottomRightRadius: 10}]}>
                  {
                    permissions.includes("DIST_CAR_SHAREABLE") &&
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => shareMaps(nearest)}>
                      <Feather name="map-pin" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                    </TouchableOpacity>
                  }
                  {
                    !permissions.includes("DIST_CAR_SHAREABLE") &&
                    <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => openMaps(nearest)}>
                      <Feather name="map-pin" size={28} color="black" />
                      <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                    </TouchableOpacity>
                  }
                  <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => navigation.navigate("Invoices", {screen: "InboxInhouseInvoices", params: {invoiceOwnerIdentifier: nearest.identifier}})}>
                    <Feather name="file-plus" size={28} color="black" />
                    <Text style={{marginTop: 5, fontSize: 12}}>New Invoice</Text>
                  </TouchableOpacity>
                  {
                    nearest.status > 5 &&
                    <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: GetUrgencyColor(nearest.status)}}>
                      <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{FormatStatus(nearest.status)}</Text>
                    </View>
                  }
                </View>
              </TouchableOpacity>
            </>
          }
          <View style={[styles.defaultRowContainer, styles.fullWidth, styles.justifyCenter, {marginBottom: 20, marginTop: 5, height: 'auto'}]}>
            {
              needAttention.length > 0 &&
              <View style={[styles.analyticCard, {width: 170, flex: 'auto'}, styles.elevated, {backgroundColor: '#FF3131'}]}>
                <Text style={[styles.subHeaderText, styles.bold, styles.secondary]}>Need Attention</Text>

                <View style={[styles.fullWidth, styles.defaultColumnContainer]}>
                  <Text style={[styles.tinyText, styles.bold, styles.secondary, styles.opaque]}>Amount</Text>
                  <Text style={[styles.headerText, styles.bold, styles.secondary, {marginTop: 5}]}>{needAttention.length}</Text>
                </View>

                <TouchableOpacity onPress={() => setSearch('OVRD')} style={[styles.marginWidth, styles.center, styles.defaultRowContainer, {padding: 10, borderRadius: 5, backgroundColor: "#FF6565"}]}>
                  <Text style={[styles.tinyText, styles.bold, styles.secondary]}>View Details</Text>
                </TouchableOpacity>
              </View>
            }
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.defaultRowContainer, styles.fullWidth, styles.justifyCenter, {paddingTop: 15, paddingLeft: 15, paddingBottom: 15, paddingRight: 15, height: 'auto'}]}>
            {
              routeLetters.map(letter => {
                return (
                  <Pressable onPress={() => setRouteLetter(letter)} style={[styles.chip, styles.elevated, routeLetter === letter ? {backgroundColor: stylesheet.Primary} : {}]}>
                    <Text style={[styles.subHeaderText, styles.bold, routeLetter === letter ? {color: 'white'} : styles.tertiary]}>{FormatRouteLetter(letter)}</Text>
                  </Pressable>
                )
              })
            }
          </ScrollView>
          {
            !isLoading && sortBy == 'urgency' &&
            <Text style={[styles.baseText, styles.bold, styles.tertiary]}>By Urgency</Text>
          }
          {
            distributors.map((distributor, idx) => {
              return (
                <>
                  <TouchableOpacity activeOpacity={distributor.fulfilled ? 0.3 : 1} key={distributor.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: distributor.identifier, company: distributor.company})} style={[styles.fullStoreCard, styles.elevated]}>
                    <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {borderBottomRightRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#FCFCFC"}]}>
                      <Text style={[styles.tinyText, styles.bold, {opacity: 0.5}, styles.center]}>{distributor.address}</Text>
                      <Text numberOfLines={1} style={[styles.subHeaderText, styles.nunitoText, styles.tertiary, {marginTop: 20, marginBottom: 20}]}>{distributor.company}</Text>

                      {
                        distributor.issues && distributor.issues.length > 0 &&
                        <View style={[styles.fullWidth, {flex: 1}]}>
                          {
                            distributor.issues.filter(issue => issue.type === "INVOICE" && issue.status === "OVERDUE").length > 0 &&
                            <>
                              <View style={[styles.cardAttentive, {backgroundColor: '#FF3131'}]}>
                                <Text style={{color: 'white'}}>{distributor.issues.filter(issue => issue.type === "INVOICE" && issue.status === "OVERDUE").length} Overdue Invoice(s)</Text>
                              </View>
                            </>
                          }
                          {
                            distributor.issues.filter(issue => issue.type === "INVOICE" && issue.status === "PENDING").length > 0 &&
                            <>
                              <View style={[styles.cardAttentive, {backgroundColor: '#FF6347'}]}>
                                <Text style={{color: 'white'}}>{distributor.issues.filter(issue => issue.type === "INVOICE" && issue.status === "PENDING").length} Pending Invoice(s)</Text>
                              </View>
                            </>
                          }
                        </View>
                      }
                    </View>
                    <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, backgroundColor: '#F9F9F9', borderBottomLeftRadius: 10, borderBottomRightRadius: 10}]}>
                      {
                        permissions.includes("DIST_CAR_SHAREABLE") &&
                        <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => shareMaps(distributor)}>
                          <Feather name="map-pin" size={28} color="black" />
                          <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                        </TouchableOpacity>
                      }
                      {
                        !permissions.includes("DIST_CAR_SHAREABLE") &&
                        <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => openMaps(distributor)}>
                          <Feather name="map-pin" size={28} color="black" />
                          <Text style={{marginTop: 5, fontSize: 12}}>Navigate</Text>
                        </TouchableOpacity>
                      }
                      <TouchableOpacity style={[{marginLeft: 15, marginRight: 15}, styles.center]} onPress={() => navigation.navigate("Invoices", {screen: "InboxInhouseInvoices", params: {invoiceOwnerIdentifier: distributor.identifier}})}>
                        <Feather name="file-plus" size={28} color="black" />
                        <Text style={{marginTop: 5, fontSize: 12}}>New Invoice</Text>
                      </TouchableOpacity>
                      {
                        distributor.status > 5 &&
                        <View style={{position: 'absolute', left: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 5, borderBottomLeftRadius: 5, backgroundColor: GetUrgencyColor(distributor.status)}}>
                          <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{FormatStatus(distributor.status)}</Text>
                        </View>
                      }
                    </View>
                  </TouchableOpacity>
                </>
              )
            })
          }
        </ScrollView>
      }
      <TouchableOpacity onPress={() => createSheetRef.current?.setModalVisible(true)} style={[styles.center, styles.fab]}>
        <Feather name="plus" size={32} color={stylesheet.SecondaryTint} />
      </TouchableOpacity>
      <ActionSheet containerStyle={{paddingBottom: 40, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View style={{marginBottom: 50}}>
          <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Sort By</Text>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            <TouchableOpacity onPress={() => setSortBy('default')}>
              <Text style={[styles.baseText, styles.tertiary, {marginTop: 10}, {opacity: sortBy == 'default' ? 0.2 : 1}]}>
                Default
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSortBy('urgency')}>
              <Text style={[styles.baseText, styles.tertiary, {marginTop: 30}, {opacity: sortBy == 'urgency' ? 0.2 : 1}]}>
                Urgency
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 40, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={createSheetRef}>
        <View>
          <View style={[styles.defaultRowContainer, styles.fullWidth]}>
            {
              newSection > 0 &&
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => setNewSection(newSection - 1)}>
                <Feather name="chevron-left" size={26} color="black" />
              </TouchableOpacity>
            }
            <View style={styles.spacer}></View>
            {
              newSection === 0 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Select New Retailer's Route Letter</Text>
            }
            {
              newSection === 1 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Enter Retailer Info</Text>
            }
            {
              newSection === 2 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Select Lines Available</Text>
            }
            {
              newSection === 3 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Enter Retailer Address</Text>
            }
            <View style={styles.spacer}></View>
            {
              newSection !== 3 &&
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => setNewSection(newSection + 1)}>
                <Feather name="chevron-right" size={26} color="black" />
              </TouchableOpacity>
            }
            {
              newSection == 3 && selectedAddressFreeform !== "" &&
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => onCreate()}>
                <Feather name="chevrons-right" size={26} color="black" />
              </TouchableOpacity>
            }
          </View>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            {
              newSection === 0 &&
              <>
                <ScrollView style={{maxHeight: 200, marginBottom: 10}}>
                  {
                    routeLetters.slice(1).map(letter => {
                      return (
                        <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => {setNewRouteLetter(letter); setNewSection(1)}}>
                          <Text style={[styles.baseText, newRouteLetter === letter ? styles.primary : styles.tertiary]}>{letter} ({FormatRouteLetter(letter)})</Text>
                        </TouchableOpacity>
                      )
                    })
                  }
                </ScrollView>
                <TextInput
                  placeholderTextColor="#888"
                  style={[{marginBottom: 50, width: '100%'}, styles.baseInput, {textAlign: 'left'}]}
                  placeholder="Enter new custom route letter..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={newRouteLetter}
                  onChangeText={(text) => {
                    setNewRouteLetter(text)
                  }}
                />
              </>
            }
            {
              newSection === 1 &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Company Name</Text>
                <TextInput
                  style={[{marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter name..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={companyName}
                  onChangeText={(text) => {
                    setCompanyName(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Manager(s) (separate with commas)</Text>
                <TextInput
                  placeholderTextColor="#888"
                  style={[{width: '100%'}, styles.baseInput]}
                  placeholder="Enter manager names..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={managers}
                  onChangeText={(text) => {
                    setManagers(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 10}]}>E-mail</Text>
                <TextInput
                  style={[{marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter email..."
                  keyboardType="email-address"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 10}]}>Phone Number</Text>
                <TextInput
                  style={[{marginBottom: 40, width: '100%'}, styles.baseInput]}
                  placeholder="Enter phone number..."
                  keyboardType="phone-pad"
                  placeholderTextColor="#888"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text)
                  }}
                />
              </>
            }
            {
              newSection === 2 &&
              <View style={{paddingBottom: 40}}>
                {
                  availableLines.map(line => {
                    return (
                      <View style={[styles.defaultRowContainer, {marginBottom: 20}]}>
                        <Checkbox
                          style={styles.checkbox}
                          value={lines.includes(line)}
                          onValueChange={() => {
                            if (lines.includes(line)) {
                              let c = lines.slice()
                              c.splice(lines.indexOf(line), 1)
                              setLines(c)
                            } else {
                              setLines([...lines, line])
                            }
                          }}
                          color={lines.includes(line) ? stylesheet.Primary : undefined}
                        />
                        <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginLeft: 10}]}>{FormatSerieName(line)}</Text>
                      </View>
                    )
                  })
                }
              </View>
            }
            {
              newSection === 3 &&
              <>
                <TextInput
                  style={[{marginBottom: 30, width: '100%'}, styles.baseInput]}
                  placeholder="Search address..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={addressSearch}
                  onChangeText={(text) => {
                    setAddressSearch(text)
                  }}
                />
                {
                  autocompletedAddresses.length > 0 &&
                  <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>Select Address</Text>
                }

                <ScrollView style={{height: 200, marginBottom: 10}}>
                  {
                    autocompletedAddresses.map(address => {
                      return (
                        <TouchableOpacity style={{marginTop: 10, marginBottom: 10}} onPress={() => onAutocompletedSelect(address)}>
                          <Text style={[styles.baseText, selectedAddressFreeform == address.address.freeformAddress ? styles.primary : styles.tertiary]}>{address.address.freeformAddress}</Text>
                        </TouchableOpacity>
                      )
                    })
                  }
                </ScrollView>
              </>
            }
          </View>
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
