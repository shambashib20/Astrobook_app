import AppBottomSheet from '@/components/AppBottomSheet'
import { toast } from '@/components/toast'
import { AstroColors, AstroRadius, AstroSpacing } from '@/constants/astro-theme'
import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { walletService } from '../service'
import type { CancellationRequest, ClaimAction } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// CancellationChoiceSheet
//
// Jab session cancel ho aur user ne abhi tak choose nahi kiya.
//
// 2 options (chahe astrologer cancel kare ya user):
//   1. Wallet Credit — admin approve karega, phir instant credit
//   2. Money Refund  — UPI ID dalo, admin manually transfer karega (2 din)
//
// Agar deductionAmount > 0 (user ne 10 min ke baad cancel kiya):
//   - ₹50 processing fee dikhao
//   - Net refund = amount - 50
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'choice' | 'upi_input'

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m left`
  return `${m} min left`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

type Props = {
  visible: boolean
  onClose: () => void
  request: CancellationRequest | null
  onClaimed: () => void
}

export default function CancellationChoiceSheet({
  visible,
  onClose,
  request,
  onClaimed,
}: Props) {
  const isUserCancel = request?.initiatedBy === 'user'
  const deduction = parseFloat(request?.deductionAmount ?? '0')
  const totalAmount = parseFloat(request?.amount ?? '0')
  const netAmount = Math.max(0, totalAmount - deduction)

  const [step, setStep] = useState<Step>('choice')
  const [upiId, setUpiId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetSheet = () => {
    setStep('choice')
    setUpiId('')
    setSubmitting(false)
  }

  const handleClose = () => {
    resetSheet()
    onClose()
  }

  // ── Claim ─────────────────────────────────────────────────────────────────

  const claim = async (action: ClaimAction, upiIdValue?: string) => {
    if (!request) return
    setSubmitting(true)
    try {
      await walletService.claimCancellation(request.id, action, upiIdValue)
      toast.show(
        action === 'refund'
          ? 'Request submitted — you'll receive the amount via UPI within 2 business days'
          : 'Request submitted — funds will be added to your wallet once approved',
      )
      onClaimed()
      handleClose()
    } catch {
      toast.show('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMoneyRefundSubmit = () => {
    const trimmed = upiId.trim()
    if (!trimmed) {
      toast.show('Please enter your UPI ID')
      return
    }
    // Basic UPI format check: something@something
    if (!trimmed.includes('@')) {
      toast.show('Enter a valid UPI ID (e.g. name@upi)')
      return
    }
    claim('refund', trimmed)
  }

  const title = isUserCancel ? 'You Cancelled the Session' : 'Session Was Cancelled'

  return (
    <AppBottomSheet
      visible={visible}
      onClose={handleClose}
      title={step === 'upi_input' ? 'Enter UPI ID' : title}
      heightRatio={0.65}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 1: Choice ─────────────────────────────────────────────── */}
        {step === 'choice' && (
          <>
            {/* Info strip */}
            <View style={styles.infoCard}>
              <Feather name="alert-circle" size={18} color={AstroColors.gold} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>
                  {isUserCancel
                    ? 'You cancelled this session'
                    : `${request?.appointment?.astrologerName ?? 'Astrologer'} cancelled the session`}
                </Text>
                {request?.appointment?.scheduledAt ? (
                  <Text style={styles.infoSub}>
                    {formatDate(request.appointment.scheduledAt)}
                  </Text>
                ) : null}
                {request?.appointment?.serviceTitle ? (
                  <Text style={styles.infoSub}>{request.appointment.serviceTitle}</Text>
                ) : null}
              </View>
            </View>

            {/* Deduction info */}
            {deduction > 0 && (
              <View style={styles.deductionCard}>
                <Feather name="info" size={14} color={AstroColors.textSecondary} />
                <Text style={styles.deductionText}>
                  ₹{deduction.toFixed(0)} processing fee applies (cancelled after 10 minutes)
                </Text>
              </View>
            )}

            {/* Amount */}
            <View style={styles.amountRow}>
              <View>
                <Text style={styles.amountLabel}>Refund amount</Text>
                {deduction > 0 && (
                  <Text style={styles.amountOriginal}>
                    ₹{totalAmount.toFixed(0)} − ₹{deduction.toFixed(0)} fee
                  </Text>
                )}
              </View>
              <Text style={styles.amountValue}>₹{netAmount.toFixed(0)}</Text>
            </View>

            {/* Countdown */}
            {request?.expiresAt ? (
              <View style={styles.timerRow}>
                <Feather name="clock" size={13} color={AstroColors.textMuted} />
                <Text style={styles.timerText}>{formatCountdown(request.expiresAt)}</Text>
              </View>
            ) : null}

            <Text style={styles.chooseLbl}>What would you like to do?</Text>

            {/* Option: Wallet credit */}
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                styles.optionWallet,
                pressed && styles.pressed,
              ]}
              onPress={() => claim('wallet')}
              disabled={submitting}
            >
              <View style={styles.optionIconWrap}>
                <Feather name="zap" size={22} color={AstroColors.brand} />
              </View>
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>AstroBook Wallet</Text>
                <Text style={styles.optionDesc}>
                  Credited instantly once approved — use it on your next booking
                </Text>
              </View>
              {submitting ? (
                <ActivityIndicator size="small" color={AstroColors.brand} />
              ) : (
                <Feather name="chevron-right" size={18} color={AstroColors.brand} />
              )}
            </Pressable>

            {/* Option: Money refund */}
            <Pressable
              style={({ pressed }) => [styles.optionCard, pressed && styles.pressed]}
              onPress={() => setStep('upi_input')}
              disabled={submitting}
            >
              <View style={styles.optionIconWrap}>
                <Feather name="credit-card" size={22} color={AstroColors.textSecondary} />
              </View>
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>Refund to Original Payment</Text>
                <Text style={styles.optionDesc}>Returned to your UPI / bank within 2 business days</Text>
              </View>
              {submitting ? (
                <ActivityIndicator size="small" color={AstroColors.textSecondary} />
              ) : (
                <Feather name="chevron-right" size={18} color={AstroColors.textSecondary} />
              )}
            </Pressable>

            <Text style={styles.autoNote}>
              If no choice is made within 1 day, a money refund will be requested automatically.
            </Text>
          </>
        )}

        {/* ── Step 2: UPI input ──────────────────────────────────────────── */}
        {step === 'upi_input' && (
          <>
            <View style={styles.upiInfoCard}>
              <Feather name="info" size={16} color={AstroColors.brand} />
              <Text style={styles.upiInfoText}>
                Our team will manually transfer{' '}
                <Text style={{ fontWeight: '700' }}>₹{netAmount.toFixed(0)}</Text> to your UPI
                — usually within 2 business days.
              </Text>
            </View>

            <Text style={styles.inputLabel}>UPI ID</Text>
            <TextInput
              style={styles.textInput}
              placeholder="name@upi / number@bank"
              placeholderTextColor={AstroColors.textMuted}
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Text style={styles.inputHint}>
              e.g. 9876543210@paytm, yourname@oksbi
            </Text>

            <View style={styles.upiActions}>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
                onPress={() => setStep('choice')}
                disabled={submitting}
              >
                <Text style={styles.btnSecondaryText}>Go Back</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && styles.pressed,
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleMoneyRefundSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: AstroSpacing.lg,
    gap: AstroSpacing.md,
    paddingBottom: 40,
  },

  // ── Info card ─────────────────────────────────────────────────────────────
  infoCard: {
    flexDirection: 'row',
    gap: AstroSpacing.sm,
    backgroundColor: AstroColors.goldTint,
    borderRadius: AstroRadius.md,
    padding: AstroSpacing.md,
    borderWidth: 1,
    borderColor: AstroColors.goldBorder,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, gap: 2 },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AstroColors.ink,
  },
  infoSub: {
    fontSize: 12,
    color: AstroColors.textSecondary,
  },

  // ── Deduction notice ──────────────────────────────────────────────────────
  deductionCard: {
    flexDirection: 'row',
    gap: AstroSpacing.xs,
    alignItems: 'center',
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.sm,
    padding: AstroSpacing.sm,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  deductionText: {
    flex: 1,
    fontSize: 12,
    color: AstroColors.textSecondary,
    lineHeight: 17,
  },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AstroSpacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AstroColors.border,
  },
  amountLabel: {
    fontSize: 14,
    color: AstroColors.textSecondary,
  },
  amountOriginal: {
    fontSize: 11,
    color: AstroColors.textMuted,
    marginTop: 2,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: AstroColors.ink,
  },

  // ── Timer ─────────────────────────────────────────────────────────────────
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontSize: 12,
    color: AstroColors.textMuted,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  chooseLbl: {
    fontSize: 13,
    fontWeight: '700',
    color: AstroColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: AstroSpacing.xs,
  },

  // ── Option cards ──────────────────────────────────────────────────────────
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AstroSpacing.md,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: AstroSpacing.md,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  optionWallet: {
    borderColor: AstroColors.brand,
    backgroundColor: AstroColors.brandTint,
  },
  pressed: { opacity: 0.75 },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AstroColors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1, gap: 3 },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AstroColors.ink,
  },
  optionDesc: {
    fontSize: 12,
    color: AstroColors.textSecondary,
    lineHeight: 17,
  },

  // ── Footer note ───────────────────────────────────────────────────────────
  autoNote: {
    fontSize: 11,
    color: AstroColors.textMuted,
    textAlign: 'center',
    marginTop: AstroSpacing.xs,
    lineHeight: 16,
  },

  // ── UPI input step ────────────────────────────────────────────────────────
  upiInfoCard: {
    flexDirection: 'row',
    gap: AstroSpacing.sm,
    alignItems: 'flex-start',
    backgroundColor: AstroColors.brandTint,
    borderRadius: AstroRadius.md,
    padding: AstroSpacing.md,
    borderWidth: 1,
    borderColor: AstroColors.brand,
  },
  upiInfoText: {
    flex: 1,
    fontSize: 13,
    color: AstroColors.ink,
    lineHeight: 19,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: AstroColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: AstroSpacing.xs,
  },
  textInput: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md,
    borderWidth: 1,
    borderColor: AstroColors.border,
    paddingHorizontal: AstroSpacing.md,
    paddingVertical: AstroSpacing.sm,
    fontSize: 15,
    color: AstroColors.ink,
  },
  inputHint: {
    fontSize: 11,
    color: AstroColors.textMuted,
    marginTop: -6,
    lineHeight: 16,
  },
  upiActions: {
    flexDirection: 'row',
    gap: AstroSpacing.sm,
    marginTop: AstroSpacing.xs,
  },
  btnSecondary: {
    flex: 1,
    borderRadius: AstroRadius.md,
    borderWidth: 1,
    borderColor: AstroColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: AstroColors.textSecondary,
  },
  btnPrimary: {
    flex: 2,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
