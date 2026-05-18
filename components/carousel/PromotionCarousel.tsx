import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
  ColorValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  gradient: string[];
  ctaLink?: string;
}

interface PromotionCarouselProps {
  promotions: Promotion[];
  isProfessional?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export function PromotionCarousel({
  promotions,
  isProfessional = false,
}: PromotionCarouselProps) {
  const handlePromotionPress = (promotion: Promotion) => {
    try {
      if (promotion.ctaLink) {
        // ✅ Conditional routing: If "Get Started" button points to become-professional
        // and user is already professional, redirect to professional-settings instead
        if (
          (promotion.ctaLink === '/become-professional' ||
            promotion.ctaLink === '/become-professional/index') &&
          isProfessional
        ) {
          router.push('/professional-settings' as any);
        } else {
          // Normalize route paths
          let normalizedLink = promotion.ctaLink;
          if (normalizedLink === '/become-professional') {
            normalizedLink = '/become-professional';
          }
          router.push(normalizedLink as any);
        }
      } else {
        router.push('/(tabs)/search');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const renderPromotion = ({ item }: { item: Promotion }) => {
    // ✅ Convert hex colors to rgba for transparency
    // Using 50% opacity (80 in hex) to allow background images to show through better
    const gradientColors = item.gradient.map((color) => {
      if (color.startsWith('#')) {
        return `${color}80`; // Adds 80 (50% opacity) to hex color for lighter overlay
      }
      return color;
    });

    return (
      <TouchableOpacity
        style={styles.promotionCard}
        activeOpacity={0.9}
        onPress={() => handlePromotionPress(item)}
      >
        <View style={styles.cardInner}>
          {/* ✅ Background Image */}
          <Image
            source={{ uri: item.image }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />

          {/* ✅ Semi-transparent Gradient Overlay */}
          <LinearGradient
            colors={gradientColors as [ColorValue, ColorValue, ...ColorValue[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overlay}
          >
            <View style={styles.content}>
              <View style={styles.textContent}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.ctaContainer}
                onPress={() => handlePromotionPress(item)}
              >
                <Text style={styles.ctaText}>{item.ctaText}</Text>
                <ArrowRight size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={promotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  carouselContent: {
    paddingLeft: 20,
    paddingRight: 24,
    paddingVertical: 16,
  },
  promotionCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    marginRight: 16,
    marginVertical: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 16px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
    ...(Platform.OS === 'web'
      ? { textShadow: '-1px 1px 10px rgba(0, 0, 0, 0.75)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.75)',
          textShadowOffset: { width: -1, height: 1 },
          textShadowRadius: 10,
        }),
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
    ...(Platform.OS === 'web'
      ? { textShadow: '-1px 1px 10px rgba(0, 0, 0, 0.75)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.75)',
          textShadowOffset: { width: -1, height: 1 },
          textShadowRadius: 10,
        }),
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
    marginRight: 8,
  },
});
