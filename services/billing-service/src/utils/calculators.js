class BillingCalculator {
  // Calculer le total avec TVA
  static calculateTotal(subtotal, taxRate = 20, discount = 0) {
    const subtotalAfterDiscount = subtotal * (1 - discount / 100);
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + taxAmount;
    
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      subtotalAfterDiscount: parseFloat(subtotalAfterDiscount.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      taxRate: parseFloat(taxRate.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }

  // Calculer les frais de consultation
  static calculateConsultationFee(doctorFee, duration, isUrgent = false) {
    let fee = doctorFee;
    
    // Majoration pour les consultations longues
    if (duration > 30) {
      fee += (doctorFee * 0.5);
    }
    
    // Majoration pour les urgences
    if (isUrgent) {
      fee += (doctorFee * 0.3);
    }
    
    return parseFloat(fee.toFixed(2));
  }

  // Calculer les frais de procédure
  static calculateProcedureFees(procedures) {
    return procedures.map(proc => ({
      ...proc,
      total: parseFloat((proc.quantity * proc.unit_price).toFixed(2))
    }));
  }

  // Calculer les frais de médicaments
  static calculateMedicationFees(medications) {
    return medications.map(med => ({
      ...med,
      total: parseFloat((med.quantity * med.unit_price).toFixed(2))
    }));
  }

  // Calculer les taxes
  static calculateTax(amount, taxRate = 20) {
    return parseFloat((amount * (taxRate / 100)).toFixed(2));
  }

  // Calculer la répartition du paiement
  static calculatePaymentSplit(total, methods) {
    const totalPercentage = methods.reduce((sum, m) => sum + m.percentage, 0);
    
    if (totalPercentage !== 100) {
      throw new Error('Le total des pourcentages doit être 100%');
    }

    return methods.map(method => ({
      ...method,
      amount: parseFloat((total * (method.percentage / 100)).toFixed(2))
    }));
  }

  // Calculer les pénalités de retard
  static calculateLatePenalty(amount, daysLate, penaltyRate = 0.1) {
    const penalty = amount * (penaltyRate / 100) * daysLate;
    return parseFloat(penalty.toFixed(2));
  }

  // Calculer les remises
  static calculateDiscount(amount, discountType, discountValue) {
    if (discountType === 'percentage') {
      return parseFloat((amount * (discountValue / 100)).toFixed(2));
    } else if (discountType === 'fixed') {
      return parseFloat(Math.min(discountValue, amount).toFixed(2));
    }
    return 0;
  }

  // Formater le prix
  static formatPrice(amount, currency = 'EUR') {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  }

  // Calculer les statistiques mensuelles
  static calculateMonthlyStats(invoices) {
    const stats = {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      average: 0
    };

    invoices.forEach(inv => {
      stats.total += inv.total_amount;
      
      switch (inv.status) {
        case 'paid':
          stats.paid += inv.total_amount;
          break;
        case 'sent':
        case 'partially_paid':
          stats.pending += inv.amount_due;
          break;
        case 'overdue':
          stats.overdue += inv.amount_due;
          break;
      }
    });

    stats.average = invoices.length ? stats.total / invoices.length : 0;

    return {
      ...stats,
      total: parseFloat(stats.total.toFixed(2)),
      paid: parseFloat(stats.paid.toFixed(2)),
      pending: parseFloat(stats.pending.toFixed(2)),
      overdue: parseFloat(stats.overdue.toFixed(2)),
      average: parseFloat(stats.average.toFixed(2))
    };
  }
}

module.exports = BillingCalculator;