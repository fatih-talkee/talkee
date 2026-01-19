import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  Alert,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { useInvoices } from '@/hooks/useInvoices';
import type {
  InvoiceWithRelations,
  InvoiceStatus,
} from '@/types/database.types';
import { PageLoading } from '@/components/ui/PageLoading';
import { supabase } from '@/lib/supabase';

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue' | 'cancelled';

export default function InvoicesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [avatarErrors, setAvatarErrors] = useState<{ [key: string]: boolean }>(
    {}
  );
  const { invoices = [], isLoading, error } = useInvoices('caller');

  // Log invoices when they load
  useEffect(() => {
    if (invoices.length > 0) {
      console.log('📋 Invoices loaded:', {
        count: invoices.length,
        invoices_with_url: invoices.filter((inv) => inv.pdf_url || inv.metadata?.hosted_url || inv.metadata?.invoice_pdf).length,
        invoices_without_url: invoices.filter((inv) => !inv.pdf_url && !inv.metadata?.hosted_url && !inv.metadata?.invoice_pdf).length,
        invoice_details: invoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          has_pdf_url: !!inv.pdf_url,
          has_metadata_hosted_url: !!inv.metadata?.hosted_url,
          has_metadata_invoice_pdf: !!inv.metadata?.invoice_pdf,
          stripe_invoice_id: inv.metadata?.stripe_invoice_id || 'MISSING',
        })),
      });
    }
  }, [invoices]);

  // ✅ Get user initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // ✅ Get avatar background color based on name (consistent color)
  const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const colors = [
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Helper function to determine if invoice is overdue
  const isOverdue = (invoice: InvoiceWithRelations): boolean => {
    if (invoice.status.toLowerCase() === 'paid') return false;
    if (invoice.status.toLowerCase() === 'cancelled') return false;
    if (invoice.status.toLowerCase() === 'refunded') return false;
    if (!invoice.due_date) return false;

    const dueDate = new Date(invoice.due_date);
    const now = new Date();
    return dueDate < now;
  };

  // Filter invoices by search query and status
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((invoice) => {
        const status = invoice.status.toLowerCase();
        if (selectedFilter === 'paid') {
          return status === 'paid';
        }
        if (selectedFilter === 'pending') {
          return status === 'pending' && !isOverdue(invoice);
        }
        if (selectedFilter === 'overdue') {
          return isOverdue(invoice);
        }
        if (selectedFilter === 'cancelled') {
          return status === 'cancelled' || status === 'refunded';
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((invoice) => {
        const professionalName =
          invoice.professional?.users?.name?.toLowerCase() || '';
        const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
        const professionalTitle =
          invoice.professional?.categories?.name?.toLowerCase() || '';

        return (
          professionalName.includes(query) ||
          invoiceNumber.includes(query) ||
          professionalTitle.includes(query)
        );
      });
    }

    return filtered;
  }, [invoices, selectedFilter, searchQuery]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const all = invoices.length;
    const paid = invoices.filter(
      (i) => i.status.toLowerCase() === 'paid'
    ).length;
    const pending = invoices.filter(
      (i) => i.status.toLowerCase() === 'pending' && !isOverdue(i)
    ).length;
    const overdue = invoices.filter((i) => isOverdue(i)).length;
    const cancelled = invoices.filter(
      (i) =>
        i.status.toLowerCase() === 'cancelled' ||
        i.status.toLowerCase() === 'refunded'
    ).length;

    return { all, paid, pending, overdue, cancelled };
  }, [invoices]);

  const filters = [
    {
      key: 'all',
      label: 'All',
      count: filterCounts.all,
    },
    {
      key: 'paid',
      label: 'Paid',
      count: filterCounts.paid,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: filterCounts.pending,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      count: filterCounts.overdue,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: filterCounts.cancelled,
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

  const getStatusColor = (invoice: InvoiceWithRelations) => {
    if (isOverdue(invoice)) {
      return theme.colors.error;
    }
    const statusLower = invoice.status.toLowerCase();
    switch (statusLower) {
      case 'paid':
        return theme.colors.success;
      case 'pending':
        return theme.colors.accent;
      case 'cancelled':
      case 'refunded':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (invoice: InvoiceWithRelations) => {
    if (isOverdue(invoice)) {
      return <XCircle size={16} color={theme.colors.error} />;
    }
    const statusLower = invoice.status.toLowerCase();
    switch (statusLower) {
      case 'paid':
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'pending':
        return <Clock size={16} color={theme.colors.accent} />;
      case 'cancelled':
      case 'refunded':
        return <XCircle size={16} color={theme.colors.textMuted} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (invoice: InvoiceWithRelations) => {
    if (isOverdue(invoice)) {
      return 'Overdue';
    }
    const statusLower = invoice.status.toLowerCase();
    return statusLower.charAt(0).toUpperCase() + statusLower.slice(1);
  };

  const handleDownloadInvoice = async (invoice: InvoiceWithRelations) => {
    if (invoice.pdf_url) {
      try {
        const canOpen = await Linking.canOpenURL(invoice.pdf_url);
        if (canOpen) {
          await Linking.openURL(invoice.pdf_url);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        console.error('Error opening PDF URL:', error);
        Alert.alert('Error', 'Failed to open invoice PDF');
      }
    }
  };

  const handleViewInvoice = async (invoice: InvoiceWithRelations) => {
    // Check if this is a credit purchase
    const isCreditPurchase =
      invoice.metadata?.type === 'credit_purchase' || !invoice.professional_id;

    // Log invoice data for debugging
    console.log('📄 Invoice View - Checking for URL:', {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      is_credit_purchase: isCreditPurchase,
      pdf_url: invoice.pdf_url,
      metadata: invoice.metadata,
      has_pdf_url: !!invoice.pdf_url,
      has_metadata_hosted_url: !!invoice.metadata?.hosted_url,
      has_metadata_invoice_pdf: !!invoice.metadata?.invoice_pdf,
      metadata_keys: invoice.metadata ? Object.keys(invoice.metadata) : [],
    });

    // For credit purchase, try pdf_url first, then metadata URLs
    // For regular invoices, try metadata hosted URLs first, then pdf_url
    let viewUrl = isCreditPurchase
      ? invoice.pdf_url ||
        invoice.metadata?.hosted_url ||
        invoice.metadata?.hostedUrl ||
        invoice.metadata?.invoice_pdf ||
        invoice.metadata?.url ||
        invoice.metadata?.view_url ||
        invoice.metadata?.viewUrl
      : invoice.metadata?.hosted_url ||
        invoice.metadata?.hostedUrl ||
        invoice.metadata?.invoice_pdf ||
        invoice.metadata?.url ||
        invoice.metadata?.view_url ||
        invoice.metadata?.viewUrl ||
        invoice.pdf_url;

    console.log('📄 Invoice View - URL check result:', {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      viewUrl: viewUrl || null,
      has_url: !!viewUrl,
      url_source: viewUrl
        ? isCreditPurchase
          ? invoice.pdf_url === viewUrl
            ? 'pdf_url'
            : invoice.metadata?.hosted_url === viewUrl
            ? 'metadata.hosted_url'
            : invoice.metadata?.invoice_pdf === viewUrl
            ? 'metadata.invoice_pdf'
            : 'other_metadata'
          : invoice.metadata?.hosted_url === viewUrl
          ? 'metadata.hosted_url'
          : invoice.pdf_url === viewUrl
          ? 'pdf_url'
          : 'other_metadata'
        : 'none',
    });

    // If no URL found, try to get it from Stripe
    if (!viewUrl) {
      const stripeInvoiceId = invoice.metadata?.stripe_invoice_id;
      const paymentIntentId = invoice.metadata?.payment_intent_id;
      
      console.log('No invoice URL found, attempting to fetch from Stripe:', {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        stripe_invoice_id: stripeInvoiceId,
        payment_intent_id: paymentIntentId,
        is_credit_purchase: isCreditPurchase,
      });

      if (stripeInvoiceId || paymentIntentId) {
        try {
          console.log('📞 Calling get-invoice-url edge function...', {
            invoice_id: invoice.id,
            stripe_invoice_id: stripeInvoiceId,
            payment_intent_id: paymentIntentId,
          });

          // Call edge function to get invoice URL from Stripe
          const { data, error } = await supabase.functions.invoke(
            'get-invoice-url',
            {
              body: {
                invoice_id: invoice.id,
                stripe_invoice_id: stripeInvoiceId,
                payment_intent_id: paymentIntentId,
              },
            }
          );

          console.log('📥 Edge function response:', {
            invoice_id: invoice.id,
            has_data: !!data,
            has_error: !!error,
            data_keys: data ? Object.keys(data) : [],
            error_message: error?.message,
            error_details: error,
          });

          if (error) {
            console.error('❌ Edge function error:', {
              invoice_id: invoice.id,
              error: error,
              error_message: error.message,
              error_context: error.context,
            });
            throw error;
          }

          // Check if response has error field (edge function may return error in data)
          if (data?.error) {
            console.error('❌ Error in edge function response:', {
              invoice_id: invoice.id,
              error: data.error,
            });
            throw new Error(data.error);
          }

          if (data?.url) {
            viewUrl = data.url;
            console.log('✅ Invoice URL fetched from Stripe:', {
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              url: viewUrl,
              hosted_invoice_url: data.hosted_invoice_url,
              invoice_pdf: data.invoice_pdf,
              invoice_status: data.status,
            });
            
            // Update invoice in database with the URL (async, don't wait)
            supabase
              .from('invoices')
              .update({ 
                pdf_url: data.url,
                metadata: {
                  ...invoice.metadata,
                  hosted_url: data.hosted_invoice_url || data.url,
                  invoice_pdf: data.invoice_pdf || data.url,
                }
              })
              .eq('id', invoice.id)
              .then((result) => {
                if (result.error) {
                  console.error('❌ Failed to update invoice URL in database:', {
                    invoice_id: invoice.id,
                    error: result.error.message,
                  });
                } else {
                  console.log('✅ Invoice URL updated in database:', {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    pdf_url: data.url,
                  });
                }
              })
              .catch((err) => {
                console.error('❌ Error updating invoice URL in database:', {
                  invoice_id: invoice.id,
                  error: err.message || err,
                });
              });
          } else {
            console.error('❌ URL not available from Stripe:', {
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              response_data: data,
            });
            throw new Error(data?.error || 'URL not available from Stripe');
          }
        } catch (error: any) {
          console.error('❌ Error fetching invoice URL from Stripe:', {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            error: error?.message || error,
            error_type: error?.constructor?.name,
            error_details: error,
            error_stack: error?.stack,
          });
          
          // Show user-friendly error message
          const errorMessage = error?.message || 'Unknown error occurred';
          const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('fetch');
          const isFunctionNotFound = errorMessage.includes('not found') || errorMessage.includes('404');
          
          if (isFunctionNotFound) {
            Alert.alert(
              'Function Not Available',
              'The invoice URL service is temporarily unavailable. Please try again later or contact support.',
              [{ text: 'OK' }]
            );
          } else if (isNetworkError) {
            Alert.alert(
              'Network Error',
              'Unable to connect to the server. Please check your internet connection and try again.',
              [{ text: 'OK' }]
            );
          } else {
            // Fallback: show invoice details
            if (isCreditPurchase) {
              Alert.alert(
                'Invoice Details',
                `Invoice #${
                  invoice.invoice_number
                }\n\nAmount: $${invoice.total_amount.toFixed(
                  2
                )}\nDate: ${formatDate(invoice.invoice_date)}\nStatus: ${
                  invoice.status
                }\n\n${invoice.notes || ''}\n\nNote: Invoice URL could not be retrieved. ${errorMessage}`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Invoice URL Not Available',
                `The invoice view URL is not available.\n\nError: ${errorMessage}\n\nPlease contact support if this issue persists.`,
                [{ text: 'OK' }]
              );
            }
          }
          return;
        }
      } else {
        // No Stripe invoice ID, show details
        if (isCreditPurchase) {
          Alert.alert(
            'Invoice Details',
            `Invoice #${
              invoice.invoice_number
            }\n\nAmount: $${invoice.total_amount.toFixed(
              2
            )}\nDate: ${formatDate(invoice.invoice_date)}\nStatus: ${
              invoice.status
            }\n\n${invoice.notes || ''}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Invoice URL Not Available',
            'The invoice view URL is not available. Please contact support if this issue persists.'
          );
        }
        return;
      }
    }

    // Open the URL
    if (viewUrl) {
      console.log('🔗 Opening invoice URL:', {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        url: viewUrl,
      });
      try {
        const canOpen = await Linking.canOpenURL(viewUrl);
        if (canOpen) {
          await Linking.openURL(viewUrl);
          console.log('✅ Invoice URL opened successfully:', {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
          });
        } else {
          console.error('❌ Cannot open invoice URL:', {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            url: viewUrl,
          });
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        console.error('❌ Error opening invoice URL:', {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          url: viewUrl,
          error: error instanceof Error ? error.message : error,
        });
        Alert.alert('Error', 'Failed to open invoice');
      }
    } else {
      console.error('❌ No URL available to open:', {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
      });
    }
  };

  const renderInvoiceItem = ({ item }: { item: InvoiceWithRelations }) => {
    // Check if this is a credit purchase (no professional)
    const isCreditPurchase =
      item.metadata?.type === 'credit_purchase' || !item.professional_id;

    // For credit purchase, show caller (user) name, otherwise show professional name
    const displayName = isCreditPurchase
      ? item.caller?.name || 'You'
      : item.professional?.users?.name || 'Unknown Professional';

    const displayAvatar = isCreditPurchase
      ? item.caller?.avatar_url || ''
      : item.professional?.users?.avatar_url || '';

    const displayTitle = isCreditPurchase
      ? 'Credit Purchase'
      : item.professional?.categories?.name ||
        item.professional?.users?.name ||
        'Professional';

    const professionalName = displayName;
    const professionalAvatar = displayAvatar;
    const professionalTitle = displayTitle;
    const invoiceId = item.id;
    const hasAvatarError = avatarErrors[invoiceId] || false;

    return (
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
        <View style={styles.invoiceContainer}>
          <View style={styles.invoiceHeader}>
            <View style={styles.professionalInfo}>
              {(() => {
                const hasValidAvatar =
                  professionalAvatar &&
                  typeof professionalAvatar === 'string' &&
                  professionalAvatar.trim() !== '' &&
                  !professionalAvatar.includes('placeholder') &&
                  !professionalAvatar.includes('via.placeholder') &&
                  !hasAvatarError;

                return hasValidAvatar ? (
                  <Image
                    source={{ uri: professionalAvatar }}
                    style={styles.avatar}
                    onError={() => {
                      setAvatarErrors((prev) => ({
                        ...prev,
                        [invoiceId]: true,
                      }));
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarInitials,
                      { backgroundColor: getAvatarColor(professionalName) },
                    ]}
                  >
                    <Text style={styles.avatarInitialsText}>
                      {getInitials(professionalName)}
                    </Text>
                  </View>
                );
              })()}
              <View style={styles.professionalDetails}>
                <Text
                  style={[
                    styles.professionalName,
                    { color: theme.colors.text },
                  ]}
                >
                  {professionalName}
                </Text>
                <Text
                  style={[
                    styles.professionalTitle,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {professionalTitle}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item) + '20' },
              ]}
            >
              {getStatusIcon(item)}
              <Text
                style={[styles.statusText, { color: getStatusColor(item) }]}
              >
                {getStatusLabel(item)}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceDetails}>
            <View style={styles.invoiceRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                Invoice #
              </Text>
              <Text
                style={[styles.invoiceNumber, { color: theme.colors.text }]}
              >
                {item.invoice_number}
              </Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                Date
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={14} color={theme.colors.textMuted} />
                <Text style={[styles.dateText, { color: theme.colors.text }]}>
                  {formatDate(item.invoice_date)}
                </Text>
              </View>
            </View>

            {item.call_duration_minutes != null &&
              item.call_duration_minutes > 0 && (
                <View style={styles.invoiceRow}>
                  <Text
                    style={[styles.label, { color: theme.colors.textMuted }]}
                  >
                    Duration
                  </Text>
                  <Text
                    style={[styles.durationText, { color: theme.colors.text }]}
                  >
                    {item.call_duration_minutes} min
                  </Text>
                </View>
              )}

            {item.notes && (
              <View style={styles.invoiceRow}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  Notes
                </Text>
                <Text
                  style={[styles.descriptionText, { color: theme.colors.text }]}
                >
                  {item.notes}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.amountRow,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.amountLabel, { color: theme.colors.text }]}>
                Amount
              </Text>
              <View style={styles.amountContainer}>
                <DollarSign size={20} color={theme.colors.primary} />
                <Text
                  style={[styles.amountValue, { color: theme.colors.primary }]}
                >
                  {item.total_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              {
                backgroundColor:
                  theme.name === 'light'
                    ? theme.colors.primary
                    : theme.colors.primaryLight,
                // Enable button if there's any URL or if it's a credit purchase (show details)
                opacity:
                  item.metadata?.hosted_url ||
                  item.pdf_url ||
                  item.metadata?.type === 'credit_purchase'
                    ? 1
                    : 0.6,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleViewInvoice(item);
            }}
            disabled={false} // Always enabled - will show details if no URL
          >
            <FileText size={16} color={theme.colors.surface} />
            <Text
              style={[styles.viewButtonText, { color: theme.colors.surface }]}
            >
              View Invoice
            </Text>
          </TouchableOpacity>
          {item.pdf_url && (
            <TouchableOpacity
              style={[
                styles.downloadButton,
                {
                  backgroundColor:
                    theme.name === 'light'
                      ? theme.colors.surface
                      : theme.colors.card,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleDownloadInvoice(item);
              }}
            >
              <Download size={16} color={theme.colors.text} />
              <Text style={[styles.downloadText, { color: theme.colors.text }]}>
                Download
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <PageLoading message="Loading invoices..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Header showLogo showBack />
        <View style={styles.emptyState}>
          <FileText size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Error Loading Invoices
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {error instanceof Error ? error.message : 'Failed to load invoices'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Header showLogo showBack />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search invoices..."
        showTabButtons={true}
        tabOptions={filters}
        selectedTabKey={selectedFilter}
        onTabSelect={(key: string) => setSelectedFilter(key as FilterStatus)}
        showResultsCount={true}
        resultsCount={filteredInvoices.length}
        resultsCountLabel={`${filteredInvoices.length} invoice${
          filteredInvoices.length !== 1 ? 's' : ''
        }`}
      />

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoiceItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
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
    width: '100%',
    overflow: 'hidden',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
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
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 0,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
  },
  viewButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
  },
  downloadText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
  },
});
