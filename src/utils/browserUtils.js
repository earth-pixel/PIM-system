/**
 * Detects if the web app is running inside a mobile in-app browser (e.g. LINE, Facebook, Instagram)
 * which typically block direct blob or file downloads.
 */
export const checkIsInAppBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window && window.opera) || '';
  
  const rules = [
    'Line/', // LINE App
    'FBAN/', // Facebook App for iOS
    'FBAV/', // Facebook App for Android
    'Instagram', // Instagram App
    'Messenger/', // FB Messenger
    'FB_IAB/', // Facebook In-App Browser
    'Twitter', // Twitter In-App Browser
    'Snapchat', // Snapchat In-App Browser
    'WeChat/', // WeChat
    'MicroMessenger/' // WeChat alternative
  ];
  
  return rules.some(rule => ua.indexOf(rule) > -1);
};
