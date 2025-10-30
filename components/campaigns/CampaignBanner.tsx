import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Promotion } from '@/mockData/professionals';

interface CampaignBannerProps {
  campaign: Promotion;
  onPress: () => void;
}

const { width } = Dimensions.get('window');

export function CampaignBanner({ campaign, onPress }: CampaignBannerProps) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: campaign.image }} style={styles.backgroundImage} />
      <LinearGradient
        colors={campaign.gradient || ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
        style={styles.overlay}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.subtitle}>{campaign.subtitle}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onPress}>
            <Text style={styles.ctaText}>{campaign.ctaText}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 48,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
});