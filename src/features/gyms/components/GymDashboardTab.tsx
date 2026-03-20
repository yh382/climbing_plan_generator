import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GymDashboardTab() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="storefront-outline" size={48} color="#D1D5DB" />
      </View>

      <Text style={styles.title}>No official gym partnership yet</Text>
      <Text style={styles.subtitle}>Stay tuned!</Text>

      <TouchableOpacity
        style={styles.infoBtn}
        activeOpacity={0.7}
        onPress={() => setShowInfo(!showInfo)}
      >
        <Ionicons name="information-circle-outline" size={18} color="#306E6F" />
        <Text style={styles.infoBtnText}>Learn about partnerships</Text>
        <Ionicons
          name={showInfo ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#306E6F"
        />
      </TouchableOpacity>

      {showInfo && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Want your gym on ClimMate? Recommend it to your gym! Partnered gyms
            can post route updates, events, challenges, and more.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(48,110,111,0.08)',
    borderRadius: 20,
  },
  infoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#306E6F',
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
});
