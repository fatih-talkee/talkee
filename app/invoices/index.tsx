import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  FileText,
  Search,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  professionalId: string;
  professional: {
    name: string;
    avatar: string;
    title: string;
  };
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  description: string;
  callDuration?: number; // in minutes
  callDate?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    professionalId: '1',
    professional: {
      name: 'Dr. Sarah Johnson',
      avatar:
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'Business Consultant',
    },
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 45.0,
    status: 'paid',
    description: 'Voice call consultation',
    callDuration: 30,
    callDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    professionalId: '2',
    professional: {
      name: 'Michael Chen',
      avatar:
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'Tech Advisor',
    },
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 75.5,
    status: 'pending',
    description: 'Video call consultation',
    callDuration: 45,
    callDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    professionalId: '3',
    professional: {
      name: 'Emma Wilson',
      avatar:
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'Life Coach',
    },
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 35.0,
    status: 'overdue',
    description: 'Voice call session',
    callDuration: 25,
    callDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    professionalId: '4',
    professional: {
      name: 'James Anderson',
      avatar:
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'Financial Advisor',
    },
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 120.0,
    status: 'paid',
    description: 'Video call consultation',
    callDuration: 60,
    callDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-005',
    professionalId: '5',
    professional: {
      name: 'Lisa Martinez',
      avatar:
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'Career Counselor',
    },
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 50.0,
    status: 'cancelled',
    description: 'Voice call consultation',
    callDuration: 0,
    callDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function InvoicesScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'paid' | 'pending' | 'overdue' | 'cancelled'
  >('all');

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.professional.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'all' || invoice.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filters = [
    {
      key: 'all',
      label: 'All',
      count: mockInvoices.length,
    },
    {
      key: 'paid',
      label: 'Paid',
      count: mockInvoices.filter((i) => i.status === 'paid').length,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: mockInvoices.filter((i) => i.status === 'pending').length,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      count: mockInvoices.filter((i) => i.status === 'overdue').length,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: mockInvoices.filter((i) => i.status === 'cancelled').length,
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return theme.colors.success;
      case 'pending':
        return theme.colors.accent;
      case 'overdue':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'pending':
        return <Clock size={16} color={theme.colors.accent} />;
      case 'overdue':
        return <XCircle size={16} color={theme.colors.error} />;
      case 'cancelled':
        return <XCircle size={16} color={theme.colors.textMuted} />;
      default:
        return null;
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    // Handle invoice download
    console.log('Download invoice:', invoiceId);
  };

  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <Card
      style={[
        styles.invoiceCard,
        {
          backgroundColor:
            theme.name === 'dark' ? '#000000' : theme.colors.card,
          borderColor:
            theme.name === 'dark'
              ? 'rgba(255, 255, 255, 0.3)'
              : theme.colors.border,
          borderWidth: 1.5,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.invoiceContainer}
        onPress={() => router.push(`/professional/${item.professionalId}`)}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.professionalInfo}>
            <Image
              source={{ uri: item.professional.avatar }}
              style={styles.avatar}
            />
            <View style={styles.professionalDetails}>
              <Text
                style={[styles.professionalName, { color: theme.colors.text }]}
              >
                {item.professional.name}
              </Text>
              <Text
                style={[
                  styles.professionalTitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {item.professional.title}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            {getStatusIcon(item.status)}
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.invoiceRow}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              Invoice #
            </Text>
            <Text style={[styles.invoiceNumber, { color: theme.colors.text }]}>
              {item.invoiceNumber}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              Date
            </Text>
            <View style={styles.dateRow}>
              <Calendar size={14} color={theme.colors.textMuted} />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {formatDate(item.date)}
              </Text>
            </View>
          </View>

          {item.callDuration && (
            <View style={styles.invoiceRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                Duration
              </Text>
              <Text style={[styles.durationText, { color: theme.colors.text }]}>
                {item.callDuration} min
              </Text>
            </View>
          )}

          <View style={styles.invoiceRow}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              Description
            </Text>
            <Text
              style={[styles.descriptionText, { color: theme.colors.text }]}
            >
              {item.description}
            </Text>
          </View>

          <View
            style={[styles.amountRow, { borderTopColor: theme.colors.border }]}
          >
            <Text style={[styles.amountLabel, { color: theme.colors.text }]}>
              Amount
            </Text>
            <View style={styles.amountContainer}>
              <DollarSign size={20} color={theme.colors.primary} />
              <Text
                style={[styles.amountValue, { color: theme.colors.primary }]}
              >
                {item.amount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.downloadButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => handleDownloadInvoice(item.id)}
        >
          <Download size={16} color={theme.colors.primary} />
          <Text style={[styles.downloadText, { color: theme.colors.primary }]}>
            Download
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header showLogo showBack backPosition="right" />

      <View style={[styles.searchSection, { backgroundColor: '#000000' }]}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search invoices..."
          leftIcon={<Search size={20} color={theme.colors.textMuted} />}
          style={[
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        />

        <View style={styles.filters}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
                selectedFilter === filter.key &&
                  theme.name === 'dark' && {
                    backgroundColor: theme.colors.accent,
                    borderColor: theme.colors.accent,
                  },
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: theme.colors.textSecondary },
                  selectedFilter === filter.key && { color: '#000000' },
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoiceItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Invoices
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Your invoices will appear here once you make calls with
              professionals
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  listContent: {
    padding: 24,
  },
  invoiceCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  invoiceContainer: {
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  professionalTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  invoiceDetails: {
    gap: 12,
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  invoiceNumber: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  durationText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  downloadText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
