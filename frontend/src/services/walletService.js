import api from './api';

const walletService = {
  async getMyWallet() {
    return await api.request('/creator/wallet');
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
};

export default walletService;