// Web mock for @stripe/stripe-react-native (native-only)
// This file is used when building for web platform
module.exports = {
  useStripe: () => null,
  useApplePay: () => null,
  useGooglePay: () => null,
  initPaymentSheet: () => Promise.resolve({ error: null }),
  presentPaymentSheet: () => Promise.resolve({ error: null }),
  confirmPayment: () => Promise.resolve({ error: null }),
  createPaymentMethod: () => Promise.resolve({ error: null }),
  retrievePaymentIntent: () => Promise.resolve({ error: null }),
  handleURLCallback: () => Promise.resolve(false),
  isPlatformPaySupported: () => Promise.resolve(false),
};
