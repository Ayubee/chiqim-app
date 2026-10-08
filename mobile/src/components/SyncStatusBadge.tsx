import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SyncStatus } from '@/types';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';

interface Props {
  status: SyncStatus;
  errorCode?: string | null;
  onRetry?: () => void;
}

export function SyncStatusBadge({ status, errorCode, onRetry }: Props) {
  const config = {
    pending: { label: 'Yuborish kutilmoqda', color: Colors.warning, bg: '#FFF3E0' },
    synced: { label: 'Sinxronlandi', color: Colors.success, bg: '#E8F5E9' },
    failed: { label: 'Yuborilmadi', color: Colors.error, bg: Colors.expenseLight },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      {status === 'failed' && errorCode && (
        <Text style={[styles.error, { color: config.color }]}>{errorCode}</Text>
      )}
      {status === 'failed' && onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Qayta urinish</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  error: {
    fontSize: FontSize.xs,
  },
  retryBtn: {
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: '600',
  },
});
