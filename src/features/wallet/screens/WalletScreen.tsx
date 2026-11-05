import Header from '@/components/header'
import { AstroColors, AstroRadius, AstroSpacing } from '@/constants/astro-theme'
import { Feather } from '@expo/vector-icons'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWalletBalance, useWalletTransactions } from '../hooks/useWallet'

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'cancellation_refund': return 'Session Cancelled — Refund'
    case 'booking_payment': return 'Booking Payment'
    default: return 'AstroBook Credit'
  }
}

// ─── Balance Card ─────────────────────────────────────────────────────────────
function BalanceCard({ balance, loading }: { balance: string; loading: boolean }) {
  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceTop}>
        <Feather name="zap" size={20} color={AstroColors.onBrand} />
        <Text style={styles.balanceLabel}>AstroBook Wallet</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={AstroColors.onBrand} style={{ marginTop: 12 }} />
      ) : (
        <Text style={styles.balanceAmount}>₹{parseFloat(balance || '0').toFixed(2)}</Text>
      )}
      <Text style={styles.balanceNote}>
        Wallet credits can only be used for AstroBook bookings
      </Text>
    </View>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: ReturnType<typeof useWalletTransactions>['transactions'][0] }) {
  const isCredit = tx.type === 'credit'
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? AstroColors.successTint : AstroColors.dangerTint }]}>
        <Feather
          name={isCredit ? 'arrow-down-left' : 'arrow-up-right'}
          size={14}
          color={isCredit ? AstroColors.success : AstroColors.danger}
        />
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txTitle}>{tx.description ?? sourceLabel(tx.source)}</Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? AstroColors.success : AstroColors.danger }]}>
        {isCredit ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(0)}
      </Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const insets = useSafeAreaInsets()
  const { balance, loading: balLoading, refetch: refetchBal } = useWalletBalance()
  const { transactions, loading: txLoading, refreshing, refetch } = useWalletTransactions()

  const onRefresh = async () => {
    await Promise.all([refetch(true), refetchBal()])
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AstroColors.brand]}
            tintColor={AstroColors.brand}
          />
        }
      >
        <BalanceCard balance={balance?.balance ?? '0'} loading={balLoading} />

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {txLoading ? (
            <ActivityIndicator color={AstroColors.brand} style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="inbox" size={32} color={AstroColors.border} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  scroll: { padding: AstroSpacing.lg, gap: AstroSpacing.lg, paddingBottom: 40 },

  // Balance card
  balanceCard: {
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.xl,
    padding: AstroSpacing.xl,
    gap: AstroSpacing.xs,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AstroSpacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: AstroColors.onBrand,
    marginTop: 4,
  },
  balanceNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    lineHeight: 16,
  },

  // Section
  section: { gap: AstroSpacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: AstroColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Transaction row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AstroSpacing.md,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md,
    padding: AstroSpacing.md,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1, gap: 2 },
  txTitle: { fontSize: 13, fontWeight: '600', color: AstroColors.ink },
  txDate: { fontSize: 11, color: AstroColors.textMuted },
  txAmount: { fontSize: 15, fontWeight: '800' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: AstroColors.textMuted },
})
