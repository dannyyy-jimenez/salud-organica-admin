import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View, Vibration } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import API from './Api'

import DashboardComponent from './components/DashboardComponent'
import OrdersComponent from './components/OrdersComponent'
import OrderComponent from './components/OrderComponent'
import VisitorsComponent from './components/VisitorsComponent'
import DistributorsComponent from './components/DistributorsComponent'
import DistributorsMapComponent from './components/DistributorsMapComponent'
import DistributorComponent from './components/DistributorComponent'
import DistributorDepthComponent from './components/DistributorDepthComponent'
import InvoicesComponent from './components/InvoicesComponent'
import InhouseInvoicesComponent from './components/InhouseInvoicesComponent'
import SlipsComponent from './components/PackingSlipComponent'
import Carts from './components/Carts'

const styles = require('./Styles');

const Tab = createBottomTabNavigator();
const OrdersStack = createNativeStackNavigator();
const VisitorsStack = createNativeStackNavigator();
const CartsStack = createNativeStackNavigator();
const DistributorsStack = createNativeStackNavigator();
const InboxStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();

function DashboardStackComponent() {
  return (
    <DashboardStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardComponent} />
      <DistributorsStack.Screen name="DistributorView" component={DistributorComponent} />
      <OrdersStack.Screen name="OrderView" component={OrderComponent} />
    </DashboardStack.Navigator>
  )
}


function OrdersStackComponent() {
  return (
    <OrdersStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <OrdersStack.Screen name="OrdersHome" component={OrdersComponent} />
      <OrdersStack.Screen name="OrderView" component={OrderComponent} />
    </OrdersStack.Navigator>
  )
}

function CartsStackComponent() {
  return (
    <CartsStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <CartsStack.Screen name="CartsHome" component={Carts} />
    </CartsStack.Navigator>
  )
}

function VisitorsStackComponent() {
  return (
    <VisitorsStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <VisitorsStack.Screen name="VisitorsHome" component={VisitorsComponent} />
    </VisitorsStack.Navigator>
  )
}

function InboxStackComponent() {
  return (
    <InboxStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <InboxStack.Screen name="InboxInhouseInvoices" component={InhouseInvoicesComponent} />
      <InboxStack.Screen name="InboxInvoices" component={InvoicesComponent} />
      <InboxStack.Screen name="InboxSlips" component={SlipsComponent} />
    </InboxStack.Navigator>
  )
}

function DistributorsStackComponent() {
  return (
    <DistributorsStack.Navigator screenOptions={{
      headerBackVisible: false,
      headerBackTitle: false,
      headerShown: false,
      contentStyle: {
        backgroundColor: 'white'
      }
    }}>
      <DistributorsStack.Screen name="DistributorsHome" component={DistributorsComponent} />
      <DistributorsStack.Screen name="DistributorsMap" component={DistributorsMapComponent} />
      <DistributorsStack.Screen name="DistributorView" component={DistributorComponent} />
      <DistributorsStack.Screen name="DistributorDepth" component={DistributorDepthComponent} />
    </DistributorsStack.Navigator>
  )
}

export default function App() {
  const notificationListener = React.useRef();
  const animationRef = React.useRef(null)
  const [appIsReady, setAppIsReady] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const [notificationObject, setNotificationObject] = React.useState({})
  const [notifToken, setNotificationToken] = React.useState(null)
  const [userDeviceID, setUserDeviceID] = React.useState(null)
  const colorScheme = Appearance.getColorScheme();
  const [permissions, setPermissions] = React.useState([])

  React.useEffect(() => {
    Notifications.setBadgeCountAsync(0);
    const load = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.log(e);
      }
      await prepareResources();
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        Vibration.vibrate();
        Notifications.setBadgeCountAsync(0);
      });

    }
    load();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const action = response.notification.request.content.data.action;
      const serial = response.notification.request.content.data.serial;
      if (!action) return;

    });
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    SplashScreen.hideAsync();
  }, [appIsReady])

   const prepareResources = async () => {
     try {
       let savedUUID = await SecureStore.getItemAsync('SSPK');
       if (!savedUUID) {
         savedUUID = uuidv4();
         await SecureStore.setItemAsync('SSPK', savedUUID);
       }

       setUserDeviceID(savedUUID)

       const res = await API.get('/admin/auth', {uuid: savedUUID})
       if (res.data && res.data.auth) {
         setPermissions(res.data._p)
         setAuthenticated(true)
       }

     } catch (e) {
       console.log(e)
     }

     try {
      const token = await registerForPushNotificationsAsync();
      if (token !== "") {
        setNotificationToken(token)
        setAppIsReady(true)
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <>
      <StatusBar style="dark"/>
      {
        !appIsReady &&
        <View style={{height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center'}}>
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                height: 400,
                backgroundColor: '#fff',
              }}
              autoPlay={true}
              loop={true}
              source={require('./assets/loading-leaf.json')}
            />
        </View>
      }
      {
        appIsReady && !authenticated &&
        <View style={{height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center'}}>
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                height: 400,
                backgroundColor: '#fff',
              }}
              autoPlay={true}
              loop={true}
              source={require('./assets/73435-fingerprint-fail.json')}
            />

            <Text selectable={true} style={[styles.baseText, styles.fullWidth, styles.bold, styles.primary, {marginTop: 10, marginBottom: 10}]}>{userDeviceID}</Text>
            <Text selectable={true} style={[styles.baseText, styles.fullWidth, styles.bold, styles.primary, {marginTop: 10, marginBottom: 10}]}>{notifToken}</Text>
        </View>
      }
      {
        appIsReady && authenticated &&
        <NavigationContainer>
          <Tab.Navigator initialRouteName="Orders" screenOptions={({route}) => ({
            headerBackVisible: false,
            headerBackTitle: false,
            headerShown: false,
            tabBarActiveTintColor: styles.Primary,
            tabBarInactiveTintColor: '#CCC',
            tabBarActiveBackgroundColor: styles.Secondary,
            tabBarInactiveBackgroundColor: styles.Secondary,
            tabBarShowLabel: true,
            tabBarShowIcon: true,
            tabBarStyle: {
              backgroundColor: styles.Secondary,
              borderTopWidth: 0
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Orders') {
                return <Feather name="package" size={size} color={color} />
              } else if (route.name === 'Carts') {
                return <Feather name="shopping-cart" size={size} color={color} />
              } else if (route.name === 'Dashboard') {
                return <Feather name="home" size={size} color={color} />
              } else if (route.name === 'Invoices') {
                return <Feather name="inbox" size={size} color={color} />
              } else if (route.name === 'Visitors') {
                return <FontAwesome5 name="users" size={size} color={color} />
              } else if (route.name === 'Retailers') {
                return <Ionicons name="car-sport" size={size} color={color} />
              }

              // You can return any component that you like here!
              return <Feather name="package" size={size} color={color} />
            }
          })}>
            <Tab.Screen name="Dashboard" component={DashboardStackComponent} />
            {
              permissions.includes("ORDERS") &&
              <Tab.Screen name="Orders" component={OrdersStackComponent} />
            }
            <Tab.Screen name="Orders" component={OrdersStackComponent} />

            <Tab.Screen name="Invoices" component={InboxStackComponent} />
            <Tab.Screen name="Retailers" component={DistributorsStackComponent} />
          </Tab.Navigator>
        </NavigationContainer>
      }
    </>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250]
    });
  }

  return token;
};
