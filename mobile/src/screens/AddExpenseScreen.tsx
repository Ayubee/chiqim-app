import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { useExpenses } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { formatAmount } from '@/utils/date';

interface Props {
  onClose?: () => void;
}

export default function AddExpenseScreen({ onClose }: Props) {
  const { todayTotal, addExpenseError } = useExpenses();
  const { store } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedAmount, setLastAddedAmount] = useState<number | null>(null);

  const handleSuccess = useCallback(() => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (onClose) {
        onClose();
      }
    }, 1200);
  }, [onClose]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Chiqim qo‘shish</Text>
          {store && <Text style={styles.storeName}>{store.name}</Text>}
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>Yopish</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Today total summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLabel}>Bugungi jami:</Text>
        <Text style={styles.summaryAmount}>{formatAmount(todayTotal)}</Text>
      </View>

      {/* Success notification */}
      {showSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ Chiqim muvaffaqiyatli saqlandi</Text>
        </View>
      )}

      {/* Error notification */}
      {addExpenseError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{addExpenseError}</Text>
        </View>
      )}

      <View style={styles.formContainer}>
        <AddExpenseForm onSuccess={handleSuccess} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  closeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  storeName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.expenseLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  summaryAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.expense,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.success,
  },
  successText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: Colors.expenseLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
});
