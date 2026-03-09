// Types matching the Finance API contract DTOs

export interface ExpenseDto {
  id: string;
  amountEur: number;
  description: string;
  loggedByUserId: number;
  loggedByUserName: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
}

export interface CreateExpenseRequest {
  amountEur: number;
  description: string;
}

export interface UpdateExpenseRequest {
  amountEur: number;
  description: string;
}

export interface SettlementResponse {
  isSettled: boolean;
  transactions: SettlementTransaction[];
  balances: UserBalance[];
  totalExpenses: number;
  fairShare: number;
}

export interface SettlementTransaction {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amountEur: number;
}

export interface UserBalance {
  userId: number;
  userName: string;
  totalPaidEur: number;
  netBalanceEur: number;
}
