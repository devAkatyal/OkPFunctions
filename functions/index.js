const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// Set global options to use asia-south1
setGlobalOptions({region: "asia-south1"});

const sendGridApiKey = defineSecret("SENDGRID_API_KEY");

/**
 * Request OTP
 * Generates a 4-digit code, stores it in Firestore, and sends it via email.
 */
exports.requestOtp = onCall({secrets: [sendGridApiKey]}, async (request) => {
  const email = request.data.email;
  console.log(`[requestOtp] Function called with email: ${email}`);

  if (!email) {
    console.error("[requestOtp] Missing email in request data.");
    throw new HttpsError("invalid-argument",
        "The function must be called with an email.");
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  // 10 minutes
  const expiresAt = admin.firestore.Timestamp.now().toMillis() + 10 * 60 * 1000;

  try {
    console.log(`[requestOtp] Writing OTP for ${email} to Firestore...`);
    // Store OTP in Firestore
    await admin.firestore().collection("otps").doc(email).set({
      code,
      expiresAt,
    });
    console.log(`[requestOtp] OTP written to Firestore for ${email}.`);

    // Send Email via SendGrid
    console.log(`[requestOtp] Prepare to send email via SendGrid...`);
    sgMail.setApiKey(sendGridApiKey.value());
    const msg = {
      to: email,
      from: "ayushkt92@gmail.com",//Update this with your SendGrid email
      subject: "Your Verify Code",
      text: `Your verification code is ${code}`,
      html: `<strong>Your verification code is ${code}</strong>`,
    };
    await sgMail.send(msg);
    console.log(`[requestOtp] Email sent successfully to ${email}.`);

    return {success: true, message: "OTP sent successfully."};
  } catch (error) {
    console.error("[requestOtp] Error in OTP flow:", error);
    throw new HttpsError("internal", "Unable to send OTP.");
  }
});

/**
 * Verify OTP
 * Checks the code against Firestore. If valid, mints a custom auth token.
 */
exports.verifyOtp = onCall(async (request) => {
  const {email, code} = request.data;
  console.log(`[verifyOtp] Attempting verification for ${email}`);

  if (!email || !code) {
    console.error("[verifyOtp] Missing email or code.");
    throw new HttpsError("invalid-argument", "Email and code are required.");
  }

  try {
    const docRef = admin.firestore().collection("otps").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn(`[verifyOtp] No Firestore doc found for ${email}`);
      throw new HttpsError("not-found", "No OTP request found for this email.");
    }

    const data = doc.data();
    const now = Date.now();

    console.log(`[verifyOtp] Comparing codes. Received: ${code},
        Stored: ${data.code}, Now: ${now}, Expires: ${data.expiresAt}`);

    if (now > data.expiresAt) {
      console.warn(`[verifyOtp] OTP expired for ${email}`);
      throw new HttpsError("failed-precondition", "OTP has expired.");
    }

    if (data.code !== code) {
      console.warn(`[verifyOtp] Code mismatch for ${email}`);
      throw new HttpsError("invalid-argument", "Invalid OTP.");
    }

    console.log(`[verifyOtp] OTP valid. Deleting doc and generating token...`);
    // OTP is valid. Clean up.
    await docRef.delete();

    // Check if user exists or create new one
    let uid;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (e) {
      console.log(`[verifyOtp] User ${email} not found. Creating new user...`);
      const newUser = await admin.auth().createUser({
        email: email,
        emailVerified: true,
      });
      uid = newUser.uid;
    }

    const customToken = await admin.auth().createCustomToken(uid);
    console.log(`[verifyOtp] Token created successfully for ${email}`);

    return {token: customToken};
  } catch (error) {
    console.error("[verifyOtp] Error in verification flow:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to verify OTP.");
  }
});
