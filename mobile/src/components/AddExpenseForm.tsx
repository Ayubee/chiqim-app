import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import { parseSomInput, formatSomInput, getTashkentToday } from '@/utils/date';
import { validateExpenseInput } from '@/utils/validation';
import { useExpenses } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddExpenseForm({ onSuccess, onCancel }: Props) {
  const { addExpense, isAdding } = useExpenses();
  const { triggerSync } = useAuth();

  const [rawAmount, setRawAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(getTashkentToday());
  const [errors, setErrors] = React.useState<{
    amount?: string;
    note?: string;
    expense_date?: string;
  }>({});

  const handleAmountChange = (text: string) => {
    setRawAmount(formatSomInput(text));
  };

  const handleSubmit = async () => {
    const amount = parseSomInput(rawAmount);
    const validation = validateExpenseInput(amount, note, expenseDate);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setErrors({});
    try {
      await addExpense({
        amount_uzs: amount!,
        note,
        expense_date: expenseDate,
      });
      // Trigger background sync
      triggerSync().catch(console.error);
      onSuccess?.();
      setRawAmount('');
      setNote('');
      setExpenseDate(getTashkentToday());
    } catch {
      // Error shown via addExpenseError
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Chiqim qo'shish</Text>

        {/* Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>Summa (so'm) *</Text>
          <TextInput
            style={[styles.input, errors.amount ? styles.inputError : null]}
            value={rawAmount}
            onChangeText={handleAmountChange}
            placeholder="0"
            keyboardType="numeric"
            maxLength={20}
            placeholderTextColor={Colors.textTertiary}
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.label}>Izoh *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.note ? styles.inputError : null]}
            value={note}
            onChangeText={setNote}
            placeholder="Chiqim haqida izoh..."
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholderTextColor={Colors.textTertiary}
          />
          {errors.note && <Text style={styles.errorText}>{errors.note}</Text>}
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Sana (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, errors.expense_date ? styles.inputError : null]}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="2024-01-15"
            maxLength={10}
            placeholderTextColor={Colors.textTertiary}
          />
          {errors.expense_date && (
            <Text style={styles.errorText}>{errors.expense_date}</Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={isAdding}
            >
              <Text style={styles.cancelText}>Bekor qilish</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.submitBtn, isAdding && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.submitText}>Saqlash</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
