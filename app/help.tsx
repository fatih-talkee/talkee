import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { HelpCircle, Phone, CreditCard, Shield, Settings, User } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

const faqs = [
  {
    question: 'How do I find the right professional?',
    answer: 'Use our search and filter options to find professionals by category, price range, ratings, and availability. Read reviews from other users to make an informed decision.',
    category: 'Getting Started',
    icon: <User size={24} color="#ffffff" />,
  },
  {
    question: 'How does payment work?',
    answer: 'You\'ll be charged for the actual duration of your call. Payment is automatically processed after your session ends. Refunds are available for unsatisfactory experiences.',
    category: 'Payment',
    icon: <CreditCard size={24} color="#ffffff" />,
  },
  {
    question: 'Are calls private and secure?',
    answer: 'Yes, all calls are encrypted and private. Your conversations are confidential and not recorded without your explicit consent.',
    category: 'Privacy',
    icon: <Shield size={24} color="#ffffff" />,
  },
  {
    question: 'Can I become a professional?',
    answer: 'Absolutely! If you have expertise in your field, you can apply to become a professional on our platform. Visit your profile settings to get started.',
    category: 'Professional',
    icon: <Settings size={24} color="#ffffff" />,
  },
  {
    question: 'What types of calls are available?',
    answer: 'We offer voice calls, video calls, and text messaging. Choose the option that best fits your needs and preferences.',
    category: 'Getting Started',
    icon: <Phone size={24} color="#ffffff" />,
  },
  {
    question: 'How do I block a user?',
    answer: 'You can block any user from your call history or wallet history pages. Blocked users will appear in your "Blocked Users" section in your profile.',
    category: 'Privacy',
    icon: <Shield size={24} color="#ffffff" />,
  },
  {
    question: 'Can I reschedule or cancel a call?',
    answer: 'Yes, you can reschedule or cancel calls through the appointments calendar. Cancellations made within 24 hours may be subject to fees.',
    category: 'Getting Started',
    icon: <CreditCard size={24} color="#ffffff" />,
  },
  {
    question: 'How do I add credits to my wallet?',
    answer: 'Navigate to your wallet tab and select "Add Credits". Choose from our credit packages and complete the secure payment process.',
    category: 'Payment',
    icon: <CreditCard size={24} color="#ffffff" />,
  },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Getting Started': return '#007AFF';
    case 'Payment': return '#30D158';
    case 'Privacy': return '#FF9F0A';
    case 'Professional': return '#5856D6';
    default: return '#8E8E93';
  }
};

export default function HelpScreen() {
  const { theme } = useTheme();
  const [expandedFaq, setExpandedFaq] = React.useState<string | null>(null);

  const toggleFaq = (question: string) => {
    setExpandedFaq(expandedFaq === question ? null : question);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showLogo showBack backPosition="right" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}>
            <HelpCircle size={40} color="#ffffff" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            Help Center
          </Text>
          <Text style={[styles.heroDescription, { color: theme.colors.textMuted }]}>
            Find answers to common questions and get support
          </Text>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Links
          </Text>
          <TouchableOpacity 
            style={[styles.quickLinkCard, { backgroundColor: theme.colors.card }]}
            onPress={() => {/* Navigate to help docs */}}
          >
            <HelpCircle size={24} color={theme.colors.primary} />
            <View style={styles.quickLinkText}>
              <Text style={[styles.quickLinkTitle, { color: theme.colors.text }]}>
                Getting Started Guide
              </Text>
              <Text style={[styles.quickLinkDescription, { color: theme.colors.textMuted }]}>
                Learn the basics of using Talkee
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Frequently Asked Questions
          </Text>
          {faqs.map((faq, index) => (
            <Card key={index} style={[styles.faqCard, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity 
                style={styles.faqHeader}
                onPress={() => toggleFaq(faq.question)}
              >
                <View style={styles.faqHeaderLeft}>
                  <View style={[styles.faqIcon, { backgroundColor: getCategoryColor(faq.category) }]}>
                    {faq.icon}
                  </View>
                  <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>
                    {faq.question}
                  </Text>
                </View>
                <Text style={[styles.expandIcon, { color: theme.colors.textMuted }]}>
                  {expandedFaq === faq.question ? '−' : '+'}
                </Text>
              </TouchableOpacity>
              {expandedFaq === faq.question && (
                <Text style={[styles.faqAnswer, { color: theme.colors.textMuted, borderTopColor: theme.colors.border }]}>
                  {faq.answer}
                </Text>
              )}
            </Card>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Still Need Help?
          </Text>
          <Card style={[styles.contactCard, { backgroundColor: theme.colors.card }]}>
            <Phone size={32} color={theme.colors.primary} />
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>
              Contact Support
            </Text>
            <Text style={[styles.contactDescription, { color: theme.colors.textMuted }]}>
              Our support team is available 24/7 to help you with any questions or issues
            </Text>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {/* Open support chat */}}
            >
              <Text style={styles.contactButtonText}>Get Help</Text>
            </TouchableOpacity>
          </Card>
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
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  quickLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  quickLinkText: {
    flex: 1,
    marginLeft: 16,
  },
  quickLinkTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  quickLinkDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  faqCard: {
    marginBottom: 12,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  expandIcon: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginLeft: 12,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  contactCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  contactButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  contactButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  bottomSpacing: {
    height: 40,
  },
});

