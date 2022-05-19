import * as React from 'react';
import { Linking, Platform, ScrollView, Share, TextInput, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import Api from '../Api'
import * as Location from 'expo-location';
import haversine from 'haversine-distance'
import {Picker} from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const createSheetRef = React.createRef();

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

    return haversine(coords, user) // returns distance in km
  }

}

export default function Distributors({navigation}) {
  const [defaultDistributors, setDefaultDistributors] = React.useState([])
  const [distributors, setDistributors] = React.useState([])
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    sort: 'nearest'
  });
  const [routeLetter, setRouteLetter] = React.useState(null)
  const [location, setLocation] = React.useState(null);
  const [sortBy, setSortBy] = React.useState("newest");
  const [nearest, setNearest] = React.useState(null);
  const [search, setSearch] = React.useState("")

  // new dist

  const [newSection, setNewSection] = React.useState(0)
  const [newRouteLetter, setNewRouteLetter] = React.useState('A')

  // section 1
  const [givenName, setGivenName] = React.useState('')
  const [familyName, setFamilyName] = React.useState('')

  // section 2
  const [companyName, setCompanyName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')

  // section 3
  const [lines, setLines] = React.useState([])
  const [herencia_displays, setHerenciaDisplays] = React.useState('')

  // section 4
  const [stateCode, setStateCode] = React.useState('')

  // section 5
  const [city, setCity] = React.useState('')
  const [postalCode, setPostalCode] = React.useState('')
  const [line1, setLine1] = React.useState('')
  const [line2, setLine2] = React.useState('')

  const load = async (loc = null, loadingPers = true) => {
    if (loadingPers) {
      setIsLoading(true)
    }

    setDistributors([])
    setDefaultDistributors([])
    try {
      const res = await Api.get('/admin/distributors', {route: routeLetter});

      if (res.isError) throw res;
      let dists = res.data._d.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, loc ? loc.coords : location.coords)).sort((a, b) => {
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
      setDefaultDistributors(dists)
      setDistributors(dists)
      setNearest(dists.slice().sort((a, b) => a.distance - b.distance)[0])
      setIsLoading(false)
    } catch (e) {
      setIsLoading(false)
    }
  }

  const onCreate = async () => {
    createSheetRef.current?.setModalVisible(false)

    setIsLoading(true)

    try {
      const res = await Api.post('/admin/quickbooks/distributor', {routeLetter: newRouteLetter, givenName, familyName, companyName, email, phone, stateCode, city, postalCode, line1, line2, herencia_displays});

      if (res.isError) {
        alert(res.response)
        throw 'error';
      }

      setNewRouteLetter('')
      setGivenName('')
      setFamilyName('')
      setCompanyName('')
      setEmail('')
      setPhone('')
      setStateCode('')
      setCity('')
      setLine1('')
      setLine2('')
      setPostalCode('')
      setLines([])
      setHerenciaDisplays('')
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

      Location.watchPositionAsync({}, (location) => {
        if (search !== "") return;
        setLocation(location);

        load(location, false)
      });
    })();
  }, []);

  const openMaps = async (dist) => {
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

  React.useEffect(() => {
    load(location)
  }, [routeLetter])

  React.useEffect(() => {
    if (isLoading) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isLoading])

  React.useEffect(() => {
    setDistributors(defaultDistributors.filter(dist => dist.company.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, "").includes(search.toLowerCase().replaceAll(/[\"'!@#$%^&*()ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž ]/g, ""))))
  }, [search])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <TouchableOpacity
          onPress={() => actionSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'>
          <MaterialIcons name="sort" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Retailers {routeLetter ? `(Route ${routeLetter})` : ''} ({distributors.length})</Text>
        <View style={styles.spacer}></View>
        <TouchableOpacity
          onPress={() => createSheetRef.current?.setModalVisible(true)}
          underlayColor='#fff'>
          <Feather name="plus" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'flex-start', justifyContent: 'flex-start', width: '90%', marginLeft: '5%', paddingBottom: 70}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
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
        <TextInput
          style={[{marginTop: 5,  marginBottom: 20, width: '100%'}, styles.baseInput]}
          placeholder="Search"
          numberOfLines={1}
          value={search}
          onChangeText={(text) => setSearch(text)}
        />
        {
          filters.sort === 'nearest' && !isLoading &&
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Nearest</Text>
        }
        {
          nearest &&
          <>
            <TouchableOpacity activeOpacity={nearest.fulfilled ? 0.3 : 1} key={nearest.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: nearest.identifier, company: nearest.company})} onLongPress={() => openMaps(nearest)} style={[styles.fullStoreCard]}>
              <View style={styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent}>
                <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.tertiary, {marginBottom: 2}]}>{nearest.company}</Text>
                  </View>
                  <View style={styles.spacer}></View>
                  <View style={[styles.defaultColumnContainer]}>
                    <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>{nearest.route}</Text>
                  </View>
                </View>
                <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                  <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>
                    {
                      nearest.managers.join(', ')
                    }
                  </Text>
                  <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{nearest.address}</Text>
                </View>
                <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: stylesheet.Primary}}>
                  <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{nearest.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        }
        {
          !isLoading &&
          <Text style={[styles.baseText, styles.bold, styles.tertiary]}>By Numeration</Text>
        }
        {
          distributors.map((distributor, idx) => {
            return (
              <>
                <TouchableOpacity activeOpacity={distributor.fulfilled ? 0.3 : 1} key={distributor.identifier} onPress={() => navigation.navigate('DistributorView', {identifier: distributor.identifier, company: distributor.company})} style={[styles.fullStoreCard]}>
                  <View style={[styles.defaultColumnContainer, styles.fullWidth, styles.fullSCContent, {borderBottomRightRadius: 0, borderBottomLeftRadius: 0, backgroundColor: "#FCFCFC"}]}>
                    <View style={[styles.defaultRowContainer, styles.fullWidth]}>
                      <View style={[styles.defaultColumnContainer]}>
                        <Text numberOfLines={1} style={[styles.baseText, styles.nunitoText, styles.tertiary, {marginBottom: 2}]}>{distributor.company}</Text>
                      </View>
                      <View style={styles.spacer}></View>
                      <View style={[styles.defaultColumnContainer]}>
                        <Text style={[styles.tinyText, styles.tertiary, styles.opaque, {marginTop: 2}]}>{distributor.route}</Text>
                      </View>
                    </View>
                    <View style={[styles.spacer, styles.defaultColumnContainer, styles.fullWidth, {alignItems: 'flex-start', marginTop: 10}]}>
                      <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>
                        {
                          distributor.managers.join(', ')
                        }
                      </Text>
                      <Text style={[styles.tinyText, styles.primary, styles.bold, styles.center]}>{distributor.address}</Text>
                    </View>
                    <View style={{position: 'absolute', right: 0, bottom: 0, padding: 5, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 5, backgroundColor: stylesheet.Primary}}>
                      <Text style={[styles.tinyText, styles.secondary, {marginTop: 2}]}>{distributor.status}</Text>
                    </View>
                  </View>
                  <View style={[styles.defaultRowContainer, styles.fullWidth, styles.center, {padding: 10, backgroundColor: '#F9F9F9', borderBottomLeftRadius: 10, borderBottomRightRadius: 10}]}>
                    <TouchableOpacity style={{marginLeft: 15, marginRight: 15}} onPress={() => openMaps(distributor)}>
                      <Feather name="map-pin" size={28} color="black" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </>
            )
          })
        }
      </ScrollView>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={actionSheetRef}>
        <View>
          <View style={styles.line}></View>
          <View style={[styles.paddedWidth, styles.defaultColumnContainer]}>
            <Text style={[styles.baseText, styles.fullWidth, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Sort By</Text>
            <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Route Letter</Text>
            <Picker
              style={{marginTop: 0}}
              selectedValue={routeLetter}
              onValueChange={(itemValue, itemIndex) =>
                setRouteLetter(itemValue)
              }>
              <Picker.Item label="Any" value={null} />
              <Picker.Item label="A (Chicago)" value="A" />
              <Picker.Item label="B (Waukegan)" value="B" />
              <Picker.Item label="C (Joliet)" value="C" />
              <Picker.Item label="D (Elgin)" value="D" />
              <Picker.Item label="E (Aurora)" value="E" />
              <Picker.Item label="F (Evergreen)" value="F" />
            </Picker>
          </View>
        </View>
      </ActionSheet>
      <ActionSheet containerStyle={{paddingBottom: 20, backgroundColor: stylesheet.Secondary}} indicatorColor={stylesheet.Tertiary} gestureEnabled={true} ref={createSheetRef}>
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
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Enter Manager Info</Text>
            }
            {
              newSection === 2 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Enter Retailer Info</Text>
            }
            {
              newSection === 3 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Select Lines Available</Text>
            }
            {
              newSection === 4 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Select Retailer State</Text>
            }
            {
              newSection === 5 &&
              <Text style={[styles.baseText, styles.bold, styles.centerText, styles.tertiary, {marginTop: 10}]}>Enter Retailer Address</Text>
            }
            <View style={styles.spacer}></View>
            {
              newSection !== 5 &&
              <TouchableOpacity style={{marginLeft: 8, marginRight: 8}} onPress={() => setNewSection(newSection + 1)}>
                <Feather name="chevron-right" size={26} color="black" />
              </TouchableOpacity>
            }
            {
              newSection == 5 &&
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
                <Picker
                  style={{marginTop: 0}}
                  selectedValue={routeLetter}
                  onValueChange={(itemValue, itemIndex) => {
                      setNewRouteLetter(itemValue)
                      setNewSection(1)
                    }
                  }>
                  <Picker.Item label="None" value="" disabled={true} />
                  <Picker.Item label="A (Chicago)" value="A" />
                  <Picker.Item label="B (Waukegan)" value="B" />
                  <Picker.Item label="C (Joliet)" value="C" />
                  <Picker.Item label="D (Elgin)" value="D" />
                  <Picker.Item label="E (Aurora)" value="E" />
                  <Picker.Item label="F (Evergreen)" value="F" />
                </Picker>
              </>
            }
            {
              newSection === 1 &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>First Name</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter first name..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={givenName}
                  onChangeText={(text) => {
                    setGivenName(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 20}]}>Last Name</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 40, width: '100%'}, styles.baseInput]}
                  placeholder="Enter last name..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={familyName}
                  onChangeText={(text) => {
                    setFamilyName(text)
                  }}
                />
              </>
            }
            {
              newSection === 2 &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Company Name</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter name..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={companyName}
                  onChangeText={(text) => {
                    setCompanyName(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 10}]}>E-mail</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
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
                  style={[{marginTop: 10,  marginBottom: 40, width: '100%'}, styles.baseInput]}
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
              newSection === 3 &&
              <>
                <View style={[styles.defaultRowContainer]}>
                  <Checkbox
                    style={styles.checkbox}
                    value={lines.includes('herencia')}
                    onValueChange={() => {
                      if (lines.includes('herencia')) {
                        let c = lines.slice()
                        c.splice(lines.indexOf('herencia'), 1)
                        setLines(c)
                      } else {
                        setLines([...lines, 'herencia'])
                      }
                    }}
                    color={lines.includes('herencia') ? stylesheet.Primary : undefined}
                  />
                  <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginLeft: 10}]}>Herencia del Abuelo</Text>
                </View>
                {
                  lines.includes('herencia') &&
                  <>
                    <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 30}]}>Herencia del Abuelo Displays</Text>
                    <TextInput
                      style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                      placeholder="Enter amount..."
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      value={herencia_displays}
                      onChangeText={(text) => {
                        setHerenciaDisplays(text)
                      }}
                    />
                  </>
                }
              </>
            }
            {
              newSection === 4 &&
              <>
                <Picker
                  style={{marginTop: 0}}
                  selectedValue={stateCode}
                  onValueChange={(itemValue, itemIndex) => {
                      setStateCode(itemValue)
                      setNewSection(5)
                    }
                  }>
                  <Picker.Item label="Select..." value="" enabled={false} />
                  <Picker.Item label="Illinois" value="IL" />
                  <Picker.Item label="Wisconsin" value="WI" />
                  <Picker.Item label="Indiana" value="IN" />
                </Picker>
              </>
            }
            {
              newSection === 5 &&
              <>
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>Line 1</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter line 1..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={line1}
                  onChangeText={(text) => {
                    setLine1(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>Line 2</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter line 2..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={line2}
                  onChangeText={(text) => {
                    setLine2(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>City</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 20, width: '100%'}, styles.baseInput]}
                  placeholder="Enter city..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text)
                  }}
                />
                <Text style={[styles.baseText, styles.bold, styles.tertiary, {marginTop: 0}]}>Postal Code</Text>
                <TextInput
                  style={[{marginTop: 10,  marginBottom: 40, width: '100%'}, styles.baseInput]}
                  placeholder="Enter Postal Code..."
                  placeholderTextColor="#888"
                  keyboardType="default"
                  value={postalCode}
                  onChangeText={(text) => {
                    setPostalCode(text)
                  }}
                />
              </>
            }
          </View>
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}
