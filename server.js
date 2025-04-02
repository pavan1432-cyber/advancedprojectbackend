require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());  // ✅ Ensures JSON is parsed
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Change if needed
    password: 'root', // Change if needed
    database: 'coworking_space'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1); // Exit if database is not connected
    } else {
        console.log('✅ Connected to MySQL Database');
    }
});

// Set up Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// API Route for Form Submission (With File Uploads)
app.post('/submit', upload.fields([
    { name: 'pan_card', maxCount: 1 },
    { name: 'aadhar_card', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), (req, res) => {
    const { name, email, phone, company_name, office_type, seats, start_date, end_date, message } = req.body;

    const pan_card_path = req.files['pan_card'] ? req.files['pan_card'][0].path : null;
    const aadhar_card_path = req.files['aadhar_card'] ? req.files['aadhar_card'][0].path : null;
    const selfie_path = req.files['selfie'] ? req.files['selfie'][0].path : null;

    const sql = `
        INSERT INTO bookings 
        (name, email, phone, company_name, office_type, seats, start_date, end_date, message, pan_card_path, aadhar_card_path, selfie_path) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [name, email, phone, company_name, office_type, seats, start_date, end_date, message, pan_card_path, aadhar_card_path, selfie_path], 
        (err, result) => {
            if (err) {
                console.error('❌ Error inserting data:', err);
                return res.status(500).json({ message: "Database Error" });
            }
            res.status(200).json({ message: "✅ Booking Successful!", bookingId: result.insertId });
        });
});

// API Route for Basic Booking (Name & Phone)
app.post('/bookings', async (req, res) => {
    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: "❌ Name and Phone are required" });
    }

    // Create table if not exists
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS booking (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(30) NOT NULL,
            phone VARCHAR(15) NOT NULL
        );
    `;
    
    const insertBookingQuery = "INSERT INTO booking (name, phone) VALUES (?, ?)";

    try {
        // Create table if it doesn't exist
        await new Promise((resolve, reject) => {
            db.query(createTableQuery, (err, result) => {
                if (err) {
                    reject('❌ Error creating table: ' + err);
                } else {
                    resolve(result);
                }
            });
        });

        // Insert the booking data
        db.query(insertBookingQuery, [name, phone], (err, result) => {
            if (err) {
                console.error('❌ Error inserting data:', err);
                return res.status(500).json({ message: "Database Error" });
            }
            res.status(200).json({ message: "✅ Booking Successful!", bookingId: result.insertId });
        });

    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ message: "Database Error" });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
