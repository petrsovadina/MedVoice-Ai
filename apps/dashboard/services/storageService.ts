
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export const storageService = {
    /**
     * Uploads an audio file to Firebase Storage
     * path: users/{userId}/audio/{sessionId}/{filename}
     */
    uploadAudio: async (userId: string, file: Blob, sessionId: string): Promise<{ downloadURL: string, fullPath: string }> => {
        // Generate a unique filename or use a standard one (e.g. recording.wav)
        // We use the mime type to determine extension if possible, default to .wav or .webm
        const extension = file.type.includes('webm') ? 'webm' : 'wav';
        const path = `users/${userId}/audio/${sessionId}/recording.${extension}`;

        const storageRef = ref(storage, path);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { downloadURL, fullPath: path };
    },

    /**
     * Deletes audio folder/file for a session
     * Note: Firebase client SDK doesn't support deleting folders easily, 
     * so we try to delete likely file variations or rely on path knowledge.
     * For this app, we know the path structure.
     */
    deleteSessionAudio: async (userId: string, sessionId: string) => {
        // We try to delete both extensions just in case
        const extensions = ['wav', 'webm'];
        for (const ext of extensions) {
            try {
                const path = `users/${userId}/audio/${sessionId}/recording.${ext}`;
                const storageRef = ref(storage, path);
                await deleteObject(storageRef);
            } catch (e: any) {
                // Ignore if object not found
                if (e.code !== 'storage/object-not-found') {
                    console.warn('Error deleting audio file', e);
                }
            }
        }
    }
};
