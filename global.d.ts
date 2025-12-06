declare module '@/*';
declare module '@components/*';
declare module '@lib/*';
declare module '@services/*';
declare module '@hooks/*';
declare module '@contexts/*';
declare module '@types/*';
declare module '@utils/*';
declare module '@assets/*';

// Window type for React Native Web
interface Window {
  location: {
    origin: string;
    href: string;
    pathname: string;
  };
}
declare var window: Window | undefined;
