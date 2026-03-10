import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, ActivityIndicator, Modal, TextInput, Pressable, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { 
  Menu, Plus, Share2, Heart, BadgeCheck, Phone, Clock, Video, AlertCircle,
  Briefcase, Calendar, GraduationCap, Award, Pin, MessageCircle, Eye, MapPin,
  Rss, X, Edit2, Trash2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';
import { PageLoading } from '@/components/ui/PageLoading';

import { Card } from '@/components/ui/Card';

import { useFeedCount, useProfessionalFeeds, useCreateFeed } from '@/hooks/useProfessionalFeeds';
import { useToast } from '@/lib/toastService';
import { ProfessionalFeedWithDetails } from '@/types/database.types';
import { useQuery } from '@tanstack/react-query';
import { professionalsService } from '@/services/supabase/professionals.service';
import { Availability } from '@/types/database.types';

// Helper function for time formatting
const formatRemainingTime = (minutes: number | null) => {
  if (minutes === null) return '';
  if (minutes < 60) {
    return `${minutes}m left`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 
    ? `${hours}h ${remainingMinutes}m left` 
    : `${hours}h left`;
};

export const ProfessionalProfileView = () => {
  const { theme } = useTheme();
  const { user, professional, stats, isLoading } = useProfile();
  const [activeTab, setActiveTab] = React.useState('about');
  const [avatarError, setAvatarError] = React.useState(false);
  const toast = useToast();
  
  // Feed Modal State
  const [showFeedModal, setShowFeedModal] = React.useState(false);
  const [feedContent, setFeedContent] = React.useState('');
  const [isPinned, setIsPinned] = React.useState(false);
  const [feedError, setFeedError] = React.useState<string | null>(null);
  
  const createFeedMutation = useCreateFeed();

  // Get feed count
  const { data: feedCount } = useFeedCount(professional?.id || '');

  // Get full professional profile with relations
  const { data: fullProfessional } = useQuery({
    queryKey: ['professional', 'full', professional?.id],
    queryFn: () => professionalsService.getProfessional(professional?.id as string),
    enabled: !!professional?.id,
  });

  // Get professional feeds
  const { data: feedsData } = useProfessionalFeeds(
    professional?.id as string,
    10
  );

  // Get availabilities
  const { data: availabilities = [] } = useQuery<Availability[]>({
    queryKey: ['professionals', professional?.id, 'availabilities'],
    queryFn: () => professionalsService.getProfessionalAvailabilities(professional?.id as string),
    enabled: !!professional?.id,
  });

  // Calculate current availability
  const { currentAvailability, remainingTime } = React.useMemo(() => {
    if (!availabilities.length) return { currentAvailability: null, remainingTime: null };

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    const compareTimes = (time1: string, time2: string): number => {
      const [h1, m1] = time1.split(':').map(Number);
      const [h2, m2] = time2.split(':').map(Number);
      return (h1 * 60 + m1) - (h2 * 60 + m2);
    };

    for (const avail of availabilities) {
      if (avail.available_at === 'urgent') {
        return {
          currentAvailability: { availability: avail, isActive: true },
          remainingTime: null,
        };
      } else if (
        avail.available_at === 'every' &&
        avail.days?.some(day => day.toLowerCase() === currentDay.toLowerCase())
      ) {
         if (avail.start_hour && avail.end_hour) {
            const startDiff = compareTimes(currentTime, avail.start_hour);
            const endDiff = compareTimes(currentTime, avail.end_hour);

            if (startDiff >= 0 && endDiff < 0) {
                const [endHour, endMin] = avail.end_hour.split(':').map(Number);
                const [currHour, currMin] = currentTime.split(':').map(Number);
                const remaining = (endHour * 60 + endMin) - (currHour * 60 + currMin);
                return {
                    currentAvailability: { availability: avail, isActive: true },
                    remainingTime: remaining
                };
            }
         }
      } else if (
        avail.available_at === 'specific' &&
        avail.date === currentDate
      ) {
        if (avail.start_hour && avail.end_hour) {
            const startDiff = compareTimes(currentTime, avail.start_hour);
            const endDiff = compareTimes(currentTime, avail.end_hour);

            if (startDiff >= 0 && endDiff < 0) {
                const [endHour, endMin] = avail.end_hour.split(':').map(Number);
                const [currHour, currMin] = currentTime.split(':').map(Number);
                const remaining = (endHour * 60 + endMin) - (currHour * 60 + currMin);
                return {
                    currentAvailability: { availability: avail, isActive: true },
                    remainingTime: remaining
                };
            }
        }
      }
    }
    return { currentAvailability: null, remainingTime: null };
  }, [availabilities]);

  const tabOptions = [
    { key: 'feed', label: 'Feed' },
    { key: 'about', label: 'About' },
    { key: 'availability', label: 'Availability' },
    { key: 'cv', label: 'Cv' },
  ];

  const handleSettingsPress = () => {
    router.push('/profile/settings');
  };

  const handleShare = () => {
    console.log('Share pressed');
  };

  const handleCreateContent = () => {
    console.log('Create content pressed');
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Helper function to get day abbreviation
  const getDayAbbr = (day: string) => {
    const dayMap: { [key: string]: string } = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
      Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
    };
    return dayMap[day] || day.substring(0, 3);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const handleAddFeed = () => {
    setFeedContent('');
    setIsPinned(false);
    setFeedError(null);
    setShowFeedModal(true);
  };

  const handleSaveFeed = async () => {
    if (!professional?.id) return;

    if (!feedContent.trim()) {
      setFeedError('Please enter feed content');
      return;
    }

    if (feedContent.length < 10) {
      setFeedError('Content must be at least 10 characters');
      return;
    }

    setFeedError(null);

    try {
      const result = await createFeedMutation.mutateAsync({
          professionalId: professional.id,
          data: {
            content: feedContent.trim(),
            is_pinned: isPinned,
          },
        });

        if (!result.success) {
          toast.error({
            title: 'Error',
            message: result.error || 'Failed to create feed',
          });
          return;
        }

        toast.success({
          title: 'Success',
          message: 'Feed created successfully',
        });

      setShowFeedModal(false);
      setFeedContent('');
      setIsPinned(false);
    } catch (error: any) {
      console.error('Error saving feed:', error);
      toast.error({
        title: 'Error',
        message: error.message || 'Failed to save feed',
      });
    }
  };

  const renderFeedContent = () => {
    const feeds = feedsData?.feeds || [];
    if (feeds.length === 0) {
      return (
        <View style={styles.tabContentContainer}>
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Rss size={48} color={theme.colors.pinkTwo || '#db2777'} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Feeds Yet</Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textMuted }]}>
              Share updates, tips, and insights with your audience
            </Text>
            <TouchableOpacity
              onPress={handleAddFeed}
              style={[
                styles.emptyActionButton,
                { backgroundColor: theme.colors.pinkTwo || '#db2777' }
              ]}
            >
              <Text style={styles.emptyActionTextLight}>Create First Feed</Text>
            </TouchableOpacity>
          </Card>
        </View>
      );
    }
    return (
      <View style={styles.feedContainer}>
        {feeds.map((feed) => (
          <View key={feed.id} style={[styles.postCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.postHeader}>
              <Image 
                source={{ uri: user?.avatar_url || 'https://via.placeholder.com/150' }} 
                style={styles.postAvatar} 
              />
              <View style={styles.postHeaderText}>
                <View style={styles.postNameRow}>
                  <Text style={[styles.postName, { color: theme.colors.text }]}>{user?.name}</Text>
                  {professional?.is_verified && <BadgeCheck size={14} color={theme.colors.pinkTwo || '#db2777'} strokeWidth={2.5} />}
                </View>
                <Text style={[styles.postTimestamp, { color: theme.colors.textMuted }]}>
                  {new Date(feed.created_at).toLocaleDateString()}
                </Text>
              </View>
              {feed.is_pinned && (
                <View style={[styles.pinnedBadge, { backgroundColor: theme.colors.surface }]}>
                   <Pin size={12} color={theme.colors.textSecondary} />
                   <Text style={[styles.pinnedText, { color: theme.colors.textSecondary }]}>Pinned</Text>
                </View>
              )}
            </View>
            <Text style={[styles.postContent, { color: theme.colors.textSecondary }]}>{feed.content}</Text>
            <View style={styles.postFooter}>
                <View style={styles.postStat}>
                    <Eye size={16} color={theme.colors.textMuted} />
                    <Text style={[styles.postStatText, { color: theme.colors.textMuted }]}>{feed.views_count || 0}</Text>
                </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderAboutContent = () => {
    const profData = fullProfessional || professional;
    const hasBio = !!profData?.bio;
    const hasSpecialties = (profData?.specialties || []).length > 0;
    const hasLanguages = (profData?.languages || []).length > 0;

    if (!hasBio && !hasSpecialties && !hasLanguages) {
        return (
            <View style={styles.tabContentContainer}>
                <Card style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                     <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
                        <Briefcase size={48} color={theme.colors.textMuted} strokeWidth={1.5} />
                     </View>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Profile Incomplete</Text>
                    <Text style={[styles.emptyDescription, { color: theme.colors.textMuted }]}>
                      Add details about yourself to attract more clients.
                    </Text>
                     <TouchableOpacity
                        onPress={() => router.push('/profile/settings')}
                        style={[styles.emptyActionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                    >
                        <Text style={[styles.emptyActionText, { color: theme.colors.text }]}>Complete Profile</Text>
                    </TouchableOpacity>
                </Card>
            </View>
        );
    }

    return (
      <View style={styles.aboutContainer}>
        <Card style={[styles.sectionCard, styles.aboutMeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About Me</Text>
          </View>
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>{profData?.bio || 'No bio available'}</Text>
        </Card>
        <Card style={[styles.sectionCard, styles.specialtiesCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Specialties</Text>
          </View>
          <View style={styles.specialties}>
            {(profData?.specialties || []).length > 0 ? (
              (profData?.specialties || []).map((specialty, index) => (
                <View key={index} style={[styles.specialtyTag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent || '#3b82f6' }]}>
                    <Text style={[styles.specialtyText, { color: theme.colors.accent || '#3b82f6' }]}>{String(specialty).replace(/^["']|["']$/g, '')}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No specialties specified</Text>
            )}
          </View>
        </Card>
        <Card style={[styles.sectionCard, styles.languagesCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Languages</Text>
          </View>
          <Text style={[styles.languagesText, { color: theme.colors.textSecondary }]}>
            {(profData?.languages || []).length > 0
              ? (profData?.languages || []).map(lang => String(lang).replace(/^["']|["']$/g, '')).join(', ')
              : 'No languages specified'}
          </Text>
        </Card>
      </View>
    );
  };



  const renderAvailabilityContent = () => {
    if (availabilities.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Calendar size={48} color={theme.colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyStateText, { color: theme.colors.textMuted }]}>No availability set</Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.colors.textMuted }]}>You haven't set your availability yet.</Text>
        </View>
      );
    }
    const groupedAvailabilities = availabilities.reduce((groups, avail) => {
      if (avail.available_at === 'urgent') return groups;
      const key = avail.available_at === 'every' ? 'Weekly Schedule' : `Date: ${avail.date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(avail);
      return groups;
    }, {} as { [key: string]: Availability[] });

    return (
      <View style={styles.availabilityContainer}>
         {Object.values(groupedAvailabilities).map((group, groupIndex) => {
             const firstAvail = group[0];
             const isWeekly = firstAvail.available_at === 'every';
             const days = isWeekly ? (firstAvail.days || []).sort() : null;
             const date = isWeekly ? null : firstAvail.date;
             return (
                 <Card key={groupIndex} style={[styles.availabilityCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                     <View style={styles.availabilityHeader}>
                         <View style={[styles.availabilityIconContainer, { backgroundColor: '#3B82F6'+'15' }]}>
                             <Calendar size={22} color="#3B82F6" strokeWidth={2.5} />
                         </View>
                         <View style={styles.availabilityHeaderText}>
                             <Text style={[styles.availabilityTypeText, { color: theme.colors.text }]}>{isWeekly ? 'Weekly Schedule' : 'Specific Date'}</Text>
                         </View>
                     </View>
                     {isWeekly && days && (
                         <View style={styles.daysRow}>
                             {days.map((day, index) => (
                                 <View key={index} style={[styles.dayBadge, { backgroundColor: '#3B82F620', borderColor: '#3B82F6', borderWidth: 1 }]}>
                                     <Text style={[styles.dayText, { color: '#3B82F6' }]}>{getDayAbbr(day)}</Text>
                                 </View>
                             ))}
                         </View>
                     )}
                     {!isWeekly && date && (
                         <View style={styles.dateRow}>
                             <View style={[styles.dateIconContainer, { backgroundColor: '#3B82F6'+'15' }]}>
                                 <Calendar size={16} color="#3B82F6" strokeWidth={2} />
                             </View>
                             <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDate(date)}</Text>
                         </View>
                     )}
                     <View style={[styles.availabilityFooter, { borderTopColor: theme.colors.border }]}>
                        <View style={styles.timeRow}>
                             <View style={[styles.timeIconContainer, { backgroundColor: '#10B981'+'15' }]}>
                                 <Clock size={18} color="#10B981" strokeWidth={2.5} />
                             </View>
                             <Text style={[styles.timeText, { color: theme.colors.text }]}>{firstAvail.start_hour} - {firstAvail.end_hour}</Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <View style={styles.availabilityPriceRow}>
                                <Phone size={14} color="#10B981" strokeWidth={2.5} />
                                <Text style={[styles.availabilityPriceText, { color: '#10B981' }]}>${firstAvail.price_per_minute.toFixed(2)}/min</Text>
                            </View>
                            {firstAvail.video_call_enabled && firstAvail.video_call_rate_per_minute && (
                                <>
                                    <View style={[styles.priceSeparator, { backgroundColor: theme.colors.border }]} />
                                    <View style={styles.availabilityPriceRow}>
                                        <Video size={14} color="#10B981" strokeWidth={2.5} />
                                        <Text style={[styles.availabilityPriceText, { color: '#10B981' }]}>${firstAvail.video_call_rate_per_minute.toFixed(2)}/min</Text>
                                    </View>
                                </>
                            )}
                        </View>
                     </View>
                 </Card>
             );
         })}
      </View>
    );
  };

  const renderCvContent = () => {
    if (!fullProfessional) return <ActivityIndicator size="small" color={theme.colors.primary} />;
    const { educations = [], experiences = [] } = fullProfessional;

    if (!educations.length && !experiences.length) {
        return (
            <View style={styles.tabContentContainer}>
                <Card style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                     <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
                        <GraduationCap size={48} color={theme.colors.textMuted} strokeWidth={1.5} />
                     </View>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No CV Data</Text>
                    <Text style={[styles.emptyDescription, { color: theme.colors.textMuted }]}>
                      Add your education and experience to showcase your qualifications.
                    </Text>
                     <TouchableOpacity
                        onPress={() => router.push('/profile/settings')}
                        style={[styles.emptyActionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                    >
                        <Text style={[styles.emptyActionText, { color: theme.colors.text }]}>Add CV Info</Text>
                    </TouchableOpacity>
                </Card>
            </View>
          );
    }
    return (
        <View style={styles.cvContainer}>
             {experiences.length > 0 && (
                 <Card style={[styles.cvSectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                     <View style={styles.cvSectionHeader}>
                         <View style={[styles.cvSectionIconContainer, { backgroundColor: (theme.colors.pinkTwo || '#db2777') + '15' }]}>
                             <Briefcase size={20} color={theme.colors.pinkTwo || '#db2777'} strokeWidth={2.5} />
                         </View>
                         <Text style={[styles.cvSectionTitle, { color: theme.colors.text }]}>Experience</Text>
                     </View>
                     {experiences.map((exp: any, index: number) => {
                         const startDate = exp.start_date ? new Date(exp.start_date).getFullYear() : null;
                         const endDate = exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).getFullYear() : null;
                         const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : startDate ? `${startDate}` : '';
                         return (
                             <View key={index} style={styles.cvEntry}>
                                 <View style={styles.cvEntryLeftBorder} />
                                 <View style={styles.cvEntryContent}>
                                     {exp.title && <Text style={[styles.cvEntryTitle, { color: theme.colors.pinkTwo || '#db2777' }]}>{exp.title}</Text>}
                                     {exp.company && <Text style={[styles.cvEntrySubtitle, { color: theme.colors.text }]}>{exp.company}</Text>}
                                     {dateRange && <Text style={[styles.cvEntryDate, { color: theme.colors.textSecondary }]}>{dateRange}</Text>}
                                 </View>
                             </View>
                         );
                     })}
                 </Card>
             )}
             {educations.length > 0 && (
                 <Card style={[styles.cvSectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                     <View style={styles.cvSectionHeader}>
                         <View style={[styles.cvSectionIconContainer, { backgroundColor: (theme.colors.accent || '#3b82f6') + '15' }]}>
                             <GraduationCap size={20} color={theme.colors.accent || '#3b82f6'} strokeWidth={2.5} />
                         </View>
                         <Text style={[styles.cvSectionTitle, { color: theme.colors.text }]}>Education</Text>
                     </View>
                     {educations.map((edu: any, index: number) => {
                         const startYear = edu.start_year;
                         const endYear = edu.is_current ? 'Present' : edu.end_year;
                         const dateRange = startYear && endYear ? `${startYear} - ${endYear}` : startYear ? `${startYear}` : '';
                         return (
                             <View key={index} style={styles.cvEntry}>
                                 <View style={[styles.cvEntryLeftBorder, { backgroundColor: theme.colors.accent || '#3b82f6' }]} />
                                 <View style={styles.cvEntryContent}>
                                     {edu.institution && <Text style={[styles.cvEntryTitle, { color: theme.colors.accent || '#3b82f6' }]}>{edu.institution}</Text>}
                                     {edu.field_of_study && <Text style={[styles.cvEntrySubtitle, { color: theme.colors.text }]}>{edu.field_of_study}</Text>}
                                     {edu.degree_level && <Text style={[styles.cvEntryText, { color: theme.colors.text }]}>{edu.degree_level}</Text>}
                                     {dateRange && <Text style={[styles.cvEntryDate, { color: theme.colors.textSecondary }]}>{dateRange}</Text>}
                                 </View>
                             </View>
                         );
                     })}
                 </Card>
             )}
        </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed': return renderFeedContent();
      case 'about': return renderAboutContent();
      case 'availability': return renderAvailabilityContent();
      case 'cv': return renderCvContent();
      default: return null;
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  // Data processing
  const userName = user?.name || 'Talkee User';
  const avatarUrl = user?.avatar_url;
  const proTitle = professional?.title || 'Professional';
  const isVerified = professional?.is_verified || false;
  
  // Stats
  const callsCount = professional?.total_calls || stats?.total_calls || 0;
  // Note: user_profile_stats RPC might not return total_minutes, so we rely on professional data
  const totalMinutes = professional?.total_minutes || 0;
  const postsCount = feedCount || 0; 

  // Availability
  const isActive = currentAvailability?.isActive || false; 
  const isFeatured = professional?.is_featured || false;
  const ratePerMinute = currentAvailability?.availability?.price_per_minute || professional?.rate_per_minute || 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        showLogo={true}
        leftButtons={
          <TouchableOpacity onPress={handleCreateContent}>
            <Plus size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
        rightButtons={
          <View style={styles.headerRightButtons}>
            <TouchableOpacity onPress={handleShare}>
              <Share2 size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSettingsPress}>
              <Menu size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View
          style={[
            styles.profileHeader,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.topSection}>
            <View style={styles.avatarContainer}>
                {avatarUrl && !avatarError ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarInitials, { backgroundColor: getAvatarColor(userName) }]}>
                    <Text style={styles.avatarInitialsText}>{getInitials(userName)}</Text>
                  </View>
                )}
                {/* Online Indicator */}
                <View style={[styles.onlineIndicator, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
                {/* Heart Badge (Mock for consistency with design) */}
                <View style={[styles.favoriteIndicator, { backgroundColor: theme.colors.error, borderColor: theme.colors.card }]}>
                    <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
                </View>
            </View>

            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {userName}
                </Text>
                {isVerified && (
                  <BadgeCheck
                    size={20}
                    color={theme.colors.pinkTwo || '#db2777'}
                    strokeWidth={2.5}
                  />
                )}
              </View>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.colors.textMuted }]}>
                  {proTitle}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {callsCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                  Calls
                </Text>
              </View>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.statItem}>
              <View style={styles.durationContainer}>
                  <Text style={[styles.durationValue, { color: theme.colors.text }]}>
                    {Math.floor(totalMinutes / 60)}
                    <Text style={[styles.durationUnit, { color: theme.colors.textMuted }]}>h</Text>
                  </Text>
                  <Text style={[styles.durationValue, { color: theme.colors.text }]}>
                    {' '}{totalMinutes % 60}
                    <Text style={[styles.durationUnit, { color: theme.colors.textMuted }]}>m</Text>
                  </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                Time
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {postsCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                  Posts
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.badges}>
            {isVerified && (
              <View style={[styles.badge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.pinkTwo || '#db2777' }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.pinkTwo || '#db2777' }]}>
                      Licensed Professional
                  </Text>
              </View>
            )}
            
            {isFeatured && (
              <View style={[styles.badge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.pinkTwo || '#db2777' }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.pinkTwo || '#db2777' }]}>
                      Top Rated
                  </Text>
              </View>
            )}
            
            {/* Charity Badge Mock */}
            <View style={[styles.badge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.success }]}>
                <Heart size={14} color={theme.colors.success} fill={theme.colors.success} />
                <Text style={[styles.badgeText, { color: theme.colors.success, marginLeft: 4 }]}>
                    45% Donated
                </Text>
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={[styles.pricingSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.pricingContent}>
             <View style={styles.pricingCardsRow}>
                 {/* Video Call Card (if available) */}
                 {currentAvailability?.availability?.video_call_enabled && currentAvailability.availability.video_call_rate_per_minute && (
                    <View style={[styles.priceCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.priceCardHeader}>
                            <Video size={20} color={theme.colors.pinkTwo || '#db2777'} />
                            <Text style={[styles.priceCardLabel, { color: theme.colors.textSecondary }]}>Video Call</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                           <Text style={[styles.priceCardAmount, { color: theme.colors.pinkTwo || '#db2777' }]}>
                               ${Number(currentAvailability.availability.video_call_rate_per_minute).toFixed(2)}
                           </Text>
                           <Text style={[styles.priceCardUnit, { color: theme.colors.textMuted }]}>/min</Text>
                        </View>
                    </View>
                 )}

                 {/* Audio Call Card */}
                 <View style={[styles.priceCard, { backgroundColor: theme.colors.surface }]}>
                     <View style={styles.priceCardHeader}>
                         <Phone size={20} color="#F59E0B" />
                         <Text style={[styles.priceCardLabel, { color: theme.colors.textSecondary }]}>Audio Call</Text>
                     </View>
                     <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.priceCardAmount, { color: '#F59E0B' }]}>
                            ${Number(ratePerMinute).toFixed(2)}
                        </Text>
                        <Text style={[styles.priceCardUnit, { color: theme.colors.textMuted }]}>/min</Text>
                     </View>
                 </View>
             </View>

             <View style={styles.statusBadgeRow}>
                {isActive && (
                 <View style={[styles.statusBadge, styles.statusBadgeAvailable, { borderColor: theme.colors.success }]}>
                     <Clock size={14} color={theme.colors.success} />
                     <Text style={[styles.statusBadgeText, { color: theme.colors.success }]}>Available Now</Text>
                 </View>
                )}
                
                {remainingTime !== null && (
                    <View style={[styles.statusBadge, { borderColor: theme.colors.pinkTwo || '#db2777', backgroundColor: 'rgba(219, 39, 119, 0.1)' }]}>
                        <Clock size={14} color={theme.colors.pinkTwo || '#db2777'} />
                        <Text style={[styles.statusBadgeText, { color: theme.colors.pinkTwo || '#db2777' }]}>
                            {formatRemainingTime(remainingTime)}
                        </Text>
                    </View>
                )}
             </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabNavigation, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          {['feed', 'about', 'availability', 'cv'].map((tab) => {
            const isActiveTab = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  isActiveTab && {
                    borderBottomColor: theme.colors.pinkTwo || '#db2777',
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActiveTab
                        ? theme.colors.pinkTwo || '#db2777'
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
           {renderTabContent()}
        </View>

      </ScrollView>

      {/* Feed Modal */}
      {showFeedModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFeedModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowFeedModal(false)}
            />
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Create Feed
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFeedModal(false)}
                >
                  <Text
                    style={[styles.modalClose, { color: theme.colors.text }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {feedError && (
                  <View
                    style={[
                      styles.errorContainer,
                      { backgroundColor: theme.colors.error + '10' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.errorText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {feedError}
                    </Text>
                  </View>
                )}

                {/* Content Input */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Content *
                  </Text>
                  <TextInput
                    value={feedContent}
                    onChangeText={(text) => {
                      setFeedContent(text);
                      setFeedError(null);
                    }}
                    placeholder="Share your thoughts, tips, or updates..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={6}
                    maxLength={1000}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: feedError
                          ? theme.colors.error
                          : theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    textAlignVertical="top"
                  />
                  <Text
                    style={[
                      styles.charCount,
                      {
                        color:
                          feedContent.length > 1000
                            ? theme.colors.error
                            : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {feedContent.length} / 1000
                  </Text>
                </View>

                {/* Pin Toggle */}
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setIsPinned(!isPinned)}
                    style={[
                      styles.pinToggle,
                      {
                        backgroundColor: isPinned
                          ? (theme.colors.pinkTwo || '#db2777') + '20'
                          : theme.colors.card,
                        borderColor: isPinned
                          ? (theme.colors.pinkTwo || '#db2777')
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.pinToggleCircle,
                        {
                          borderColor: isPinned
                            ? (theme.colors.pinkTwo || '#db2777')
                            : theme.colors.border,
                        },
                      ]}
                    >
                      {isPinned && (
                        <View
                          style={[
                            styles.pinToggleInner,
                            { backgroundColor: (theme.colors.pinkTwo || '#db2777') },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.pinToggleText}>
                      <Text style={[styles.pinToggleTitle, { color: theme.colors.text }]}>
                        Pin this feed
                      </Text>
                      <Text
                        style={[
                          styles.pinToggleDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Pinned feeds appear at the top of your profile
                      </Text>
                    </View>
                    <Pin
                      size={20}
                      color={isPinned ? (theme.colors.pinkTwo || '#db2777') : theme.colors.textMuted}
                      fill={isPinned ? (theme.colors.pinkTwo || '#db2777') : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={handleSaveFeed}
                  disabled={
                    createFeedMutation.isPending ||
                    !feedContent.trim() ||
                    feedContent.length < 10
                  }
                  style={[
                    styles.modalButtonFullWidth, 
                    { 
                        backgroundColor: (theme.colors.pinkTwo || '#db2777'),
                        opacity: (createFeedMutation.isPending || !feedContent.trim() || feedContent.length < 10) ? 0.5 : 1
                    }
                  ]}
                >
                    {createFeedMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.modalButtonText}>Create</Text>
                    )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightButtons: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    padding: 20,
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueRow: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  statDivider: {
    width: 1,
    height: 32,
    opacity: 0.5,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  durationUnit: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  pricingSection: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pricingContent: {
    padding: 16,
  },
  pricingCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  priceCardLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  priceCardAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  priceCardUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 2,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },

  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  tabContent: {
    padding: 20,
    minHeight: 200,
  },
  // Feed Styles
  feedContainer: {
    gap: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  postCard: {
    padding: 16,
    borderRadius: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  postName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  postTimestamp: {
    fontSize: 12,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinnedText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  postContent: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  // About Styles
  aboutContainer: {
    gap: 16,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  aboutMeCard: {},
  specialtiesCard: {},
  languagesCard: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  bio: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  languagesText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  // Availability Styles
  availabilityContainer: {
    gap: 16,
  },
  availabilityCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  availabilityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  availabilityHeaderText: {
    flex: 1,
  },
  availabilityTypeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  availabilityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceSeparator: {
    width: 1,
    height: 12,
  },
  availabilityPriceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  // CV Styles
  cvContainer: {
    gap: 16,
  },
  cvSectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cvSectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cvSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 0,
    flex: 1,
  },
  cvEntry: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cvEntryLeftBorder: {
    width: 3,
    backgroundColor: '#db2777', // Will be overridden by theme color
    borderRadius: 1.5,
    marginRight: 12,
  },
  cvEntryContent: {
    flex: 1,
  },
  cvEntryTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  cvEntrySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  cvEntryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  cvEntryDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  // Empty State Styles
  tabContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
    lineHeight: 20,
  },
  emptyActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  emptyActionText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  emptyActionTextLight: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    height: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  modalClose: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalButtonFullWidth: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none' as any,
      outlineWidth: 0,
      outlineColor: 'transparent',
    }),
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
    textAlign: 'right',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pinToggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinToggleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pinToggleText: {
    flex: 1,
  },
  pinToggleTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  pinToggleDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});
