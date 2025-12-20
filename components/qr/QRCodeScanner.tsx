/**
 * QR Code Scanner Component
 *
 * Uses expo-camera to scan QR codes and parse deep links
 * Best practice: Uses expo-camera's built-in barcode scanning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/contexts/ThemeContext';
import { X } from 'lucide-react-native';
import { router } from 'expo-router';
import { logger } from '@/lib/logger';

interface QRCodeScannerProps {
  visible: boolean;
  onClose: () => void;
}

export function QRCodeScanner({ visible, onClose }: QRCodeScannerProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  // Request camera permission if not granted
  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarCodeScanned = ({
    data,
    type,
  }: {
    data: string;
    type: string;
  }) => {
    if (scanned) return; // Prevent multiple scans
    setScanned(true);

    logger.info('[QRCodeScanner] QR code scanned', { data, type });

    try {
      // Parse deep link: talkee://professional/{id}
      if (data.startsWith('talkee://professional/')) {
        const professionalId = data
          .replace('talkee://professional/', '')
          .trim();

        if (professionalId) {
          logger.info('[QRCodeScanner] Navigating to professional', {
            professionalId,
          });

          // Close scanner first
          onClose();

          // Small delay to ensure modal closes smoothly
          setTimeout(() => {
            router.push(`/professional/${professionalId}`);
          }, 300);
        } else {
          Alert.alert(
            'Invalid QR Code',
            'Professional ID not found in QR code'
          );
          setScanned(false);
        }
      } else if (data.startsWith('talkee://user/')) {
        // User profile (not professional)
        const userId = data.replace('talkee://user/', '').trim();

        if (userId) {
          logger.info('[QRCodeScanner] Navigating to user profile', { userId });
          onClose();
          setTimeout(() => {
            router.push(`/profile/${userId}`);
          }, 300);
        } else {
          Alert.alert('Invalid QR Code', 'User ID not found in QR code');
          setScanned(false);
        }
      } else if (data.includes('talkee.app/professional/')) {
        // Web URL fallback
        const match = data.match(/professional\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          const professionalId = match[1];
          logger.info('[QRCodeScanner] Navigating from web URL', {
            professionalId,
          });
          onClose();
          setTimeout(() => {
            router.push(`/professional/${professionalId}`);
          }, 300);
        } else {
          Alert.alert(
            'Invalid QR Code',
            'Could not extract professional ID from URL'
          );
          setScanned(false);
        }
      } else {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a Talkee profile link. Please scan a valid profile QR code.',
          [
            {
              text: 'Try Again',
              onPress: () => setScanned(false),
            },
            {
              text: 'Cancel',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (error) {
      logger.error('[QRCodeScanner] Error parsing QR code', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
      setScanned(false);
    }
  };

  if (!visible) return null;

  // Show permission request UI
  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View
          style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.9)' }]}
        >
          <View
            style={[
              styles.permissionContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.permissionTitle, { color: theme.colors.text }]}
            >
              Camera Permission Required
            </Text>
            <Text
              style={[styles.permissionText, { color: theme.colors.textMuted }]}
            >
              We need camera access to scan QR codes.
            </Text>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.text }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View
          style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.9)' }]}
        >
          <View
            style={[
              styles.permissionContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.permissionTitle, { color: theme.colors.text }]}
            >
              Camera Permission Denied
            </Text>
            <Text
              style={[styles.permissionText, { color: theme.colors.textMuted }]}
            >
              Please enable camera access in your device settings to scan QR
              codes.
            </Text>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.text }]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Scan QR Code
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setScanned(false);
              onClose();
            }}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={CameraType.back}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            {/* Overlay with scanning frame */}
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View
                  style={[
                    styles.corner,
                    styles.topLeft,
                    { borderColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.topRight,
                    { borderColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.bottomLeft,
                    { borderColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.bottomRight,
                    { borderColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.scanLine,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
            </View>
          </CameraView>
        </View>

        {/* Instructions */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[styles.instructionText, { color: theme.colors.textMuted }]}
          >
            Point your camera at a QR code to scan
          </Text>
          {scanned && (
            <Text style={[styles.scannedText, { color: theme.colors.primary }]}>
              QR code scanned! Processing...
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  scannedText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionContainer: {
    padding: 24,
    borderRadius: 16,
    margin: 20,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
