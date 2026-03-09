import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '@/shared/components';
import { useSettlementQuery } from './api';
import type { SettlementTransaction, UserBalance } from './types';

export function SettlementView() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useSettlementQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center text-red-600">
        {t('common.error', 'Failed to load settlement')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="text-center space-y-2">
        <div className="text-sm text-gray-500">{t('finance.settlement.totalExpenses')}</div>
        <div className="text-2xl font-bold text-gray-900">€{data.totalExpenses.toFixed(2)}</div>
        <div className="text-sm text-gray-500">
          {t('finance.settlement.perPerson')}: €{data.fairShare.toFixed(2)}
        </div>
      </Card>

      {/* Settled state */}
      {data.isSettled ? (
        <EmptyState icon="✅" title={t('finance.settlement.allSettled')} />
      ) : (
        <section>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            {t('finance.settlement.title')}
          </h3>
          <div className="space-y-2">
            {data.transactions.map((tx, i) => (
              <TransactionCard key={i} tx={tx} />
            ))}
          </div>
        </section>
      )}

      {/* Balances */}
      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
          Balances
        </h3>
        <div className="space-y-1">
          {data.balances.map((b) => (
            <BalanceRow key={b.userId} balance={b} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TransactionCard({ tx }: { tx: SettlementTransaction }) {
  const { t } = useTranslation();

  return (
    <Card className="flex items-center justify-between">
      <span className="text-gray-700">
        {t('finance.settlement.owes', { from: tx.fromUserName, to: tx.toUserName })}
      </span>
      <span className="font-semibold text-red-600">€{tx.amountEur.toFixed(2)}</span>
    </Card>
  );
}

function BalanceRow({ balance }: { balance: UserBalance }) {
  const isPositive = balance.netBalanceEur > 0;
  const isNegative = balance.netBalanceEur < 0;

  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
      <div>
        <span className="font-medium text-gray-800">{balance.userName}</span>
        <span className="ml-2 text-xs text-gray-400">
          paid €{balance.totalPaidEur.toFixed(2)}
        </span>
      </div>
      <span
        className={`font-semibold text-sm ${
          isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
        }`}
      >
        {isPositive ? '+' : ''}€{balance.netBalanceEur.toFixed(2)}
      </span>
    </div>
  );
}
