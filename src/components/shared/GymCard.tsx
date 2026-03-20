import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GymCardProps {
  gymId: string;
  name: string;
  subtitle?: string;
  isFavorited?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  variant?: 'compact' | 'full';
}

export default function GymCard({
  name,
  subtitle,
  isFavorited,
  onPress,
  onToggleFavorite,
  variant = 'full',
}: GymCardProps) {
  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactIcon}>
          <Ionicons name="location" size={20} color="#306E6F" />
        </View>
        <View style={styles.compactBody}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          {subtitle ? (
            <Text style={styles.compactSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.starBtn}
          >
            <Ionicons
              name={isFavorited ? 'star' : 'star-outline'}
              size={18}
              color={isFavorited ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>
    );
  }

  // Full variant
  return (
    <TouchableOpacity style={styles.fullCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.fullTop}>
        <View style={styles.fullIcon}>
          <Ionicons name="location" size={20} color="#306E6F" />
        </View>
        <View style={styles.fullBody}>
          <Text style={styles.fullName} numberOfLines={1}>{name}</Text>
          {subtitle ? (
            <Text style={styles.fullSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.starBtn}
          >
            <Ionicons
              name={isFavorited ? 'star' : 'star-outline'}
              size={20}
              color={isFavorited ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact variant (Home card)
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(48,110,111,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactBody: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Full variant (Community list)
  fullCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  fullTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(48,110,111,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fullBody: {
    flex: 1,
  },
  fullName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  fullSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Shared
  starBtn: {
    padding: 4,
    marginRight: 4,
  },
});
