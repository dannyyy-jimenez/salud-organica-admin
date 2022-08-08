import { StyleSheet, Platform, Dimensions } from 'react-native';

let Primary = '#00A36C'; // 4ECDC4 0B3954 FF6F59 43AA8B 5CC8FF
let PrimaryOpaque = "rgba(219, 17, 59, 0.7)";
let Secondary = '#FFFFFF'; // FFF -> DDD
let Tertiary =  '#111111'; //111111 -> 222222
let SecondaryTint = '#F9F9F9'; //
let StatusBar = 'light-content';

const Styles = StyleSheet.create({
  miniText: {
    fontSize: 10
  },
  tinyText: {
    fontSize: 12
  },
  paddedSides: {
    paddingLeft: 10,
    paddingRight: 10
  },
  chip: {
    minHeight: 40,
    minWidth: 80,
    textAlign: 'center',
    backgroundColor: "#F9F9F9",
    paddingLeft: 25,
    paddingRight: 25,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 5,
    marginRight: 20
  },
  baseText: {
    fontSize: 15,
    letterSpacing: 0.6
  },
  subHeaderText: {
    fontSize: 20
  },
  subHeaderTextAlt: {
    fontSize: 24
  },
  headerText: {
    fontSize: 28
  },
  megaText: {
    fontSize: 36
  },
  primary: {
    color: Primary
  },
  secondary: {
    color: Secondary
  },
  tertiary: {
    color: Tertiary
  },
  bold: {
    fontWeight: '700'
  },
  spacer: {
    flex: 1,
    flexGrow: 1
  },
  baseInput: {
    ...Platform.select({
      web: {
        caretColor: Primary,
        outlineColor: Secondary,
      }
    }),
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 16,
    letterSpacing: 1.3,
    textAlign: 'center'
  },
  inputMultiline: {
    lineHeight: 26,
    height: 96
  },
  baseInputHeader: {
    paddingLeft: 4,
    paddingRight: 4,
    width: '85%',
  },
  baseInputContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '85%'
  },
  inputMulti: {
    width: 'auto',
    flexGrow: 1
  },
  alignLeft: {
    textAlign: 'left',
  },
  inputHasHeader: {
    width: '85%',
    height: 46
  },
  filledInput: {
    backgroundColor: SecondaryTint,
    width: '85%',
    height: 48,
    borderRadius: 5
  },
  disabled: {
    opacity: 0.3
  },
  roundedButton: {
    width: '85%',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    marginTop: 4,
    marginBottom: 4
  },
  filled: {
    backgroundColor: Primary
  },
  filledTertiary: {
    backgroundColor: Tertiary
  },
  clear: {
    backgroundColor: Secondary
  },
  centerText: {
    textAlign: 'center'
  },
  opaque: {
    opacity: 0.8
  },
  opaquer: {
    opacity: 0.3
  },
  defaultTabContainer: {
    height: '100%',
    width: '100%',
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'column'
  },
  defaultTabHeader: {
    ...Platform.select({
      ios: {
        height: 64
      },
      android: {
        height: 96
      }
    }),
    width: '100%',
    display: 'flex',
    paddingLeft: 15,
    paddingRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  defaultTabContent: {
    flexGrow: 1,
    flex: 1,
    width: '98%',
    marginLeft: '1%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowTabContent: {
    flexGrow: 1,
    flex: 1,
    width: '98%',
    marginLeft: '1%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  defaultTabScrollContent: {
    flexGrow: 1,
    flex: 1,
    width: '100%',
    minHeight: '100%'
  },
  baseSwitchContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '85%',
    paddingLeft: 4,
    paddingRight: 4,
    height: 40,
    marginTop: 10,
    alignItems: 'center'
  },
  baseSwitchHeader: {
    flexGrow: 1
  },
  caps: {
    textTransform: 'uppercase'
  },
  cardNumber: {
    letterSpacing: 1.3
  },
  cardContainer: {
    width: 350,
    height: 220,
    backgroundColor: Primary,
    borderRadius: 15,
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 18,
    paddingBottom:18
  },
  defaultRowContainer: {
    flexDirection: 'row'
  },
  actionListItem: {
    height: 45,
    marginTop: 2.5,
    marginBottom: 2.5,
    paddingTop: 5,
    paddingBottom: 5
  },
  fullWidth: {
    width: '100%'
  },
  paddedWidth: {
    width: '80%',
    marginLeft: '10%'
  },
  insetWidth: {
    width: '94%',
    marginLeft: '3%'
  },
  marginWidth: {
    width: '90%',
    marginLeft: '5%',
    marginRight: '5%'
  },
  profileBrandLogo: {
    width: 80,
    height: 80,
    padding: 25,
    borderRadius: 40,
    backgroundColor: SecondaryTint,
    resizeMode: 'contain'
  },
  defaultBrandLogo: {
    width: '20%',
    height: 50,
    resizeMode: 'contain'
  },
  defaultColumnContainer: {
    flexDirection: 'column'
  },
  fullHeight: {
    height: '100%'
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  defaultZoomImageContainer: {
    height: 380,
    width: '100%',
  },
  defaultZoomImage: {
    height: 380,
    width: '100%',
    resizeMode: 'contain'
  },
  defaultZoomMultiImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'contain'
  },
  defaultLandingImage: {
    height: 200,
    width: 200,
    resizeMode: 'contain'
  },
  defaultLandingImageSmall: {
    height: 110,
    width: 110,
    resizeMode: 'contain'
  },
  zoomColor: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: SecondaryTint,
    borderColor: Tertiary,
    borderWidth: 2,
    marginRight: 4
  },
  defaultStoreCard: {
    minHeight: 205,
    width: '40%',
    minWidth: 100,
    maxWidth: 220,
    marginLeft: 5,
    marginRight: 5,
    marginTop: 8
  },
  defaultStoreCardMini: {
    minHeight: 150,
    width: '45%',
    minWidth: 110,
    maxWidth: 220,
    marginTop: 10
  },
  defaultSCImage: {
    height: 140,
    width: '100%',
    resizeMode: 'contain',
    backgroundColor: SecondaryTint,
    borderTopRightRadius: 5,
    borderTopLeftRadius: 5
  },
  featuredSCContent: {
    minHeight: 25,
    width: '100%',
    backgroundColor: SecondaryTint,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 5,
    padding: 5,
    paddingLeft: 10,
    paddingRight: 10
  },
  defaultSCContent: {
    minHeight: 60,
    width: '100%',
    backgroundColor: SecondaryTint,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 5,
    padding: 5,
    paddingLeft: 10,
    paddingRight: 10
  },
  fullStoreCard: {
    minHeight: 100,
    width: 350,
    marginLeft: 10,
    marginRight: 10,
    maxWidth: '98%',
    marginTop: 20,
    marginBottom: 20
  },
  fullInvoice: {
    minHeight: 200,
    width: '100%',
    maxWidth: '100%',
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 5,
    backgroundColor: '#FCFCFC'
  },
  fullSCImage: {
    height: 200,
    width: '100%',
    resizeMode: 'contain',
    backgroundColor: Primary,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10
  },
  fullSCContent: {
    minHeight: 60,
    width: '100%',
    backgroundColor: SecondaryTint,
    borderBottomRightRadius: 10,
    borderBottomLeftRadius: 10,
    padding: 10,
    paddingLeft: 10,
    paddingRight: 10
  },
  backArrow: {
    padding: 8
  },
  defaultLoader: {
    position: 'absolute',
    zIndex: 1000,
    top: 0,
    backgroundColor: Secondary,
  },
  line: {
    height: 1,
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: Tertiary,
    opacity: 0.2,
    borderRadius: 4
  },
  analyticCard: {
    height: 220,
    marginRight: 20,
    width: 160,
    borderRadius: 5,
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 10,
  },
  analyticCardF: {
    height: 250,
    marginLeft: 10,
    marginRight: 10,
    width: 350,
    maxWidth: '98%',
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 5,
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 10,
  },
  statCard: {
    width: 150,
    margin: 5,
    minHeight: 120,
    borderRadius: 5,
    padding: 20,
    backgroundColor: SecondaryTint
  },
  statCardM: {
    width: 100,
    ...Platform.select({
      android: {
        width: '30%',
      }
    }),
    margin: 5,
    minHeight: 80,
    borderRadius: 5,
    padding: 10,
    backgroundColor: SecondaryTint
  },
  defaultInventoryCardAddon: {
    width: '90%',
    height: 90,
    marginLeft: '5%',
    marginRight: '5%',
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
  },
  elevated: {
    shadowColor: "black",
    shadowRadius: 10,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5
  },
  switchable: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    height: 50
  },
  switchie: {
    width: '49%',
    height: '98%',
    borderRadius: 20,
    marginLeft: '0.5%',
    marginRight: '0.5%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchieOn: {
    backgroundColor: Primary,
    shadowColor: 'black',
    shadowRadius: 5,
    shadowOpacity: 0.30,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5
  },
  defaultInventoryCardAddonSmall:{
    width: '25%',
    height: 100,
    marginLeft: '2%',
    marginRight: '2%',
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
  },
  fab: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    height: 60,
    width: 60,
    backgroundColor: Primary ,
    borderRadius: 30,
    shadowColor: "black",
    shadowRadius: 10,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5
  }
});

export {
  Styles,
  Primary,
  PrimaryOpaque,
  Secondary,
  SecondaryTint,
  Tertiary,
  StatusBar
}
