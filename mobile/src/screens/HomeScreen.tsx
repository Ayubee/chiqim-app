import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { ExpenseCard } from '@/components/ExpenseCard';
import { formatAmount, formatDateUzbek, getTashkentToday } from '@/utils/date';
import { LocalExpense } from '@/types';

interface Props {
  navigation?: {
    navigate: (screen: string) => void;
  };
}

export default function HomeScreen({ navigation }: Props) {
  const { profile, store, pendingCount, lastSyncTime, triggerSync, isLoading: authLoading } =
    useAuth();
  const { todayExpenses, todayTotal, loadTodayExpenses } = useExpenses();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadTodayExpenses();
  }, [loadTodayExpenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([triggerSync(), loadTodayExpenses()]);
    } finally {
      setRefreshing(false);
    }
  }, [triggerSync, loadTodayExpenses]);

  const today = getTashkentToday();

  const renderExpense = useCallback(
    ({ item }: { item: LocalExpense }) => (
      <ExpenseCard expense={item} />
    ),
    []
  );

  const renderHeader = () => (
    <View>
      {/* Store & Seller Info */}
      <View style={styles.storeCard}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store?.name ?? 'Magazin yuklanmoqda...'}</Text>
          <Text style={styles.sellerName}>{profile?.full_name ?? ''}</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount} kutilmoqda</Text>
          </View>
        )}
      </View>

      {/* Today Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{formatDateUzbek(today)} — Bugungi chiqimlar</Text>
        <Text style={styles.summaryAmount}>{formatAmount(todayTotal)}</Text>
        <Text style={styles.summaryCount}>{todayExpenses.length} ta yozuv</Text>
      </View>

      {/* Sync info */}
      {lastSyncTime && (
        <View style={styles.syncRow}>
          <Text style={styles.syncText}>
            Sinxronlashdi:{' '}
            {new Date(lastSyncTime).toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <TouchableOpacity onPress={triggerSync} style={styles.syncBtn}>
            <Text style={styles.syncBtnText}>Yangilash</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.listTitle}>Bugungi chiqimlar</Text>
    </View>
  );

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={todayExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Bugun chiqim yo'q</Text>
            <Text style={styles.emptySubtext}>Yangi chiqim qo'shish uchun + tugmasini bosing</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  sellerName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pendingText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.expenseLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  summaryAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.expense,
    marginBottom: Spacing.xs,
  },
  summaryCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  syncText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  syncBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
  },
  syncBtnText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 220,
  },
});
