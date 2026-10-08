import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { formatLastSyncTime } from '@/utils/date';

export default function ProfileScreen() {
  const {
    profile,
    store,
    session,
    pendingCount,
    lastSyncTime,
    signOut,
    triggerSync,
    refreshProfile,
  } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerSync();
    } catch (e) {
      Alert.alert('Xatolik', (e as Error).message || 'Sinxronlashda xatolik yuz berdi');
    } finally {
      setSyncing(false);
    }
  }, [triggerSync]);

  const handleRefreshProfile = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (e) {
      Alert.alert('Xatolik', 'Profilni yangilab bo‘lmadi');
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  const handleSignOut = useCallback(() => {
    if (pendingCount > 0) {
      Alert.alert(
        'Diqqat! Sinxronlanmagan ma’lumotlar bor',
        `Qurilmangizda ${pendingCount} ta serverga yuborilmagan chiqim mavjud. Agar tizimdan chiqsangiz yoki ilova o‘chirilsa, ular yo‘qolishi mumkin. Avval internetga ulanib sinxronlash tavsiya etiladi. Baribir chiqmoqchimisiz?`,
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Baribir chiqish',
            style: 'destructive',
            onPress: async () => {
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Tizimdan chiqish',
        'Haqiqatan ham hisobingizdan chiqmoqchimisiz?',
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Chiqish',
            style: 'destructive',
            onPress: async () => {
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            },
          },
        ]
      );
    }
  }, [pendingCount, signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Profil</Text>
          <TouchableOpacity
            onPress={handleRefreshProfile}
            disabled={refreshing}
            style={styles.refreshBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.refreshBtnText}>Yangilash</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Foydalanuvchi kartochkasi */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
            <Text style={styles.email}>{session?.email ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {profile?.role === 'admin' ? 'Administrator' : 'Sotuvchi'}
              </Text>
            </View>
          </View>
        </View>

        {/* Magazin ma'lumotlari */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biriktirilgan magazin</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Magazin nomi</Text>
            <Text style={styles.infoValue}>{store?.name ?? 'Biriktirilmagan'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Holat</Text>
            <Text
              style={[
                styles.infoValue,
                store?.is_active ? styles.active : styles.inactive,
              ]}
            >
              {store?.is_active ? 'Faol' : 'Nofaol'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Magazin ID</Text>
            <Text style={styles.infoValueMono} numberOfLines={1}>
              {profile?.store_id ?? '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Biriktirish versiyasi</Text>
            <Text style={styles.infoValue}>v{profile?.assignment_version ?? 1}</Text>
          </View>
        </View>

        {/* Sinxronlash holati */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinxronlash va Offline xotira</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Yuborish kutilmoqda</Text>
            <View
              style={[
                styles.badge,
                pendingCount > 0 ? styles.badgePending : styles.badgeSynced,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  pendingCount > 0 ? styles.badgeTextPending : styles.badgeTextSynced,
                ]}
              >
                {pendingCount} ta chiqim
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Oxirgi sinxronlash</Text>
            <Text style={styles.infoValue}>{formatLastSyncTime(lastSyncTime)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.btnDisabled]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.syncBtnText}>Hozir sinxronlash</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Xavfsizlik va Eslatma */}
        {pendingCount > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Muhim eslatma</Text>
            <Text style={styles.warningText}>
              Qurilmangizda {pendingCount} ta yozuv faqat mahalliy xotirada saqlanmoqda.
              Telefon yoki ilova tozalansa, serverga yuborilmagan ma’lumotlar qayta tiklanmaydi.
            </Text>
          </View>
        )}

        {/* Chiqish tugmasi */}
        <TouchableOpacity
          style={[styles.signOutBtn, signingOut && styles.btnDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.signOutText}>Hisobdan chiqish</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  refreshBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
  },
  refreshBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '700',
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  infoValueMono: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    maxWidth: 160,
  },
  active: {
    color: Colors.success,
  },
  inactive: {
    color: Colors.error,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgePending: {
    backgroundColor: '#FFF3E0',
  },
  badgeSynced: {
    backgroundColor: '#E8F5E9',
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: Colors.warning,
  },
  badgeTextSynced: {
    color: Colors.success,
  },
  syncBtn: {
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  syncBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  warningBox: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: FontSize.xs,
    color: '#5D4037',
    lineHeight: 18,
  },
  signOutBtn: {
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  signOutText: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
