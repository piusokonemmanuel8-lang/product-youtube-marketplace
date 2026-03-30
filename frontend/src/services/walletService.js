import api from './api';

const walletService = {
  async getMyWallet(filters = {}) {
    const params = new URLSearchParams();

    if (filters.fromDate) {
      params.set('from_date', filters.fromDate);
    }

    if (filters.toDate) {
      params.set('to_date', filters.toDate);
    }

    const queryString = params.toString();
    const url = queryString
      ? `/creator/wallet?${queryString}`
      : '/creator/wallet';

    return await api.request(url);
  },

  async getWalletTransactionById(transactionId) {
    return await api.request(`/creator/wallet/transactions/${transactionId}`);
  },

  async topUpWallet(amount, paymentReference = '') {
    return await api.request('/creator/wallet/topup', {
      method: 'POST',
      body: {
        amount: Number(amount || 0),
        payment_reference: paymentReference || null,
      },
    });
  },

  async deleteWalletTransaction(transactionId) {
    return await api.request(`/creator/wallet/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },
};

export default walletService;