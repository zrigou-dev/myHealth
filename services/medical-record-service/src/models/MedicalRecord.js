const { mongo } = require("../config/database");

class MedicalRecord {
  // Helper pour obtenir la DB avec vérification
  static getDb() {
    const db = mongo.getDb();
    if (!db) {
      throw new Error("MongoDB connection not yet established");
    }
    return db;
  }

  // Récupérer le dossier complet d'un patient (agrégation)
  static async getFullRecord(patientId) {
    try {
      const db = this.getDb();

      // Récupérer les notes de consultation
      const consultationNotes = await db
        .collection("consultation_notes")
        .find({ patient_id: parseInt(patientId) })
        .sort({ date: -1 })
        .toArray();

      // Récupérer les documents médicaux
      const documents = await db
        .collection("medical_documents")
        .find({ patient_id: parseInt(patientId) })
        .sort({ uploaded_at: -1 })
        .toArray();

      return {
        consultation_notes: consultationNotes,
        documents: documents,
      };
    } catch (error) {
      console.error("❌ Erreur récupération dossier MongoDB:", error);
      return { consultation_notes: [], documents: [] };
    }
  }

  // Ajouter une note de consultation
  static async addConsultationNote(noteData) {
    try {
      const db = this.getDb();

      const note = {
        ...noteData,
        patient_id: parseInt(noteData.patient_id),
        doctor_id: parseInt(noteData.doctor_id),
        date: new Date(),
        created_at: new Date(),
      };

      const result = await db.collection("consultation_notes").insertOne(note);
      return { ...note, _id: result.insertedId };
    } catch (error) {
      console.error("❌ Erreur ajout note MongoDB:", error);
      throw error;
    }
  }

  // Récupérer les notes de consultation
  static async getConsultationNotes(patientId, limit = 20) {
    try {
      const db = this.getDb();

      return await db
        .collection("consultation_notes")
        .find({ patient_id: parseInt(patientId) })
        .sort({ date: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("❌ Erreur récupération notes:", error);
      return [];
    }
  }

  // Ajouter un document médical
  static async addDocument(documentData) {
    try {
      const db = this.getDb();

      const document = {
        ...documentData,
        patient_id: parseInt(documentData.patient_id),
        uploaded_at: new Date(),
      };

      const result = await db
        .collection("medical_documents")
        .insertOne(document);
      return { ...document, _id: result.insertedId };
    } catch (error) {
      console.error("❌ Erreur ajout document:", error);
      throw error;
    }
  }

  // Récupérer les documents médicaux
  static async getDocuments(patientId, type = null) {
    try {
      const db = this.getDb();

      const query = { patient_id: parseInt(patientId) };
      if (type) {
        query.document_type = type;
      }

      return await db
        .collection("medical_documents")
        .find(query)
        .sort({ uploaded_at: -1 })
        .toArray();
    } catch (error) {
      console.error("❌ Erreur récupération documents:", error);
      return [];
    }
  }

  // Supprimer un document
  static async deleteDocument(documentId) {
    try {
      const db = this.getDb();
      const { ObjectId } = require("mongodb");

      const result = await db
        .collection("medical_documents")
        .deleteOne({ _id: new ObjectId(documentId) });

      return result.deletedCount > 0;
    } catch (error) {
      console.error("❌ Erreur suppression document:", error);
      throw error;
    }
  }
}

module.exports = MedicalRecord;
