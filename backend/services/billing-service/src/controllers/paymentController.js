const db = require("../config/database");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const { validationResult } = require("express-validator");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class PaymentController {
  // Ajouter un paiement
  async addPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { amount, payment_method, notes } = req.body;

      // Vérifier que la facture existe
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }

      // Vérifier les permissions
      if (invoice.patient_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Non autorisé" });
      }

      // Vérifier que le montant ne dépasse pas le dû
      if (amount > invoice.amount_due) {
        return res.status(400).json({
          error: "Montant supérieur au montant dû",
          amount_due: invoice.amount_due,
        });
      }

      // Ajouter le paiement
      const result = await Invoice.addPayment(id, {
        amount,
        payment_method,
        notes,
        received_by: req.user.id,
        transaction_id: `manual_${Date.now()}`,
      });

      res.status(201).json({
        message: "Paiement enregistré avec succès",
        payment: result.payment,
        invoice: result.invoice,
      });
    } catch (error) {
      console.error("❌ Erreur ajout paiement:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Paiement par carte (Stripe)
  async createStripePayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_method_id } = req.body;

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }

      // Créer l'intention de paiement Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.amount_due * 100), // En centimes
        currency: process.env.STRIPE_CURRENCY || "eur",
        payment_method: payment_method_id,
        confirmation_method: "manual",
        confirm: true,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          patient_id: invoice.patient_id,
        },
      });

      // Enregistrer le paiement dans notre DB
      const result = await Invoice.addPayment(id, {
        amount: invoice.amount_due,
        payment_method: "card",
        transaction_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        received_by: req.user.id,
      });

      res.json({
        message: "Paiement réussi",
        payment: result.payment,
        invoice: result.invoice,
        stripe_payment_intent: paymentIntent,
      });
    } catch (error) {
      console.error("❌ Erreur paiement Stripe:", error);
      res.status(500).json({
        error: "Erreur de paiement",
        message: error.message,
      });
    }
  }

  // Webhook Stripe (pour les notifications)
  async stripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("❌ Erreur webhook Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Traiter l'événement
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        await this.handleSuccessfulPayment(paymentIntent);
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        await this.handleFailedPayment(failedPayment);
        break;
      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    res.json({ received: true });
  }

  // Gérer un paiement réussi
  async handleSuccessfulPayment(paymentIntent) {
    const { invoice_id } = paymentIntent.metadata;

    await Invoice.updateStatus(invoice_id, "paid", {
      stripe_payment_intent: paymentIntent.id,
      paid_at: new Date(),
    });
  }

  // Gérer un paiement échoué
  async handleFailedPayment(paymentIntent) {
    console.log("Paiement échoué:", paymentIntent.id);
  }

  // Remboursement
  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ error: "Paiement non trouvé" });
      }

      let refundResult;
      if (payment.stripe_payment_intent_id) {
        // Remboursement Stripe
        refundResult = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: amount ? Math.round(amount * 100) : undefined,
        });
      }

      // Enregistrer le remboursement dans notre DB
      const refundQuery = `
        INSERT INTO refunds (
          payment_id, invoice_id, amount, reason,
          stripe_refund_id, status, processed_at, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'completed', CURRENT_TIMESTAMP, $6)
        RETURNING *
      `;

      const dbRefundResult = await db.query(refundQuery, [
        payment.id,
        payment.invoice_id,
        amount || payment.amount,
        reason,
        refundResult?.id,
        req.user.id,
      ]);

      // Mettre à jour la facture
      await db.query(
        "UPDATE invoices SET amount_paid = amount_paid - $2 WHERE id = $1",
        [payment.invoice_id, amount || payment.amount],
      );

      res.json({
        message: "Remboursement effectué",
        refund: dbRefundResult.rows[0],
      });
    } catch (error) {
      console.error("❌ Erreur remboursement:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les paiements d'une facture
  async getPayments(req, res) {
    try {
      const { id } = req.params;
      const payments = await Payment.getByInvoice(id);
      res.json(payments);
    } catch (error) {
      console.error("❌ Erreur récupération paiements:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer mes paiements (patient)
  async getMyPayments(req, res) {
    try {
      const payments = await Payment.getByPatient(req.user.id);
      res.json({
        count: payments.length,
        payments,
      });
    } catch (error) {
      console.error("❌ Erreur récupération paiements:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new PaymentController();
