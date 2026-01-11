# OkPFunctions

Firebase Cloud Functions for handling Email OTP authentication flow.

## 🚀 Features

- **requestOtp**: Generates a 4-digit OTP, stores it in Firestore with a 10-minute expiry, and sends it to the user's email via SendGrid.
- **verifyOtp**: Validates the provided OTP. If valid, it either finds or creates a Firebase user and returns a custom authentication token.

## 🛠️ Prerequisites

- **Node.js**: version 24+
- **Firebase CLI**: Install via `npm install -g firebase-tools`
- **SendGrid Account**: Required for sending emails.
- **Project Region**: `asia-south1`

## ⚙️ Setup

1. **Install Dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Select Project**:
   ```bash
   firebase use okpassignment
   ```

4. **Configure Secrets**:
   This project uses Firebase Secrets for the SendGrid API Key.
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```

## 💻 Local Development

Run the Firebase emulators to test functions locally:
```bash
npm run serve
```
*Note: Ensure you have your Firebase project selected (`firebase use <project-id>`).*

## 🚢 Deployment

Deploy the functions to your Firebase project:
```bash
firebase deploy --only functions
```

## 📁 Project Structure

- `functions/index.js`: Main entry point for Cloud Functions.
- `firebase.json`: Firebase configuration.
- `firestore.rules`: Security rules for Firestore.
- `firestore.indexes.json`: Firestore index definitions.
