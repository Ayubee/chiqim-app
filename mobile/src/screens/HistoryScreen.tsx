import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import { CalendarGrid } from '@/components/CalendarGrid';
import { ExpenseCard } from '@/components/ExpenseCard';
import { useAuth } from '@/context/AuthContext';
import {
  getExpensesForMonth,
  getDailyTotals,
  getExpensesByDate,
} from '@/db/expenses';
import { LocalExpense } from '@/types';
import {
  getTashkentToday,
  formatAmount,
  formatDateUzbek,
  getYearMonth,
} from '@/utils/date';

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export default function HistoryScreen() {
  const { session } = useAuth();
  const today = getTashkentToday();
  const [year, setYear] = useState(() => parseInt(today.slice(0, 4), 10));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7), 10));
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [selectedExpenses, setSelectedExpenses] = useState<LocalExpense[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  const loadMonthData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [totals, expenses] = await Promise.all([
        getDailyTotals(session.user_id, yearMonth),
        getExpensesForMonth(session.user_id, yearMonth),
      ]);
      setDailyTotals(totals);
      const total = Object.values(totals).reduce((a, b) => a + b, 0);
      setMonthTotal(total);
      // Load selected date expenses
      if (selectedDate && getYearMonth(selectedDate) === yearMonth) {
        const dayExpenses = await getExpensesByDate(session.user_id, selectedDate);
        setSelectedExpenses(dayExpenses);
      } else {
        setSelectedExpenses([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session, yearMonth, selectedDate]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const handleSelectDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      if (!session) return;
      const dayExpenses = await getExpensesByDate(session.user_id, date);
      setSelectedExpenses(dayExpenses);
    },
    [session]
  );

  const goToPrevMonth = useCallback(() => {
    setSelectedDate(null);
    setSelectedExpenses([]);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const goToNextMonth = useCallback(() => {
    setSelectedDate(null);
    setSelectedExpenses([]);
    const now = getTashkentToday();
    const nowYear = parseInt(now.slice(0, 4), 10);
    const nowMonth = parseInt(now.slice(5, 7), 10);
    if (year < nowYear || (year === nowYear && month < nowMonth)) {
      if (month === 12) {
        setYear((y) => y + 1);
        setMonth(1);
      } else {
        setMonth((m) => m + 1);
      }
    }
  }, [month, year]);

  const renderHeader = () => (
    <View>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthTitle}>
          <Text style={styles.monthName}>{MONTHS_UZ[month - 1]} {year}</Text>
          <Text style={styles.monthTotal}>{formatAmount(monthTotal)}</Text>
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            dailyTotals={dailyTotals}
            onSelectDate={handleSelectDate}
          />
        )}
      </View>

      {/* Selected day header */}
      {selectedDate && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>{formatDateUzbek(selectedDate)}</Text>
          <Text style={styles.dayTotal}>
            {formatAmount(dailyTotals[selectedDate] ?? 0)}
          </Text>
        </View>
      )}

      {selectedDate && selectedExpenses.length === 0 && !isLoading && (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>Bu kunda chiqim yo'q</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Tarix</Text>
      </View>
      <FlatList
        data={selectedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
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
  screenHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnText: {
    fontSize: FontSize.xl,
    color: Colors.text,
    fontWeight: '700',
  },
  monthTitle: {
    alignItems: 'center',
  },
  monthName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  monthTotal: {
    fontSize: FontSize.sm,
    color: Colors.expense,
    fontWeight: '600',
    marginTop: 2,
  },
  calendarContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  dayHeaderText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  dayTotal: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.expense,
  },
  emptyDay: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
