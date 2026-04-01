module.exports = {
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || "http://auth-service:3001",
      prefix: "/api/auth",
    },
    patient: {
      url: process.env.PATIENT_SERVICE_URL || "http://patient-service:3002",
      prefix: "/api/patients",
    },
    doctor: {
      url: process.env.DOCTOR_SERVICE_URL || "http://doctor-service:3003",
      prefix: "/api/doctors",
    },
    appointment: {
      url:
        process.env.APPOINTMENT_SERVICE_URL ||
        "http://appointment-service:3004",
      prefix: "/api/appointments",
    },
    billing: {
      url: process.env.BILLING_SERVICE_URL || "http://billing-service:3005",
      prefix: "/api/billing",
    },
    laboratory: {
      url:
        process.env.LABORATORY_SERVICE_URL || "http://laboratory-service:3006",
      prefix: "/api/laboratory",
    },
    pharmacy: { 
      url: process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:3007',
      prefix: '/api/pharmacy'
    },
    prescription: {  
      url: process.env.PRESCRIPTION_SERVICE_URL || 'http://prescription-service:3008',
      prefix: '/api/prescriptions'
    },
     medicalRecord: {  
      url: process.env.MEDICAL_RECORD_SERVICE_URL || 'http://medical-record-service:3009',
      prefix: '/api/medical-records'
    },
     notification: {  
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3010',
      prefix: '/api/notifications'
    }
  },

  // Configuration CORS
  corsOptions: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },

  // Rate limiting global
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requêtes par IP
  },
};
