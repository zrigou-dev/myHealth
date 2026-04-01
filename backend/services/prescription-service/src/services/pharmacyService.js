const axios = require('axios');

class PharmacyService {
  constructor() {
    this.baseURL = process.env.PHARMACY_SERVICE_URL;
  }

  async checkMedicationAvailability(medicationId, quantity) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/pharmacy/medications/${medicationId}/stock`
      );
      const stock = response.data;
      const totalStock = stock.batches.reduce((sum, b) => sum + b.quantity, 0);
      return totalStock >= quantity;
    } catch (error) {
      console.error('❌ Erreur vérification stock:', error.message);
      return false;
    }
  }

  async getMedicationInfo(medicationId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/pharmacy/medications/${medicationId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération médicament:', error.message);
      return null;
    }
  }
}

module.exports = new PharmacyService();