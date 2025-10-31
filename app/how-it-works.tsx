import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { UserSearch, MessageSquare, Phone, Video, CreditCard, Shield, Star, Clock } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    id: '1',
    title: 'Find Professionals',
    description: 'Browse through our extensive directory of verified professionals across various categories. Use filters to find experts that match your needs.',
    icon: <UserSearch size={24} color="#ffffff" />,
  },
  {
    id: '2',
    title: 'Book a Session',
    description: 'Choose between voice calls or video calls. Select a convenient time and secure your appointment with instant confirmation.',
    icon: <Clock size={24} color="#ffffff" />,
  },
  {
    id: '3',
    title: 'Connect & Consult',
    description: 'Start your call and get expert advice tailored to your needs. All calls are private and confidential.',
    icon: <Phone size={24} color="#ffffff" />,
  },
  {
    id: '4',
    title: 'Rate & Review',
    description: 'Share your experience with ratings and reviews. Help others make informed decisions and improve our community.',
    icon: <Star size={24} color="#ffffff" />,
  },
];

const features = [
  {
    title: 'Multiple Communication Options',
    description: 'Choose between voice calls, video calls, and text messaging based on your preference and needs.',
    icon: <Video size={28} color="#ffffff" />,
    color: '#007AFF',
  },
  {
    title: 'Secure Payments',
    description: 'All transactions are encrypted and secure. Pay only for the time you use with transparent pricing.',
    icon: <CreditCard size={28} color="#ffffff" />,
    color: '#30D158',
  },
  {
    title: 'Verified Professionals',
    description: 'Every professional is thoroughly vetted and verified to ensure quality service and expertise.',
    icon: <Shield size={28} color="#ffffff" />,
    color: '#FF9F0A',
  },
  {
    title: 'Real-time Messaging',
    description: 'Chat with professionals before or after your call. Get quick answers and follow-up support.',
    icon: <MessageSquare size={28} color="#ffffff" />,
    color: '#5856D6',
  },
];

export default function HowItWorksScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            How Talkee Works
          </Text>
          <Text style={[styles.heroDescription, { color: theme.colors.textMuted }]}>
            Connect with verified professionals and get expert advice in just a few simple steps
          </Text>
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Getting Started
          </Text>
          {steps.map((step, index) => (
            <Card key={step.id} style={[styles.stepCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.stepContent}>
                <View style={[styles.stepIconContainer, { backgroundColor: theme.colors.primary }]}>
                  {step.icon}
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.stepNumber, { color: theme.colors.textMuted }]}>
                    Step {step.id}
                  </Text>
                  <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.textMuted }]}>
                    {step.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Key Features
          </Text>
          {features.map((feature, index) => (
            <Card key={index} style={[styles.featureCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color }]}>
                  {feature.icon}
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.colors.textMuted }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  stepCard: {
    marginBottom: 12,
    padding: 16,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepText: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  featureCard: {
    marginBottom: 12,
    padding: 16,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

