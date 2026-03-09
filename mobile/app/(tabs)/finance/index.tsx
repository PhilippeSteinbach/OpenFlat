import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { financeApi } from '../../../shared/api/client';

// ── Types ──────────────────────

interface ExpenseDto {
  id: string;
  amountEur: number;
  description: string;
  loggedByUserId: number;
  loggedByUserName: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
}

interface SettlementResponse {
  isSettled: boolean;
  transactions: SettlementTransaction[];
  balances: UserBalance[];
  totalExpenses: number;
  fairShare: number;
}

interface SettlementTransaction {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amountEur: number;
}

interface UserBalance {
  userId: number;
  userName: string;
  totalPaidEur: number;
  netBalanceEur: number;
}

type Tab = 'expenses' | 'settlement';

// ── Finance Screen ──────────────────────

export default function FinanceTrackerScreen() {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseDto | null>(null);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchData = useCallback(async () => {
    try {
      const [expenseData, settlementData] = await Promise.all([
        financeApi.get<ExpenseDto[]>('/expenses', headers()),
        financeApi.get<SettlementResponse>('/settlement', headers()),
      ]);
      setExpenses(expenseData);
      setSettlement(settlementData);
      setError(false);
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    (expenseId: string) => {
      Alert.alert(
        t('finance.expense.delete', 'Delete Expense?'),
        t('finance.expense.deleteConfirm', 'Are you sure?'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.delete', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await financeApi.delete(`/expenses/${expenseId}`, headers());
                fetchData();
              } catch {
                Alert.alert(t('common.error', 'Error'), t('finance.expense.failedDelete'));
              }
            },
          },
        ],
      );
    },
    [headers, fetchData, t],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16, marginBottom: 12 }}>{t('common.error', 'Something went wrong')}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchData(); }} accessibilityRole="button" accessibilityLabel={t('common.retry', 'Retry')}>
          <Text style={{ color: '#2563EB', fontSize: 14 }}>{t('common.retry', 'Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 {t('finance.title', 'Finance Tracker')}</Text>
        {activeTab === 'expenses' && (
          <TouchableOpacity style={styles.createButton} onPress={() => setLogModalOpen(true)} accessibilityRole="button" accessibilityLabel={t('finance.expense.log', 'Log')}>
            <Text style={styles.createButtonText}>+ {t('finance.expense.log', 'Log')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['expenses', 'settlement'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            accessibilityLabel={t(`finance.tabs.${tab}`, tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(`finance.tabs.${tab}`, tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'expenses' ? (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={styles.emptyText}>{t('finance.empty', 'No expenses logged yet')}</Text>
            </View>
          }
          renderItem={({ item: expense }) => {
            const date = new Date(expense.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            });
            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.amountText}>€{expense.amountEur.toFixed(2)}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.descText} numberOfLines={1}>{expense.description}</Text>
                    <Text style={styles.metaText}>
                      {t('finance.expense.loggedBy', { name: expense.loggedByUserName })} · {date}
                    </Text>
                  </View>
                  {expense.isOwn && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => setEditExpense(expense)} accessibilityRole="button" accessibilityLabel={t('common.edit', 'Edit')}>
                        <Text style={styles.actionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(expense.id)} accessibilityRole="button" accessibilityLabel={t('common.delete', 'Delete')}>
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
            />
          }
        >
          {settlement && (
            <>
              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('finance.settlement.totalExpenses', 'Total expenses')}</Text>
                <Text style={styles.summaryAmount}>€{settlement.totalExpenses.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>
                  {t('finance.settlement.perPerson', 'Per person')}: €{settlement.fairShare.toFixed(2)}
                </Text>
              </View>

              {/* Transactions */}
              {settlement.isSettled ? (
                <View style={styles.settledState}>
                  <Text style={styles.settledEmoji}>✅</Text>
                  <Text style={styles.settledText}>{t('finance.settlement.allSettled', 'All settled up! 🎉')}</Text>
                </View>
              ) : (
                settlement.transactions.map((tx, i) => (
                  <View key={i} style={styles.txCard}>
                    <Text style={styles.txText}>
                      {t('finance.settlement.owes', { from: tx.fromUserName, to: tx.toUserName })}
                    </Text>
                    <Text style={styles.txAmount}>€{tx.amountEur.toFixed(2)}</Text>
                  </View>
                ))
              )}

              {/* Balances */}
              <Text style={styles.balancesHeader}>{t('finance.settlement.balances')}</Text>
              {settlement.balances.map((b) => (
                <View key={b.userId} style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceName}>{b.userName}</Text>
                    <Text style={styles.balancePaid}>{t('finance.settlement.paid', { amount: `€${b.totalPaidEur.toFixed(2)}` })}</Text>
                  </View>
                  <Text
                    style={[
                      styles.balanceNet,
                      b.netBalanceEur > 0 && styles.balancePositive,
                      b.netBalanceEur < 0 && styles.balanceNegative,
                    ]}
                  >
                    {b.netBalanceEur > 0 ? '+' : ''}€{b.netBalanceEur.toFixed(2)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Log Expense Modal */}
      <ExpenseFormModal
        visible={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSubmit={async (amountEur, description) => {
          try {
            await financeApi.post('/expenses', { amountEur, description }, headers());
            setLogModalOpen(false);
            fetchData();
          } catch {
            Alert.alert(t('common.error', 'Error'), t('finance.expense.failedLog'));
          }
        }}
        title={t('finance.expense.log', 'Log Expense')}
      />

      {/* Edit Expense Modal */}
      {editExpense && (
        <ExpenseFormModal
          visible
          onClose={() => setEditExpense(null)}
          onSubmit={async (amountEur, description) => {
            try {
              await financeApi.put(`/expenses/${editExpense.id}`, { amountEur, description }, headers());
              setEditExpense(null);
              fetchData();
            } catch {
              Alert.alert(t('common.error', 'Error'), t('finance.expense.failedUpdate'));
            }
          }}
          title={t('finance.expense.edit', 'Edit Expense')}
          initialAmount={editExpense.amountEur.toFixed(2)}
          initialDescription={editExpense.description}
        />
      )}
    </View>
  );
}

// ── Expense Form Modal ──────────────────────

function ExpenseFormModal({
  visible,
  onClose,
  onSubmit,
  title,
  initialAmount = '',
  initialDescription = '',
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amountEur: number, description: string) => void;
  title: string;
  initialAmount?: string;
  initialDescription?: string;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (visible) {
      setAmount(initialAmount);
      setDescription(initialDescription);
    }
  }, [visible, initialAmount, initialDescription]);

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0.01) {
      Alert.alert(t('finance.validation.amountPositive', 'Amount must be greater than 0'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('validation.required', 'Description is required'));
      return;
    }
    onSubmit(parsed, description.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          <Text style={styles.inputLabel}>{t('finance.expense.amount', 'Amount (€)')}</Text>
          <TextInput
            style={styles.textInput}
            value={amount}
            onChangeText={setAmount}
            placeholder={t('finance.expense.amountPlaceholder', '0.00')}
            keyboardType="decimal-pad"
            autoFocus
            accessibilityLabel={t('finance.expense.amount', 'Amount (€)')}
          />

          <Text style={styles.inputLabel}>{t('finance.expense.description', 'Description')}</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder={t('finance.expense.descriptionPlaceholder', 'e.g. Weekly groceries')}
            maxLength={500}
            accessibilityLabel={t('finance.expense.description', 'Description')}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.cancel', 'Cancel')}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} accessibilityRole="button" accessibilityLabel={t('common.save', 'Save')}>
              <Text style={styles.submitButtonText}>{t('common.save', 'Save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#2563EB' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountText: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 80, textAlign: 'right' },
  cardInfo: { flex: 1 },
  descText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionIcon: { fontSize: 16, padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  // Settlement
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '700', color: '#111827', marginVertical: 4 },
  settledState: { alignItems: 'center', paddingVertical: 30 },
  settledEmoji: { fontSize: 40, marginBottom: 8 },
  settledText: { fontSize: 16, fontWeight: '600', color: '#059669' },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txText: { fontSize: 14, color: '#374151', flex: 1 },
  txAmount: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  balancesHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 4,
  },
  balanceName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  balancePaid: { fontSize: 11, color: '#9CA3AF' },
  balanceNet: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  balancePositive: { color: '#059669' },
  balanceNegative: { color: '#DC2626' },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4, marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
