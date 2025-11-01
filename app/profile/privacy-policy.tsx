import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  const handleContact = () => {
    Linking.openURL('mailto:support@talkee.app');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        title="Privacy Policy"
        leftButton={
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.name === 'light' ? theme.colors.brandPink : '#000000' },
            ]}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.lastUpdated, { color: theme.colors.textMuted }]}>
            Last updated: October 21, 2025
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Introduction
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            At Talkee, we value your privacy and are committed to protecting
            your personal information. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your data when you use our
            platform. By using Talkee, you agree to the collection and use of
            information in accordance with this policy.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Information We Collect
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We may collect the following types of information:
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Personal information (name, email address, phone number)
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Payment details and transaction history
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Communication and call data between users
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Device and usage data (IP address, device type, location, app
            logs)
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Profile information (photos, biography, professional credentials)
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            How We Use Your Information
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We use the collected data to:
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Provide, maintain, and improve our services
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Personalize your experience and recommendations
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Process payments and manage user accounts
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Ensure user safety and prevent fraud
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Communicate updates, offers, or support messages
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Analyze usage patterns and improve our platform
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data Protection
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We implement industry-standard security measures including advanced
            encryption, secure data storage, and regular security audits to
            protect your information. All payment information is processed
            through secure, PCI-compliant payment processors.
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            However, please note that no method of transmission over the
            internet or electronic storage is 100% secure. While we strive to
            use commercially acceptable means to protect your personal data, we
            cannot guarantee its absolute security.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data Sharing and Disclosure
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We do not sell your personal information to third parties. We may
            share your data only in the following circumstances:
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • With service providers who help us operate our platform
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • When required by law or to protect our legal rights
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • In connection with a business transaction (merger, acquisition, or
            sale)
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • With your explicit consent
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Your Rights
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            You have the right to:
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Access and review your personal data
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Update or correct your information
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Request deletion of your data
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Opt-out of marketing communications
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Export your data in a portable format
          </Text>
          <Text
            style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}
          >
            • Withdraw consent for data processing
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cookies and Tracking
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We use cookies and similar tracking technologies to track activity
            on our platform and hold certain information. You can instruct your
            browser to refuse all cookies or to indicate when a cookie is being
            sent.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Children's Privacy
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            Our service is not intended for users under the age of 18. We do not
            knowingly collect personal information from children. If you are a
            parent or guardian and believe your child has provided us with
            personal data, please contact us.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Changes to This Policy
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Last updated" date. We encourage you to review
            this Privacy Policy periodically.
          </Text>

          <View
            style={[styles.divider, { backgroundColor: theme.colors.divider }]}
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Contact Us
          </Text>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            If you have any questions about this Privacy Policy or our data
            practices, please contact us at:
          </Text>
          <TouchableOpacity onPress={handleContact}>
            <Text
              style={[
                styles.link,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              support@talkee.app
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  link: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
