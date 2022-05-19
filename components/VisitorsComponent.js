import * as React from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ActionSheet from "react-native-actions-sheet";
import Api from '../Api'

let stylesheet = require('../Styles')
let styles = stylesheet.Styles;

const actionSheetRef = React.createRef();

export default function VisitorsComponent() {
  const [visitors, setVisitors] = React.useState([])
  const animationRef = React.useRef(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState({
    min: '',
    max: '',
    sort: 'newest'
  });
  const [sortBy, setSortBy] = React.useState("newest");

  const load = async () => {
    setIsLoading(true)

    try {
      const res = API.get('/admin/orders');

      if (res.isError) throw 'error';

      setVisitors(res.data._v)
    } catch (e) {
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
        <Text style={[styles.baseText, styles.bold, styles.tertiary]}>Visitors</Text>
        <View style={styles.spacer}></View>
        <MaterialIcons name="sort" size={24} color={stylesheet.Secondary} />
      </View>
      <ScrollView style={styles.defaultTabScrollContent} contentContainerStyle={{alignItems: 'flex-start', justifyContent: 'flex-start', width: '90%', marginLeft: '5%'}} refreshControl={<RefreshControl refreshing={isLoading} tintColor={stylesheet.Primary} colors={[stylesheet.Primary]} onRefresh={load} />}>
        {
          isLoading &&
          <LottieView
              ref={animationRef}
              style={{
                width: '100%',
                backgroundColor: '#fff',
              }}
              source={require('..//assets/5166-users-icons.json')}
              // OR find more Lottie files @ https://lottiefiles.com/featured
              // Just click the one you like, place that file in the 'assets' folder to the left, and replace the above 'require' statement
            />
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
