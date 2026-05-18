import React from 'react';
import Svg, { Path, G, ClipPath, Defs, Rect, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  style?: any;
}

export const GoogleIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

export const FacebookIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Circle cx="12" cy="12" r="12" fill="#1877F2" />
    <Path
      fill="#fff"
      d="M15.84 8.04h-1.83c-1.44 0-1.72.69-1.72 1.69v2.22h3.42l-.44 3.46h-2.98V24h-3.57v-8.59H6.18V11.95h2.55V9.77c0-2.53 1.55-3.91 3.8-3.91 1.08 0 2.21.19 2.21.19v2.44h-.9z"
    />
  </Svg>
);

export const LinkedInIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Circle cx="12" cy="12" r="12" fill="#0077B5" />
    <Path
      fill="#fff"
      d="M7.67 9.8h2.66v8.53H7.67V9.8zM9 8.64a1.54 1.54 0 1 1 0-3.08A1.54 1.54 0 0 1 9 8.64zM11.96 9.8h2.55v1.4c.36-.68 1.23-1.4 2.54-1.4 2.7 0 3.2 1.78 3.2 4.1v4.43h-2.66v-3.92c0-.98-.35-1.65-1.22-1.65-.67 0-1.06.45-1.24.88-.06.15-.08.36-.08.57v4.12h-2.66V9.8h-1.43z"
    />
  </Svg>
);

export const EmailIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
     <Circle cx="12" cy="12" r="12" fill="#E0E0E0" />
     <Path
       fill="#757575"
       d="M19 8H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm0 2l-7 4.38L5 10v-.24l7 4.38 7-4.38V10z"
     />
  </Svg>
);

// Optional: Apple icon if needed in potential future, keeping it generic for now.
