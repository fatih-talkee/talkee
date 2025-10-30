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
}

interface PromotionCarouselProps {
  promotions: Promotion[];
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export function PromotionCarousel({ promotions }: PromotionCarouselProps) {
  const handlePromotionPress = (promotion: Promotion) => {
    if (promotion.id === '1') {
      // Navigate to Become a Professional screen for the first promotion
      router.push('/become-professional');
    } else {
      // Handle other promotions
      console.log('Promotion pressed:', promotion.title);
    }
  };

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <TouchableOpacity
      style={styles.promotionCard}
      activeOpacity={0.9}
      onPress={() => handlePromotionPress(item)}
    >
      <Image source={{ uri: item.image }} style={styles.backgroundImage} />
      <LinearGradient colors={item.gradient} style={styles.overlay}>
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
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

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
    marginTop: 20,
  },
  carouselContent: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  promotionCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
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
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
