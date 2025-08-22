Folder Structure 
services/
└── payment-processing-service/
    ├── node_modules/
    ├── src/
    │   ├── config/
    │   │   ├── db.js
    │   │   └── index.js
    │   ├── controllers/
    │   │   └── (paymentController.js - will be added)
    │   ├── events/
    │   │   ├── kafkaClient.js  (will be added)
    │   │   ├── paymentConsumer.js (will be added)
    │   │   └── paymentProducer.js (will be added)
    │   ├── middlewares/
    │   │   ├── authMiddleware.js (will be added)
    │   │   └── validationMiddleware.js (will be added)
    │   ├── models/
    │   │   └── (Payment.js - will be added)
    │   ├── routes/
    │   │   └── (paymentRoutes.js - will be added)
    │   ├── utils/
    │   │   └── (razorpayUtils.js - will be added)
    │   ├── app.js (will be added)
    │   └── server.js (will be added)
    ├── .env
    ├── .env.example
    └── package.json