import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LocalExpense } from '@/types';
import { formatAmount, formatTimeFromISO } from '@/utils/date';
import { SyncStatusBadge } from './SyncStatusBadge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';

interface Props {
  expense: LocalExpense;
  onRetry?: () => void;
}

export function ExpenseCard({ expense, onRetry }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.amount}>{formatAmount(expense.amount_uzs)}</Text>
          <Text style={styles.note} numberOfLines={2}>
            {expense.note}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.time}>{formatTimeFromISO(expense.occurred_at)}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <SyncStatusBadge
          status={expense.sync_status}
          errorCode={expense.sync_error_code}
          onRetry={onRetry}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  left: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.expense,
    marginBottom: Spacing.xs,
  },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
