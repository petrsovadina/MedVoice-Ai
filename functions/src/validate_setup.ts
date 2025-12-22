
import * as admin from 'firebase-admin';


// Initialize admin SDK (will use default credentials if available, or emulator)
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'; // Assuming standard port
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'medvoice-ai-1',
        storageBucket: 'medvoice-ai-1.firebasestorage.app'
    });
}

async function testTranscription() {
    console.log("Starting validation test...");

    // 1. Create a dummy file
    const bucket = admin.storage().bucket();
    const filename = `test_audio_${Date.now()}.txt`;
    const file = bucket.file(filename);

    // We upload text masquerading as audio just to test the file access logic
    // The gemini part might fail or return garbage, but we want to test if it finds the file.
    await file.save("This is a test audio content", {
        metadata: { contentType: 'audio/wav' }
    });
    console.log(`Uploaded test file: ${filename}`);

    // TO TEST FUNCTION: 
    // We can't easily invoke the https callable from a raw script without an auth token easily
    // unless we use 'firebase-functions-test' or 'axios' with a hacked token.
    // BUT we can use the shell.

    console.log("File uploaded. Now please run the following in 'firebase functions:shell':");
    console.log(`transcribeAudio({ storagePath: '${filename}', mimeType: 'audio/wav' })`);
}

testTranscription().catch(console.error);
