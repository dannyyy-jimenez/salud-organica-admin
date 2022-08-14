import * as React from 'react';
import { Linking, Platform, ScrollView, Share, Image, Pressable, TextInput, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import Api from '../Api'
import * as Location from 'expo-location';
import haversine from 'haversine-distance'
import {Picker} from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import MapView, {Marker} from 'react-native-maps';

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();
const createSheetRef = React.createRef();

class Distributor {
  constructor(identifier, company, managers, address, lines, lat, lng, status, route) {
    this.identifier = identifier;
    this.company = company;
    this.managers = managers;
    this.address = address;
    this.lines = lines;
    this.lat = lat;
    this.lng = lng;
    this.status = status;
    this.route = route;
  }
}

export default function DistributorsMap({navigation, route}) {
  const [distributors, setDistributors] = React.useState([])

  const load = async () => {

    setDistributors([])
    try {
      const res = await Api.get('/admin/distributors', {route: route.params.letter, isMap: true});

      if (res.isError) throw res;

      let dists = res.data._d.map(distributor => new Distributor(distributor.identifier, distributor.company, distributor.managers, distributor.address, distributor.lines, distributor.lat, distributor.lng, distributor.status, distributor.route, null))

      setDistributors(dists)
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  return (
    <SafeAreaView style={styles.defaultTabContainer}>
      <View style={styles.defaultTabHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          underlayColor='#fff'>
          <Feather name="chevron-left" size={24} color={stylesheet.Primary} />
        </TouchableOpacity>
        <View style={styles.spacer}></View>
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Map {route.params.letter ? `Route ${route.params.letter}` : ""}</Text>
        <View style={styles.spacer}></View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          underlayColor='#fff'>
          <Feather name="chevron-left" size={24} color={stylesheet.Secondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.defaultTabScrollContent, {alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%'}]}>
        <MapView showsUserLocation={true} style={StyleSheet.absoluteFillObject}>
          {
            distributors.map((distributor, index) => {
              return (
                <Marker key={index} coordinate={{latitude : distributor.lat , longitude : distributor.lng}} title={distributor.company} description={distributor.identifier}>
                  <Image source={require('../assets/map-pin.png')} style={{height: 35, resizeMode: 'contain', width:35 }} />
                </Marker>
              )
            })
          }
        </MapView>
      </View>
    </SafeAreaView>
  );
}
